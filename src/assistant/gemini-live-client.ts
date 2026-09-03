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
    accessPin?: string,
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
  connect(signal?: AbortSignal, accessPin?: string): Promise<void>;
  /** Replace an accepted session after a tool-surface revision. */
  reconnect?(): Promise<void>;
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
  interface SocketBinding {
    socket: LiveSocket;
    generation: number;
    preserveActive: boolean;
    setupAccepted: boolean;
    cancelled: boolean;
    setupErrorTimer?: ReturnType<typeof setTimeout>;
    setupPromise: Promise<void>;
    resolveSetup: () => void;
    rejectSetup: (reason?: unknown) => void;
    onMessage?: (event: LiveSocketEventMap['message']) => void;
    onError?: (event: LiveSocketEventMap['error']) => void;
    onClose?: (event: LiveSocketEventMap['close']) => void;
  }

  let activeBinding: SocketBinding | undefined;
  let pendingBinding: SocketBinding | undefined;
  let connected = false;
  let connectGeneration = 0;
  let retainedAccessPin: string | undefined;
  const listeners = new Set<(event: GeminiLiveEvent) => void>();

  const emit = (event: GeminiLiveEvent) => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const detachSocketListeners = (binding: SocketBinding) => {
    if (binding.onMessage) {
      binding.socket.removeEventListener('message', binding.onMessage);
    }
    if (binding.onError) {
      binding.socket.removeEventListener('error', binding.onError);
    }
    if (binding.onClose) {
      binding.socket.removeEventListener('close', binding.onClose);
    }
    binding.onMessage = undefined;
    binding.onError = undefined;
    binding.onClose = undefined;
  };

  const closeBinding = (binding: SocketBinding, reason?: unknown) => {
    if (binding.cancelled) return;
    binding.cancelled = true;
    if (binding.setupErrorTimer !== undefined) {
      clearTimeout(binding.setupErrorTimer);
      binding.setupErrorTimer = undefined;
    }
    detachSocketListeners(binding);
    if (pendingBinding === binding) pendingBinding = undefined;
    if (activeBinding === binding) {
      activeBinding = undefined;
      connected = false;
    }
    if (!binding.setupAccepted) {
      binding.rejectSetup(
        reason ??
          new GeminiLiveConnectionError(
            'Assistant connection was cancelled.',
            'network',
          ),
      );
    }
    binding.socket.close();
  };

  const promoteBinding = (binding: SocketBinding) => {
    const previous = activeBinding;
    activeBinding = binding;
    pendingBinding = undefined;
    connected = true;
    if (previous && previous !== binding && !previous.cancelled) {
      closeBinding(previous);
    }
  };

  const isKnownBinding = (binding: SocketBinding): boolean => {
    return (
      !binding.cancelled &&
      (binding === activeBinding || binding === pendingBinding)
    );
  };

  const failBeforeSetup = (
    binding: SocketBinding,
    kind: Extract<GeminiLiveEvent, { type: 'error' }>['kind'],
    diagnostic: LiveConnectionDiagnostic | undefined,
    emitError: boolean,
  ) => {
    if (binding.cancelled) return;
    const error = new GeminiLiveConnectionError(
      kind === 'quota'
        ? 'Assistant session is temporarily unavailable.'
        : 'Assistant setup was rejected.',
      kind,
      diagnostic,
    );
    closeBinding(binding, error);
    if (emitError) {
      emit({
        type: 'error',
        kind,
        message: error.message,
        ...(diagnostic ? { diagnostic } : {}),
      });
    }
  };

  const attachBinding = (binding: SocketBinding) => {
    binding.onMessage = (event: LiveSocketEventMap['message']) => {
      if (!isKnownBinding(binding)) return;
      if (isSetupCompleteMessage(event.data)) {
        if (binding.setupErrorTimer !== undefined) {
          clearTimeout(binding.setupErrorTimer);
          binding.setupErrorTimer = undefined;
        }
        binding.setupAccepted = true;
        promoteBinding(binding);
        binding.resolveSetup();
        return;
      }

      try {
        const parsedEvents = parseGeminiLiveMessage(event.data);
        for (const evt of parsedEvents) {
          if (evt.type === 'error' && !binding.setupAccepted) {
            failBeforeSetup(
              binding,
              evt.kind,
              { phase: 'setup_rejected' },
              !binding.preserveActive,
            );
            return;
          }
          // A replacement socket is silent until setupComplete. This keeps
          // the accepted session's transcript and turn ordering intact while
          // the new declaration set is being established.
          if (binding.setupAccepted && binding === activeBinding) emit(evt);
        }
      } catch {
        if (!binding.setupAccepted) {
          failBeforeSetup(
            binding,
            'protocol',
            { phase: 'setup_rejected' },
            !binding.preserveActive,
          );
        } else if (binding === activeBinding) {
          emit({
            type: 'error',
            kind: 'protocol',
            message: 'Received an invalid assistant event.',
          });
        }
      }
    };

    binding.onError = () => {
      if (!isKnownBinding(binding)) return;
      if (!binding.setupAccepted) {
        if (binding.setupErrorTimer === undefined) {
          binding.setupErrorTimer = setTimeout(() => {
            binding.setupErrorTimer = undefined;
            if (isKnownBinding(binding) && !binding.setupAccepted) {
              failBeforeSetup(
                binding,
                'network',
                { phase: 'setup_rejected' },
                !binding.preserveActive,
              );
            }
          }, 1000);
        }
        return;
      }
      if (binding !== activeBinding) return;
      closeBinding(binding);
      emit({
        type: 'error',
        kind: 'network',
        message: 'Assistant connection failed.',
      });
    };

    binding.onClose = (event) => {
      if (!isKnownBinding(binding)) return;
      if (!binding.setupAccepted) {
        failBeforeSetup(
          binding,
          'protocol',
          {
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
          },
          !binding.preserveActive,
        );
        return;
      }
      if (binding !== activeBinding) return;
      closeBinding(binding);
      emit({
        type: 'error',
        kind: 'network',
        message: 'Assistant connection closed.',
        diagnostic: {
          phase: 'remote_close_after_setup',
          ...(typeof event.code === 'number' ? { closeCode: event.code } : {}),
          ...(typeof event.wasClean === 'boolean'
            ? { wasClean: event.wasClean }
            : {}),
          ...(event.reasonCategory
            ? { closeReasonCategory: event.reasonCategory }
            : {}),
        },
      });
    };

    binding.socket.addEventListener('message', binding.onMessage);
    binding.socket.addEventListener('error', binding.onError);
    binding.socket.addEventListener('close', binding.onClose);
  };

  const openBinding = async (
    generation: number,
    preserveActive: boolean,
    signal?: AbortSignal,
  ): Promise<void> => {
    let credential: EphemeralSessionCredential;
    try {
      credential = await dependencies.issueEphemeralSession(
        signal,
        retainedAccessPin,
      );
    } catch (err) {
      if (!preserveActive && generation === connectGeneration) {
        connected = false;
      }
      throw err;
    }

    if (preserveActive && generation !== connectGeneration) return;

    let liveSocket: LiveSocket;
    try {
      liveSocket = await dependencies.connectSocket(credential);
    } catch (err) {
      if (!preserveActive && generation === connectGeneration) {
        connected = false;
      }
      throw err;
    }

    if (generation !== connectGeneration) {
      liveSocket.close();
      return;
    }

    let resolveSetup!: () => void;
    let rejectSetup!: (reason?: unknown) => void;
    const binding: SocketBinding = {
      socket: liveSocket,
      generation,
      preserveActive,
      setupAccepted: false,
      cancelled: false,
      setupPromise: new Promise<void>((resolve, reject) => {
        resolveSetup = resolve;
        rejectSetup = reject;
      }),
      resolveSetup,
      rejectSetup,
    };
    pendingBinding = binding;
    attachBinding(binding);
    await binding.setupPromise;
    if (generation !== connectGeneration) return;
  };

  return {
    async connect(signal?: AbortSignal, accessPin?: string): Promise<void> {
      const generation = ++connectGeneration;
      retainedAccessPin =
        typeof accessPin === 'string' && accessPin.trim().length > 0
          ? accessPin
          : undefined;
      if (pendingBinding) {
        closeBinding(
          pendingBinding,
          new GeminiLiveConnectionError(
            'Assistant connection was cancelled.',
            'network',
          ),
        );
      }
      if (activeBinding) closeBinding(activeBinding);
      try {
        await openBinding(generation, false, signal);
      } catch (error) {
        retainedAccessPin = undefined;
        throw error;
      }
    },

    async reconnect(): Promise<void> {
      if (!activeBinding || !connected) {
        throw new GeminiLiveConnectionError(
          'Assistant connection is not active.',
          'network',
        );
      }
      const generation = ++connectGeneration;
      if (pendingBinding) {
        closeBinding(
          pendingBinding,
          new GeminiLiveConnectionError(
            'Assistant connection was cancelled.',
            'network',
          ),
        );
      }
      await openBinding(generation, true);
    },

    disconnect(): void {
      connectGeneration++;
      retainedAccessPin = undefined;
      const cancellation = new GeminiLiveConnectionError(
        'Assistant connection was cancelled.',
        'network',
      );
      if (pendingBinding) closeBinding(pendingBinding, cancellation);
      if (activeBinding) closeBinding(activeBinding, cancellation);
      connected = false;
    },

    sendText(text: string): boolean {
      if (!activeBinding || !connected) return false;
      try {
        const accepted = activeBinding.socket.send(
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
        ) as unknown;
        return accepted !== false;
      } catch {
        return false;
      }
    },

    sendAudio(data: string, mimeType = 'audio/pcm;rate=16000'): boolean {
      if (!activeBinding || !connected) return false;
      try {
        const accepted = activeBinding.socket.send(
          JSON.stringify({
            realtimeInput: {
              audio: { mimeType, data },
            },
          }),
        ) as unknown;
        return accepted !== false;
      } catch {
        return false;
      }
    },

    sendToolResponse(response: LiveToolResponse): boolean {
      if (!activeBinding || !connected) return false;
      try {
        activeBinding.socket.send(
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
      return connected && activeBinding !== undefined;
    },
  };
}
