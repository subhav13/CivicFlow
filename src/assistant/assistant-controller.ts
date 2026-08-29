import type { ToolBridgeResponse, ToolCall } from './types';
import type { GeminiToolBridge } from './gemini-tool-bridge';
import type { GeminiLiveClient, GeminiLiveEvent } from './gemini-live-client';
import {
  createInitialSessionState,
  transitionSessionState,
} from './session-state';
import type { SessionState } from './session-state';

export interface MicrophoneTrack {
  stop(): void;
}

export interface MicrophoneStream {
  getTracks(): readonly MicrophoneTrack[];
  subscribe(listener: (data: string, mimeType?: string) => void): () => void;
}

export interface MicrophoneProvider {
  requestStream(): Promise<MicrophoneStream>;
}

export interface AudioOutput {
  play(data: string, mimeType: string): void;
  stop(): void;
}

export interface PageLifecycleTarget {
  addEventListener(type: 'pagehide', listener: () => void): void;
  removeEventListener(type: 'pagehide', listener: () => void): void;
}

export type AssistantControllerEvent =
  | { type: 'state'; state: SessionState }
  | Exclude<GeminiLiveEvent, { type: 'function_call' | 'turn_interrupted' }>
  | {
      type: 'confirmation_required';
      callId: string;
      toolName: string;
      message: string;
    };

export interface AssistantControllerDependencies {
  client: GeminiLiveClient;
  toolBridge: GeminiToolBridge;
  microphone?: MicrophoneProvider;
  audioOutput?: AudioOutput;
  lifecycleTarget?: PageLifecycleTarget;
}

export interface AssistantController {
  connect(): Promise<void>;
  retry(): Promise<void>;
  disconnect(): void;
  startMicrophone(): Promise<void>;
  stopMicrophone(): void;
  sendText(text: string): void;
  confirmToolCall(callId: string): Promise<void>;
  cancelToolCall(callId: string): void;
  dispose(): void;
  getState(): SessionState;
  subscribe(listener: (event: AssistantControllerEvent) => void): () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSerializedWebMcpEnvelope(
  value: unknown,
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    typeof value.tool === 'string' &&
    value.tool.length > 0 &&
    typeof value.actionId === 'string' &&
    Number.isSafeInteger(value.stateRevision)
  );
}

function decodeWebMcpResult(
  serialized: string,
):
  | { kind: 'success'; value: Record<string, unknown> }
  | { kind: 'failure'; value: Record<string, unknown> }
  | { kind: 'legacy'; value: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { kind: 'legacy', value: serialized };
  }

  if (!isSerializedWebMcpEnvelope(parsed)) {
    return { kind: 'legacy', value: serialized };
  }

  return parsed.ok
    ? { kind: 'success', value: parsed }
    : { kind: 'failure', value: parsed };
}

export function createAssistantController(
  dependencies: AssistantControllerDependencies,
): AssistantController {
  let state: SessionState = createInitialSessionState();
  let sessionGeneration = 0;
  let isDisposed = false;
  const listeners = new Set<(event: AssistantControllerEvent) => void>();
  let activeStream: MicrophoneStream | undefined;
  let unsubscribeStream: (() => void) | undefined;
  let clientUnsubscribe: (() => void) | undefined;
  let pagehideListener: (() => void) | undefined;
  let turnInterrupted = false;
  interface QueuedCall {
    call: ToolCall;
    generation: number;
  }
  const callQueue: QueuedCall[] = [];
  interface PendingConfirmation {
    call: ToolCall;
    generation: number;
  }
  const pendingConfirmations = new Map<string, PendingConfirmation>();
  let isProcessingCalls = false;
  const emit = (event: AssistantControllerEvent) => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const sendToolResponse = (
    call: ToolCall,
    response: ToolBridgeResponse,
  ): void => {
    if (response.kind === 'result') {
      const decoded = decodeWebMcpResult(response.result);
      dependencies.client.sendToolResponse({
        callId: call.callId,
        name: call.name,
        response:
          decoded.kind === 'failure'
            ? decoded.value
            : { result: decoded.value },
      });
      return;
    }

    if (response.kind === 'invalid_arguments') {
      dependencies.client.sendToolResponse({
        callId: call.callId,
        name: call.name,
        response: {
          error: {
            code: response.code,
            message: response.message,
            providedFields: response.providedFields,
            missingFields: response.missingFields,
            invalidFields: response.invalidFields,
          },
        },
      });
      return;
    }

    dependencies.client.sendToolResponse({
      callId: call.callId,
      name: call.name,
      response: { error: response.message },
    });
  };

  const invalidateSession = () => {
    sessionGeneration++;
    callQueue.length = 0;
    pendingConfirmations.clear();
    turnInterrupted = false;
  };

  const isSessionActive = (generation: number): boolean => {
    return (
      !isDisposed &&
      generation === sessionGeneration &&
      state.status === 'connected'
    );
  };

  const stopMicrophoneCapture = () => {
    if (unsubscribeStream) {
      unsubscribeStream();
      unsubscribeStream = undefined;
    }
    if (activeStream) {
      for (const track of activeStream.getTracks()) {
        track.stop();
      }
      activeStream = undefined;
    }
  };

  const processCallQueue = async () => {
    if (isProcessingCalls || pendingConfirmations.size > 0) return;
    isProcessingCalls = true;
    try {
      while (callQueue.length > 0 && pendingConfirmations.size === 0) {
        const item = callQueue.shift()!;
        if (!isSessionActive(item.generation)) {
          continue;
        }
        try {
          const response = await dependencies.toolBridge.executeToolCall(
            item.call,
            {},
          );
          if (!isSessionActive(item.generation)) {
            continue;
          }
          if (response.kind === 'result') {
            sendToolResponse(item.call, response);
          } else if (response.kind === 'confirmation_required') {
            pendingConfirmations.set(response.callId, item);
            emit({
              type: 'confirmation_required',
              callId: response.callId,
              toolName: response.toolName,
              message: response.message,
            });
            break;
          } else {
            sendToolResponse(item.call, response);
          }
        } catch {
          if (!isSessionActive(item.generation)) {
            continue;
          }
          dependencies.client.sendToolResponse({
            callId: item.call.callId,
            name: item.call.name,
            response: {
              error: `Execution failed for tool "${item.call.name}".`,
            },
          });
        }
      }
    } finally {
      isProcessingCalls = false;
    }
  };

  const handleClientEvent = (event: GeminiLiveEvent) => {
    if (isDisposed) return;
    if (event.type === 'error') {
      invalidateSession();
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      state = transitionSessionState(state, {
        type: 'error',
        message: event.message,
        recoverable: true,
      });
      emit({ type: 'state', state });
      emit({
        type: 'error',
        kind: event.kind,
        message: event.message,
        ...(event.diagnostic ? { diagnostic: event.diagnostic } : {}),
      });
      return;
    }

    if (state.status !== 'connected') {
      return;
    }

    switch (event.type) {
      case 'text':
        emit({ type: 'text', text: event.text });
        break;
      case 'audio':
        dependencies.audioOutput?.play(event.data, event.mimeType);
        emit({ type: 'audio', data: event.data, mimeType: event.mimeType });
        break;
      case 'transcript':
        emit({
          type: 'transcript',
          speaker: event.speaker,
          text: event.text,
          final: event.final,
        });
        break;
      case 'turn_interrupted':
        turnInterrupted = true;
        break;
      case 'turn_complete':
        emit({
          type: 'turn_complete',
          ...(turnInterrupted ? { interrupted: true } : {}),
        });
        turnInterrupted = false;
        break;
      case 'function_call': {
        const callGeneration = sessionGeneration;
        for (const call of event.calls) {
          callQueue.push({ call, generation: callGeneration });
        }
        void processCallQueue();
        break;
      }
    }
  };

  clientUnsubscribe = dependencies.client.subscribe(handleClientEvent);

  if (dependencies.lifecycleTarget) {
    pagehideListener = () => {
      invalidateSession();
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      state = transitionSessionState(state, { type: 'disconnect' });
      emit({ type: 'state', state });
    };
    dependencies.lifecycleTarget.addEventListener('pagehide', pagehideListener);
  }

  const connectInternal = async (eventType: 'connect' | 'retry') => {
    if (isDisposed) return;
    invalidateSession();
    const currentGeneration = sessionGeneration;
    state = transitionSessionState(state, { type: eventType });
    emit({ type: 'state', state });
    try {
      await dependencies.client.connect();
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      state = transitionSessionState(state, { type: 'connected' });
      emit({ type: 'state', state });
    } catch {
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      state = transitionSessionState(state, {
        type: 'error',
        message: 'Assistant connection failed.',
        recoverable: true,
      });
      emit({ type: 'state', state });
    }
  };

  return {
    async connect(): Promise<void> {
      await connectInternal('connect');
    },

    async retry(): Promise<void> {
      await connectInternal('retry');
    },

    disconnect(): void {
      if (isDisposed) return;
      invalidateSession();
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      state = transitionSessionState(state, { type: 'disconnect' });
      emit({ type: 'state', state });
    },

    async startMicrophone(): Promise<void> {
      if (!dependencies.microphone || isDisposed) return;
      stopMicrophoneCapture();
      try {
        const stream = await dependencies.microphone.requestStream();
        if (isDisposed || state.status !== 'connected') {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        activeStream = stream;
        unsubscribeStream = stream.subscribe((data, mimeType) => {
          if (
            activeStream !== stream ||
            isDisposed ||
            state.status !== 'connected'
          )
            return;
          dependencies.client.sendAudio(data, mimeType);
        });
      } catch {
        stopMicrophoneCapture();
        state = transitionSessionState(state, {
          type: 'error',
          message: 'Microphone permission was denied.',
          recoverable: true,
        });
        emit({ type: 'state', state });
      }
    },

    stopMicrophone(): void {
      stopMicrophoneCapture();
    },

    sendText(text: string): void {
      dependencies.client.sendText(text);
    },

    async confirmToolCall(callId: string): Promise<void> {
      if (isDisposed) return;
      const pending = pendingConfirmations.get(callId);
      if (!pending) return;
      pendingConfirmations.delete(callId);
      if (!isSessionActive(pending.generation)) return;

      try {
        const response = await dependencies.toolBridge.executeToolCall(
          pending.call,
          { confirmed: true },
        );
        if (!isSessionActive(pending.generation)) return;

        if (response.kind === 'result') {
          sendToolResponse(pending.call, response);
        } else if (response.kind === 'confirmation_required') {
          dependencies.client.sendToolResponse({
            callId: pending.call.callId,
            name: pending.call.name,
            response: { error: 'Tool confirmation failed unexpectedly.' },
          });
        } else {
          sendToolResponse(pending.call, response);
        }
      } catch {
        if (!isSessionActive(pending.generation)) return;
        dependencies.client.sendToolResponse({
          callId: pending.call.callId,
          name: pending.call.name,
          response: {
            error: `Execution failed for tool "${pending.call.name}".`,
          },
        });
      } finally {
        void processCallQueue();
      }
    },

    cancelToolCall(callId: string): void {
      if (isDisposed) return;
      const pending = pendingConfirmations.get(callId);
      if (!pending) return;
      pendingConfirmations.delete(callId);
      if (!isSessionActive(pending.generation)) return;

      try {
        dependencies.client.sendToolResponse({
          callId: pending.call.callId,
          name: pending.call.name,
          response: { error: 'Action cancelled by the user.' },
        });
      } finally {
        void processCallQueue();
      }
    },

    dispose(): void {
      isDisposed = true;
      invalidateSession();
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      if (clientUnsubscribe) {
        clientUnsubscribe();
        clientUnsubscribe = undefined;
      }
      if (pagehideListener && dependencies.lifecycleTarget) {
        dependencies.lifecycleTarget.removeEventListener(
          'pagehide',
          pagehideListener,
        );
        pagehideListener = undefined;
      }
      listeners.clear();
      state = transitionSessionState(state, { type: 'disconnect' });
    },

    getState(): SessionState {
      return state;
    },

    subscribe(listener: (event: AssistantControllerEvent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
