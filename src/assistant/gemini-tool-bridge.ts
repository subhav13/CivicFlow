import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';

import { classifyToolIntent } from './confirmation-policy';
import { mapRegisteredTools } from './gemini-function-mapper';
import {
  createConfirmationDraft,
  type ConfirmationDraftFactory,
} from './tool-confirmation-view-model';
import type {
  CurrentToolSurface,
  ProviderFunctionTool,
  ToolBridgeResponse,
  ToolCall,
} from './types';
import type { RegisteredToolRef } from '../webmcp/model-context-port';

const ajv = new Ajv({ strict: true, allErrors: true });
const MAX_SAFE_FIELD_NAMES = 32;
const MAX_SAFE_FIELD_NAME_LENGTH = 80;
const MAX_SAFE_MESSAGE_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedFieldName(value: string): string {
  return value.slice(0, MAX_SAFE_FIELD_NAME_LENGTH);
}

function boundedFieldNames(values: Iterable<string>): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const name = boundedFieldName(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= MAX_SAFE_FIELD_NAMES) break;
  }
  return names;
}

function topLevelFieldName(instancePath: string): string {
  const firstSegment = instancePath.split('/')[1];
  if (!firstSegment) return 'input';
  return boundedFieldName(
    firstSegment.replaceAll('~1', '/').replaceAll('~0', '~'),
  );
}

function requiredFields(schema: Record<string, unknown>): string[] {
  return Array.isArray(schema.required)
    ? boundedFieldNames(
        schema.required.filter(
          (field): field is string => typeof field === 'string',
        ),
      )
    : [];
}

function validationFieldNames(
  validator: ValidateFunction,
  input: unknown,
  schema: Record<string, unknown>,
): {
  providedFields: string[];
  missingFields: string[];
  invalidFields: string[];
} {
  const providedFields = isRecord(input)
    ? boundedFieldNames(Object.keys(input))
    : [];
  const missing = new Set<string>();
  const invalid = new Set<string>();

  for (const error of validator.errors ?? []) {
    const field = fieldNameFromAjvError(error);
    if (error.keyword === 'required') {
      const missingProperty = error.params?.missingProperty;
      if (typeof missingProperty === 'string') missing.add(missingProperty);
      continue;
    }
    invalid.add(field);
  }

  const missingFields = requiredFields(schema).filter(
    (field) => !providedFields.includes(field) && missing.has(field),
  );
  const invalidFields = boundedFieldNames(invalid);

  return { providedFields, missingFields, invalidFields };
}

function fieldNameFromAjvError(error: ErrorObject): string {
  if (
    error.keyword === 'additionalProperties' &&
    typeof error.params?.additionalProperty === 'string'
  ) {
    return boundedFieldName(error.params.additionalProperty);
  }
  return topLevelFieldName(error.instancePath);
}

function makeInvalidArgumentsResponse(
  call: ToolCall,
  metadata: Omit<ReturnType<typeof validationFieldNames>, 'providedFields'> & {
    providedFields: string[];
  },
): Extract<ToolBridgeResponse, { kind: 'invalid_arguments' }> {
  const firstField = metadata.missingFields[0] ?? metadata.invalidFields[0];
  const boundedToolName = call.name.slice(0, MAX_SAFE_FIELD_NAME_LENGTH);
  const message = firstField
    ? `Tool "${boundedToolName}" needs a valid value for "${firstField}".`
    : `Tool "${boundedToolName}" arguments are incomplete or invalid.`;
  return {
    kind: 'invalid_arguments',
    code: 'INVALID_ARGUMENTS',
    callId: call.callId,
    toolName: call.name,
    message: message.slice(0, MAX_SAFE_MESSAGE_LENGTH),
    providedFields: metadata.providedFields,
    missingFields: metadata.missingFields,
    invalidFields: metadata.invalidFields,
  };
}

function validateArguments(
  call: ToolCall,
  parsedArguments: unknown,
  tool: RegisteredToolRef,
):
  | Extract<
      ToolBridgeResponse,
      { kind: 'invalid_arguments' } | { kind: 'error' }
    >
  | undefined {
  let validator: ValidateFunction;
  try {
    validator = ajv.compile(tool.inputSchema);
  } catch {
    return {
      kind: 'error',
      callId: call.callId,
      message: 'Tool schema could not be compiled.',
    };
  }

  if (validator(parsedArguments)) return undefined;
  return makeInvalidArgumentsResponse(
    call,
    validationFieldNames(validator, parsedArguments, tool.inputSchema),
  );
}

export interface GeminiToolBridge {
  listFunctions(signal?: AbortSignal): Promise<ProviderFunctionTool[]>;
  executeToolCall(
    call: ToolCall,
    options?: { confirmed?: boolean; signal?: AbortSignal },
  ): Promise<ToolBridgeResponse>;
}

export interface GeminiToolBridgeOptions {
  confirmationDraftFactory?: ConfirmationDraftFactory;
}

export function createGeminiToolBridge(
  surface: CurrentToolSurface,
  options: GeminiToolBridgeOptions = {},
): GeminiToolBridge {
  const confirmationDraftFactory =
    options.confirmationDraftFactory ?? createConfirmationDraft;

  return {
    async listFunctions(signal?: AbortSignal): Promise<ProviderFunctionTool[]> {
      const tools = await surface.snapshot(signal);
      const allowedTools = tools.filter(
        (tool) => classifyToolIntent(tool).kind !== 'deny',
      );
      return mapRegisteredTools(allowedTools);
    },

    async executeToolCall(
      call: ToolCall,
      options?: { confirmed?: boolean; signal?: AbortSignal },
    ): Promise<ToolBridgeResponse> {
      let parsedArguments: unknown;
      try {
        parsedArguments = JSON.parse(call.argumentsJson);
      } catch {
        return makeInvalidArgumentsResponse(call, {
          providedFields: [],
          missingFields: [],
          invalidFields: ['input'],
        });
      }

      let currentTools;
      try {
        currentTools = await surface.snapshot(options?.signal);
      } catch {
        return {
          kind: 'error',
          callId: call.callId,
          message: 'Failed to inspect current tool surface.',
        };
      }
      const tool = currentTools.find((item) => item.name === call.name);
      if (!tool) {
        return {
          kind: 'error',
          callId: call.callId,
          message: `Tool "${call.name}" is not currently registered or available.`,
        };
      }

      const invalidArguments = validateArguments(call, parsedArguments, tool);
      if (invalidArguments) return invalidArguments;

      const decision = classifyToolIntent(tool);
      if (decision.kind === 'deny') {
        return {
          kind: 'error',
          callId: call.callId,
          message: decision.message,
        };
      }

      if (decision.kind === 'confirm' && !options?.confirmed) {
        const draft = confirmationDraftFactory(call.name, parsedArguments);
        if (!draft) {
          return {
            kind: 'error',
            callId: call.callId,
            message: 'This action cannot be confirmed safely.',
          };
        }
        return {
          kind: 'confirmation_required',
          callId: call.callId,
          toolName: call.name,
          message: decision.message,
          draft,
        };
      }

      try {
        const result = await surface.execute(
          call.name,
          call.argumentsJson,
          options?.signal,
        );
        return {
          kind: 'result',
          callId: call.callId,
          result,
        };
      } catch {
        return {
          kind: 'error',
          callId: call.callId,
          message: `Tool execution failed for "${call.name}".`,
        };
      }
    },
  };
}
