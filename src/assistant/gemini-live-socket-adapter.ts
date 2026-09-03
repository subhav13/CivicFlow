import { GEMINI_LIVE_MODEL } from './gemini-live-model';
import { classifyToolIntent } from './confirmation-policy';
import { mapRegisteredTools } from './gemini-function-mapper';
import type {
  EphemeralSessionCredential,
  LiveCloseReasonCategory,
  LiveSocket,
  LiveSocketEventMap,
} from './gemini-live-client';
import type { CurrentToolSurface } from './types';
export interface LiveSocketAdapterOptions {
  surface: CurrentToolSurface;
  waitForRegistry?: () => Promise<void>;
  instructions?: string;
  createSocket?: (
    url: string,
    credential: EphemeralSessionCredential,
  ) => Promise<LiveSocket> | LiveSocket;
}

export interface LiveSocketAdapter {
  connectSocket(credential: EphemeralSessionCredential): Promise<LiveSocket>;
}

const LIVE_TOOL_INPUT_POLICY =
  'Tool-use rules: treat each declared tool schema as the source of truth. Use only the exact schema field names and types, include every required field, and never invent fields. Before invoking any tool, collect every required input explicitly from the user. Ask for missing required inputs one at a time in a natural order. add_income_source asks for missing fields one at a time in this order: member, employer or source, amount in dollars, frequency (weekly, every two weeks, monthly, annually). retain prior explicit answers when a user provides a correction and handle structured revision responses by rebuilding the complete proposal. Do not guess, infer, default, or fabricate values. For conditional requirements, ask for the field when its condition applies. Do not invoke a tool until all required inputs are explicit and valid. The navigate_to_section tool is navigation-only: invoke it directly without confirmation, draft cards, or draft-review narration. Other read-only tools also execute immediately without confirmation or draft-review narration. For mutation tools, after all required schema fields are explicit and valid, first speak one concise complete review of every field and value in your normal Live voice and tell the user the draft is ready for review, then immediately invoke the tool as a proposal without asking for spoken confirmation or waiting for a spoken reply. The portal will pause the proposal and obtain confirmation through its UI before execution. Never claim success before receiving a tool response with ok:true. After a successful tool response, summarize the change and ask "What would you like to do next?". If a tool returns a failure, do not claim success; read its structured error and ask for the missing or corrected field. If a tool response has error.code INVALID_ARGUMENTS, ask only for the first field listed in missingFields, or the first field listed in invalidFields when no field is missing; retain already supplied conversational values and retry with the complete argument object.';

export const DEFAULT_LIVE_ASSISTANT_INSTRUCTIONS = `You are the companion for CivicFlow: A WebMPC Public Benefit Portal, an accessible assistant for civic application forms. You can answer questions, read application sections, and help users fill form fields using available tools. Never attempt to submit or attest the application. ${LIVE_TOOL_INPUT_POLICY}`;

function composeLiveInstructions(customInstructions?: string): string {
  if (!customInstructions || customInstructions.trim() === '') {
    return DEFAULT_LIVE_ASSISTANT_INSTRUCTIONS;
  }
  return `${customInstructions.trim()} ${LIVE_TOOL_INPUT_POLICY}`;
}

const GEMINI_SCHEMA_KEYS = new Set([
  'type',
  'format',
  'title',
  'description',
  'nullable',
  'enum',
  'maxItems',
  'minItems',
  'properties',
  'required',
  'minProperties',
  'maxProperties',
  'minLength',
  'maxLength',
  'pattern',
  'example',
  'anyOf',
  'propertyOrdering',
  'default',
  'items',
  'minimum',
  'maximum',
  'additionalProperties',
]);

const MAX_SCHEMA_METADATA_FIELDS = 32;
const MAX_SCHEMA_METADATA_FIELD_LENGTH = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function decodeWebSocketMessage(data: unknown): Promise<string> {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return '';
}

function normalizeGeminiJsonSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const rawAnyOf = schema.anyOf;
  const literalBranches =
    Array.isArray(rawAnyOf) &&
    rawAnyOf.length > 0 &&
    rawAnyOf.every(
      (branch) =>
        isRecord(branch) &&
        Object.prototype.hasOwnProperty.call(branch, 'const'),
    )
      ? rawAnyOf
      : undefined;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (
      key === 'const' ||
      key === 'uniqueItems' ||
      !GEMINI_SCHEMA_KEYS.has(key)
    ) {
      continue;
    }
    if (key === 'properties' && isRecord(value)) {
      normalized.properties = Object.fromEntries(
        Object.entries(value).map(([propertyName, propertySchema]) => [
          propertyName,
          isRecord(propertySchema)
            ? normalizeGeminiJsonSchema(propertySchema)
            : propertySchema,
        ]),
      );
    } else if (key === 'items' && isRecord(value)) {
      normalized.items = normalizeGeminiJsonSchema(value);
    } else if (key === 'anyOf' && Array.isArray(value)) {
      normalized.anyOf = value.map((branch) =>
        isRecord(branch) ? normalizeGeminiJsonSchema(branch) : branch,
      );
    } else {
      normalized[key] = value;
    }
  }

  if (literalBranches) {
    delete normalized.anyOf;
    normalized.enum = literalBranches.map((branch) => branch.const);
    const literalTypes = literalBranches
      .map((branch) => branch.type)
      .filter((type): type is string => typeof type === 'string');
    if (
      literalTypes.length === literalBranches.length &&
      new Set(literalTypes).size === 1
    ) {
      normalized.type = literalTypes[0];
    }
  } else if (Object.prototype.hasOwnProperty.call(schema, 'const')) {
    normalized.enum = [schema.const];
    if (typeof schema.type === 'string') {
      normalized.type = schema.type;
    }
  }

  const properties = isRecord(normalized.properties)
    ? Object.keys(normalized.properties)
    : [];
  if (
    properties.length > 0 &&
    properties.length <= MAX_SCHEMA_METADATA_FIELDS
  ) {
    const existingOrdering = Array.isArray(schema.propertyOrdering)
      ? schema.propertyOrdering.filter(
          (field): field is string =>
            typeof field === 'string' && properties.includes(field),
        )
      : [];
    normalized.propertyOrdering = [
      ...existingOrdering,
      ...properties.filter((field) => !existingOrdering.includes(field)),
    ];
  }

  return normalized;
}

function boundedSchemaFieldNames(values: Iterable<unknown>): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || !value) continue;
    const name = value.slice(0, MAX_SCHEMA_METADATA_FIELD_LENGTH);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= MAX_SCHEMA_METADATA_FIELDS) break;
  }
  return names;
}

function addSchemaGroundingMetadata(
  description: string,
  schema: Record<string, unknown>,
): string {
  if (!isRecord(schema.properties)) return description;

  const allowedFields = boundedSchemaFieldNames(Object.keys(schema.properties));
  if (allowedFields.length === 0) return description;

  const requiredFields = boundedSchemaFieldNames(
    Array.isArray(schema.required) ? schema.required : [],
  );
  return `${description.trim()} Schema grounding: Allowed fields: ${allowedFields.join(', ')}. Required fields: ${requiredFields.length > 0 ? requiredFields.join(', ') : 'none'}.`;
}

export function classifyLiveCloseReason(
  reason: string,
): LiveCloseReasonCategory | undefined {
  const normalized = reason.trim().toLowerCase();
  if (!normalized) return undefined;
  if (
    normalized.includes('quota') ||
    normalized.includes('resource_exhausted')
  ) {
    return 'quota';
  }
  if (
    normalized.includes('schema') ||
    normalized.includes('function') ||
    normalized.includes('parameter') ||
    normalized.includes('invalid json') ||
    normalized.includes('unknown field') ||
    normalized.includes('invalid argument')
  ) {
    return 'setup_schema';
  }
  if (
    normalized.includes('modality') ||
    normalized.includes('response modalities') ||
    normalized.includes('unsupported')
  ) {
    return 'unsupported_setup';
  }
  if (
    normalized.includes('auth') ||
    normalized.includes('caller') ||
    normalized.includes('token') ||
    normalized.includes('permission') ||
    normalized.includes('identity')
  ) {
    return 'auth';
  }
  if (normalized.includes('policy') || normalized.includes('safety')) {
    return 'policy';
  }
  return 'unknown';
}

class BrowserWebSocketWrapper implements LiveSocket {
  private readonly ws: WebSocket;
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();
  private readonly queuedMessages: string[] = [];
  private messageWork: Promise<void> = Promise.resolve();

  constructor(ws: WebSocket) {
    this.ws = ws;

    this.ws.onmessage = (event: MessageEvent) => {
      this.messageWork = this.messageWork
        .then(async () => {
          let data = '';
          try {
            data = await decodeWebSocketMessage(event.data);
          } catch {
            // Treat an unreadable frame as a bounded protocol error downstream.
          }
          this.dispatchMessage(data);
        })
        .catch(() => {
          // Keep later provider frames deliverable after a listener failure.
        });
    };

    this.ws.onerror = (error: Event) => {
      const set = this.listeners.get('error');
      if (set) {
        for (const listener of set) {
          listener({ error });
        }
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      const set = this.listeners.get('close');
      if (set) {
        const reasonCategory = classifyLiveCloseReason(event.reason);
        for (const listener of set) {
          listener({
            code: event.code,
            wasClean: event.wasClean,
            ...(reasonCategory ? { reasonCategory } : {}),
          });
        }
      }
    };
  }

  send(message: string): boolean {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    }
    return false;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // Safe teardown
    }
  }

  addEventListener<K extends keyof LiveSocketEventMap>(
    type: K,
    listener: (event: LiveSocketEventMap[K]) => void,
  ): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as (event: unknown) => void);
    if (type === 'message') {
      this.flushQueuedMessages();
    }
  }

  removeEventListener<K extends keyof LiveSocketEventMap>(
    type: K,
    listener: (event: LiveSocketEventMap[K]) => void,
  ): void {
    this.listeners.get(type)?.delete(listener as (event: unknown) => void);
  }

  private dispatchMessage(data: string): void {
    const set = this.listeners.get('message');
    if (!set || set.size === 0) {
      this.queuedMessages.push(data);
      return;
    }
    for (const listener of set) {
      listener({ data });
    }
  }

  private flushQueuedMessages(): void {
    const queued = this.queuedMessages.splice(0);
    for (const data of queued) {
      this.dispatchMessage(data);
    }
  }
}

export function createLiveSocketAdapter(
  options: LiveSocketAdapterOptions,
): LiveSocketAdapter {
  const instructions = composeLiveInstructions(options.instructions);

  return {
    async connectSocket(
      credential: EphemeralSessionCredential,
    ): Promise<LiveSocket> {
      if (options.waitForRegistry) {
        await options.waitForRegistry();
      }

      // Fresh snapshot at connect time - never use stale cached tools
      const rawTools = await options.surface.snapshot();
      const allowedTools = rawTools.filter(
        (tool) => classifyToolIntent(tool).kind !== 'deny',
      );
      const mappedFunctions = mapRegisteredTools(allowedTools);

      const model = GEMINI_LIVE_MODEL.startsWith('models/')
        ? GEMINI_LIVE_MODEL
        : `models/${GEMINI_LIVE_MODEL}`;

      const setupPayload = {
        setup: {
          model,
          generationConfig: {
            responseModalities: ['AUDIO'],
          },
          systemInstruction: {
            parts: [{ text: instructions }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools:
            mappedFunctions.length > 0
              ? [
                  {
                    functionDeclarations: mappedFunctions.map((fn) => {
                      const parametersJsonSchema = normalizeGeminiJsonSchema(
                        fn.parameters,
                      );
                      return {
                        name: fn.name,
                        description: addSchemaGroundingMetadata(
                          fn.description,
                          fn.parameters,
                        ),
                        parametersJsonSchema,
                      };
                    }),
                  },
                ]
              : [],
        },
      };

      const socketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(
        credential.accessToken,
      )}`;

      let liveSocket: LiveSocket;

      if (options.createSocket) {
        liveSocket = await options.createSocket(socketUrl, credential);
      } else {
        const ws = new WebSocket(socketUrl);
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => {
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            reject(new Error('WebSocket connection failed'));
          };
          ws.addEventListener('open', onOpen);
          ws.addEventListener('error', onError);
        });

        liveSocket = new BrowserWebSocketWrapper(ws);
      }

      // Send setup message as the first frame
      liveSocket.send(JSON.stringify(setupPayload));

      return liveSocket;
    },
  };
}
