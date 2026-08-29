import type { ToolCall } from './types';

export interface EphemeralSessionCredential {
  accessToken: string;
  expiresAt: string;
}

export type LiveCloseReasonCategory =
  | 'auth'
  | 'quota'
  | 'setup_schema'
  | 'unsupported_setup'
  | 'policy'
  | 'unknown';

export interface LiveSocketEventMap {
  message: { data: string };
  close: {
    code?: number;
    wasClean?: boolean;
    reasonCategory?: LiveCloseReasonCategory;
  };
  error: { error?: unknown };
}

export interface LiveSocket {
  send(message: string): void;
  close(): void;
  addEventListener<K extends keyof LiveSocketEventMap>(
    type: K,
    listener: (event: LiveSocketEventMap[K]) => void,
  ): void;
  removeEventListener<K extends keyof LiveSocketEventMap>(
    type: K,
    listener: (event: LiveSocketEventMap[K]) => void,
  ): void;
}

export interface GeminiLiveClientDependencies {
  issueEphemeralSession(
    signal?: AbortSignal,
  ): Promise<EphemeralSessionCredential>;
  connectSocket(credential: EphemeralSessionCredential): Promise<LiveSocket>;
}

export type LiveConnectionDiagnostic = {
  phase: 'setup_rejected' | 'remote_close_after_setup';
  closeCode?: number;
  wasClean?: boolean;
  closeReasonCategory?: LiveCloseReasonCategory;
};

export type GeminiLiveEvent =
  | { type: 'text'; text: string }
  | { type: 'audio'; data: string; mimeType: string }
  | {
      type: 'transcript';
      speaker: 'user' | 'model';
      text: string;
      final: boolean;
    }
  | { type: 'function_call'; calls: ToolCall[] }
  | { type: 'turn_interrupted' }
  | { type: 'turn_complete'; interrupted?: boolean }
  | {
      type: 'error';
      kind: 'quota' | 'network' | 'protocol' | 'unknown';
      message: string;
      diagnostic?: LiveConnectionDiagnostic;
    };

export interface LiveToolResponse {
  callId: string;
  name: string;
  response: Record<string, unknown>;
}

export interface GeminiLiveClient {
  connect(signal?: AbortSignal): Promise<void>;
  disconnect(): void;
  sendText(text: string): void;
  sendAudio(data: string, mimeType?: string): void;
  sendToolResponse(response: LiveToolResponse): boolean;
  subscribe(listener: (event: GeminiLiveEvent) => void): () => void;
  isConnected(): boolean;
}

interface RawModelPart {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface RawServerContent {
  modelTurn?: {
    parts?: RawModelPart[];
  };
  inputTranscription?: {
    text?: string;
    finished?: boolean;
  };
  interimInputTranscription?: {
    text?: string;
  };
  outputTranscription?: {
    text?: string;
    finished?: boolean;
  };
  generationComplete?: boolean;
  interrupted?: boolean;
  turnComplete?: boolean;
}

interface RawFunctionCall {
  id?: string;
  name?: string;
  args?: unknown;
}

interface RawToolCall {
  functionCalls?: RawFunctionCall[];
}

interface RawError {
  code?: number;
  status?: string;
  message?: string;
}

interface RawGeminiLiveMessage {
  serverContent?: RawServerContent;
  toolCall?: RawToolCall;
  error?: RawError;
}

export class GeminiLiveConnectionError extends Error {
  constructor(
    message: string,
    readonly kind: Extract<GeminiLiveEvent, { type: 'error' }>['kind'],
    readonly diagnostic?: LiveConnectionDiagnostic,
  ) {
    super(message);
    this.name = 'GeminiLiveConnectionError';
  }
}

function isSetupCompleteMessage(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return (
      Boolean(data) &&
      Object.prototype.hasOwnProperty.call(data, 'setupComplete')
    );
  } catch {
    return false;
  }
}

export function parseGeminiLiveMessage(raw: string): GeminiLiveEvent[] {
  const data = JSON.parse(raw) as RawGeminiLiveMessage;
  const events: GeminiLiveEvent[] = [];

  if (data?.serverContent) {
    const sc = data.serverContent;
    if (Array.isArray(sc.modelTurn?.parts)) {
      for (const part of sc.modelTurn.parts) {
        if (typeof part.text === 'string') {
          events.push({ type: 'text', text: part.text });
        }
        if (typeof part.inlineData?.data === 'string') {
          events.push({
            type: 'audio',
            mimeType: part.inlineData.mimeType ?? 'audio/pcm;rate=24000',
            data: part.inlineData.data,
          });
        }
      }
    }
    if (typeof sc.interimInputTranscription?.text === 'string') {
      events.push({
        type: 'transcript',
        speaker: 'user',
        text: sc.interimInputTranscription.text,
        final: false,
      });
    }
    if (typeof sc.inputTranscription?.text === 'string') {
      events.push({
        type: 'transcript',
        speaker: 'user',
        text: sc.inputTranscription.text,
        // Current Live API frames inputTranscription as authoritative. Keep
        // accepting the older explicit finished flag during the transition.
        final: sc.inputTranscription.finished !== false,
      });
    }
    if (typeof sc.outputTranscription?.text === 'string') {
      events.push({
        type: 'transcript',
        speaker: 'model',
        text: sc.outputTranscription.text,
        final: Boolean(sc.outputTranscription.finished),
      });
    }
    if (sc.interrupted) events.push({ type: 'turn_interrupted' });
    if (sc.turnComplete) events.push({ type: 'turn_complete' });
  }

  if (Array.isArray(data?.toolCall?.functionCalls)) {
    const rawCalls = data.toolCall.functionCalls;
    const hasInvalid = rawCalls.some(
      (fc) =>
        !fc ||
        typeof fc.id !== 'string' ||
        fc.id.trim() === '' ||
        typeof fc.name !== 'string' ||
        fc.name.trim() === '',
    );
    if (hasInvalid) {
      events.push({
        type: 'error',
        kind: 'protocol',
        message: 'Received an invalid assistant event.',
      });
    } else {
      const calls: ToolCall[] = rawCalls.map((fc) => ({
        callId: String(fc.id),
        name: String(fc.name),
        argumentsJson:
          typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args ?? {}),
      }));
      if (calls.length > 0) {
        events.push({ type: 'function_call', calls });
      }
    }
  }

  if (data?.error) {
    const err = data.error;
    const errMessage = String(err.message ?? '');
    const isQuota =
      err.code === 429 ||
      err.status === 'RESOURCE_EXHAUSTED' ||
      errMessage.toLowerCase().includes('quota');
    events.push({
      type: 'error',
      kind: isQuota ? 'quota' : 'protocol',
      message: isQuota
        ? 'Assistant session is temporarily unavailable.'
        : 'Received an invalid assistant event.',
    });
  }

  return events;
}

export function createGeminiLiveClient(
  dependencies: GeminiLiveClientDependencies,
): GeminiLiveClient {
  let socket: LiveSocket | undefined;
  let connected = false;
  let setupAccepted = false;
  let connectGeneration = 0;
  let pendingSetup:
    | {
        generation: number;
        resolve: () => void;
        reject: (reason?: unknown) => void;
      }
    | undefined;
  const listeners = new Set<(event: GeminiLiveEvent) => void>();

  let onMessage: ((event: LiveSocketEventMap['message']) => void) | undefined;
  let onError: ((event: LiveSocketEventMap['error']) => void) | undefined;
  let onClose: ((event: LiveSocketEventMap['close']) => void) | undefined;

  const emit = (event: GeminiLiveEvent) => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const detachSocketListeners = (target?: LiveSocket) => {
    const s = target ?? socket;
    if (s) {
      if (onMessage) s.removeEventListener('message', onMessage);
      if (onError) s.removeEventListener('error', onError);
      if (onClose) s.removeEventListener('close', onClose);
    }
    if (!target || target === socket) {
      onMessage = undefined;
      onError = undefined;
      onClose = undefined;
    }
  };

  const terminateSocket = (target?: LiveSocket) => {
    connected = false;
    const s = target ?? socket;
    if (s) {
      detachSocketListeners(s);
      s.close();
    }
    if (!target || target === socket) {
      socket = undefined;
      setupAccepted = false;
    }
  };

  const rejectPendingSetup = (error: GeminiLiveConnectionError) => {
    const pending = pendingSetup;
    if (!pending) return;
    pendingSetup = undefined;
    pending.reject(error);
  };

  return {
    async connect(signal?: AbortSignal): Promise<void> {
      const generation = ++connectGeneration;
      rejectPendingSetup(
        new GeminiLiveConnectionError(
          'Assistant connection was cancelled.',
          'network',
        ),
      );
      if (socket) {
        terminateSocket(socket);
      }

      let credential: EphemeralSessionCredential;
      try {
        credential = await dependencies.issueEphemeralSession(signal);
      } catch (err) {
        if (generation === connectGeneration) {
          connected = false;
        }
        throw err;
      }

      let activeSocket: LiveSocket;
      try {
        activeSocket = await dependencies.connectSocket(credential);
      } catch (err) {
        if (generation === connectGeneration) {
          connected = false;
        }
        throw err;
      }

      if (generation !== connectGeneration) {
        activeSocket.close();
        return;
      }

      if (socket) {
        terminateSocket(socket);
      }

      socket = activeSocket;
      connected = false;
      setupAccepted = false;

      const setupPromise = new Promise<void>((resolve, reject) => {
        pendingSetup = { generation, resolve, reject };
      });
      let setupErrorTimer: ReturnType<typeof setTimeout> | undefined;
      const clearSetupErrorTimer = () => {
        if (setupErrorTimer !== undefined) {
          clearTimeout(setupErrorTimer);
          setupErrorTimer = undefined;
        }
      };

      const failBeforeSetup = (
        kind: Extract<GeminiLiveEvent, { type: 'error' }>['kind'],
        diagnostic?: LiveConnectionDiagnostic,
      ) => {
        clearSetupErrorTimer();
        const error = new GeminiLiveConnectionError(
          kind === 'quota'
            ? 'Assistant session is temporarily unavailable.'
            : 'Assistant setup was rejected.',
          kind,
          diagnostic,
        );
        terminateSocket(activeSocket);
        rejectPendingSetup(error);
        emit({
          type: 'error',
          kind,
          message: error.message,
          ...(diagnostic ? { diagnostic } : {}),
        });
      };

      onMessage = (event: LiveSocketEventMap['message']) => {
        if (generation !== connectGeneration || socket !== activeSocket) {
          return;
        }
        if (isSetupCompleteMessage(event.data)) {
          clearSetupErrorTimer();
          setupAccepted = true;
          connected = true;
          const pending = pendingSetup;
          if (pending?.generation === generation) {
            pendingSetup = undefined;
            pending.resolve();
          }
          return;
        }
        try {
          const parsedEvents = parseGeminiLiveMessage(event.data);
          for (const evt of parsedEvents) {
            if (evt.type === 'error' && !setupAccepted) {
              failBeforeSetup(evt.kind, { phase: 'setup_rejected' });
              return;
            }
            emit(evt);
          }
        } catch {
          if (!setupAccepted) {
            failBeforeSetup('protocol', { phase: 'setup_rejected' });
          } else {
            emit({
              type: 'error',
              kind: 'protocol',
              message: 'Received an invalid assistant event.',
            });
          }
        }
      };

      onError = () => {
        if (generation !== connectGeneration || socket !== activeSocket) {
          return;
        }
        if (!setupAccepted) {
          if (setupErrorTimer === undefined) {
            setupErrorTimer = setTimeout(() => {
              setupErrorTimer = undefined;
              if (
                generation === connectGeneration &&
                socket === activeSocket &&
                !setupAccepted
              ) {
                failBeforeSetup('network', { phase: 'setup_rejected' });
              }
            }, 1000);
          }
          return;
        }
        terminateSocket(activeSocket);
        emit({
          type: 'error',
          kind: 'network',
          message: 'Assistant connection failed.',
        });
      };

      onClose = (event) => {
        if (generation !== connectGeneration || socket !== activeSocket) {
          return;
        }
        const wasSetupAccepted = setupAccepted;
        if (!wasSetupAccepted) {
          failBeforeSetup('protocol', {
            phase: 'setup_rejected',
            ...(typeof event.code === 'number'
              ? { closeCode: event.code }
              : {}),
            ...(typeof event.wasClean === 'boolean'
              ? { wasClean: event.wasClean }
              : {}),
            ...(event.reasonCategory
              ? { closeReasonCategory: event.reasonCategory }
              : {}),
          });
          return;
        }
        terminateSocket(activeSocket);
        emit({
          type: 'error',
          kind: 'network',
          message: 'Assistant connection closed.',
          diagnostic: {
            phase: 'remote_close_after_setup',
            ...(typeof event.code === 'number'
              ? { closeCode: event.code }
              : {}),
            ...(typeof event.wasClean === 'boolean'
              ? { wasClean: event.wasClean }
              : {}),
            ...(event.reasonCategory
              ? { closeReasonCategory: event.reasonCategory }
              : {}),
          },
        });
      };

      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);

      await setupPromise;
      if (generation !== connectGeneration) return;
    },

    disconnect(): void {
      connectGeneration++;
      rejectPendingSetup(
        new GeminiLiveConnectionError(
          'Assistant connection was cancelled.',
          'network',
        ),
      );
      terminateSocket();
    },

    sendText(text: string): void {
      if (!socket || !connected) return;
      socket.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text }],
              },
            ],
            turnComplete: true,
          },
        }),
      );
    },

    sendAudio(data: string, mimeType = 'audio/pcm;rate=16000'): void {
      if (!socket || !connected) return;
      socket.send(
        JSON.stringify({
          realtimeInput: {
            audio: { mimeType, data },
          },
        }),
      );
    },

    sendToolResponse(response: LiveToolResponse): boolean {
      if (!socket || !connected) return false;
      try {
        socket.send(
          JSON.stringify({
            toolResponse: {
              functionResponses: [
                {
                  id: response.callId,
                  name: response.name,
                  response: response.response,
                },
              ],
            },
          }),
        );
        return true;
      } catch {
        return false;
      }
    },

    subscribe(listener: (event: GeminiLiveEvent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    isConnected(): boolean {
      return connected && socket !== undefined;
    },
  };
}
