import type { CurrentToolSurface, ToolBridgeResponse, ToolCall } from './types';
import type { GeminiToolBridge } from './gemini-tool-bridge';
import type { GeminiLiveClient, GeminiLiveEvent } from './gemini-live-client';
import { classifyConfirmationReply } from './confirmation-reply';
import { mergeLiveTextChunks } from './live-turn-assembler';
import {
  createToolSurfaceFreshnessCoordinator,
  type ToolSurfaceFreshnessCoordinator,
} from './tool-surface-freshness';
import type { ConfirmationDraft } from './tool-confirmation-view-model';
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
  setMuted?(muted: boolean): void;
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
      draft: ConfirmationDraft;
    }
  | { type: 'applying'; callId: string; toolName: string }
  | {
      type: 'revision_requested';
      callId: string;
      toolName: string;
      correction: string;
    }
  | {
      type: 'succeeded';
      callId: string;
      toolName: string;
      summary: string;
    }
  | { type: 'failed'; callId: string; toolName: string; message: string }
  | {
      type: 'delivery_failed';
      callId: string;
      toolName: string;
      message: string;
    };

export interface AssistantControllerDependencies {
  client: GeminiLiveClient;
  toolBridge: GeminiToolBridge;
  currentToolSurface?: CurrentToolSurface;
  waitForToolSurface?: () => Promise<void>;
  microphone?: MicrophoneProvider;
  audioOutput?: AudioOutput;
  lifecycleTarget?: PageLifecycleTarget;
}

export interface AssistantConnectOptions {
  accessPin?: string;
}

export interface AssistantController {
  connect(options?: AssistantConnectOptions): Promise<void>;
  retry(options?: AssistantConnectOptions): Promise<void>;
  disconnect(): void;
  startMicrophone(): Promise<void>;
  stopMicrophone(): void;
  setSpeakerMuted(muted: boolean): void;
  sendText(text: string): void;
  confirmToolCall(callId: string): Promise<void>;
  requestRevision(callId: string): boolean;
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
  expectedToolName: string,
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    typeof value.tool === 'string' &&
    value.tool === expectedToolName &&
    typeof value.actionId === 'string' &&
    value.actionId.trim().length > 0 &&
    typeof value.stateRevision === 'number' &&
    Number.isSafeInteger(value.stateRevision) &&
    value.stateRevision >= 0
  );
}

function decodeWebMcpResult(
  serialized: string,
  expectedToolName: string,
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

  if (!isSerializedWebMcpEnvelope(parsed, expectedToolName)) {
    return { kind: 'legacy', value: serialized };
  }

  return parsed.ok
    ? { kind: 'success', value: parsed }
    : { kind: 'failure', value: parsed };
}

const MAX_LIFECYCLE_MESSAGE_LENGTH = 240;
const TOOL_RESPONSE_DELIVERY_FAILURE =
  'The change was applied locally, but the assistant did not receive the result. Reconnect Live Voice Assistant to continue.';

function boundedLifecycleMessage(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x1f && codePoint !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, MAX_LIFECYCLE_MESSAGE_LENGTH);
}

function decodedResultMessage(
  decoded:
    | { kind: 'success'; value: Record<string, unknown> }
    | { kind: 'failure'; value: Record<string, unknown> }
    | { kind: 'legacy'; value: string },
  fallback: string,
): string {
  if (decoded.kind === 'legacy') return boundedLifecycleMessage(fallback);

  if (decoded.kind === 'success') {
    const visibleEffect = decoded.value.visibleEffect;
    if (typeof visibleEffect === 'string' && visibleEffect.trim()) {
      return boundedLifecycleMessage(visibleEffect);
    }
    const message = decoded.value.message;
    if (typeof message === 'string' && message.trim()) {
      return boundedLifecycleMessage(message);
    }
    return boundedLifecycleMessage(fallback);
  }

  const error = decoded.value.error;
  if (isRecord(error) && typeof error.message === 'string') {
    return boundedLifecycleMessage(error.message);
  }
  return boundedLifecycleMessage(fallback);
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
  let providerTurnActive = false;
  let pendingReplyText = '';
  let shouldResumeMicrophoneAfterRefresh = false;
  let freshnessCoordinator: ToolSurfaceFreshnessCoordinator | undefined;
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
  let activeToolExecutionCount = 0;
  const emit = (event: AssistantControllerEvent) => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const sendToolResponseSafely = (
    response: Parameters<GeminiLiveClient['sendToolResponse']>[0],
  ): boolean => {
    try {
      return dependencies.client.sendToolResponse(response) !== false;
    } catch {
      // A local mutation or cancellation must not be reclassified because the
      // provider socket closed while its response was being sent.
      return false;
    }
  };

  type DecodedToolResult = ReturnType<typeof decodeWebMcpResult>;
  interface ToolResponseOutcome {
    delivered: boolean;
    decoded?: DecodedToolResult;
  }

  const sendToolResponse = (
    call: ToolCall,
    response: ToolBridgeResponse,
  ): ToolResponseOutcome => {
    if (response.kind === 'result') {
      const decoded = decodeWebMcpResult(response.result, call.name);
      const delivered = sendToolResponseSafely({
        callId: call.callId,
        name: call.name,
        response:
          decoded.kind === 'failure'
            ? decoded.value
            : { result: decoded.value },
      });
      return { decoded, delivered };
    }

    if (response.kind === 'invalid_arguments') {
      const delivered = sendToolResponseSafely({
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
      return { delivered };
    }

    const delivered = sendToolResponseSafely({
      callId: call.callId,
      name: call.name,
      response: { error: response.message },
    });
    return { delivered };
  };

  const emitDeliveryFailure = (call: ToolCall, delivered: boolean): void => {
    if (delivered) return;
    emit({
      type: 'delivery_failed',
      callId: call.callId,
      toolName: call.name,
      message: TOOL_RESPONSE_DELIVERY_FAILURE,
    });
  };

  const invalidateSession = () => {
    sessionGeneration++;
    callQueue.length = 0;
    pendingConfirmations.clear();
    turnInterrupted = false;
    providerTurnActive = false;
    pendingReplyText = '';
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

  const markOutboundTurnIfSent = (send: () => unknown): void => {
    if (!dependencies.client.isConnected()) return;
    try {
      // The current public client contract is void-returning for compatibility;
      // the first-party client returns false when its socket rejected a send.
      if (send() !== false) providerTurnActive = true;
    } catch {
      // A transport failure is reported by the client lifecycle; do not hold a
      // critical section open for a turn that was not accepted.
    }
  };

  const startMicrophoneCapture = async (): Promise<void> => {
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
        ) {
          return;
        }
        markOutboundTurnIfSent(() =>
          dependencies.client.sendAudio(data, mimeType),
        );
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
        activeToolExecutionCount += 1;
        try {
          const response = await dependencies.toolBridge.executeToolCall(
            item.call,
            {},
          );
          if (!isSessionActive(item.generation)) {
            continue;
          }
          if (response.kind === 'result') {
            const outcome = sendToolResponse(item.call, response);
            emitDeliveryFailure(item.call, outcome.delivered);
          } else if (response.kind === 'confirmation_required') {
            pendingReplyText = '';
            pendingConfirmations.set(response.callId, item);
            emit({
              type: 'confirmation_required',
              callId: response.callId,
              toolName: response.toolName,
              message: response.message,
              draft: response.draft,
            });
            break;
          } else {
            const outcome = sendToolResponse(item.call, response);
            emitDeliveryFailure(item.call, outcome.delivered);
          }
        } catch {
          if (!isSessionActive(item.generation)) {
            continue;
          }
          const delivered = sendToolResponseSafely({
            callId: item.call.callId,
            name: item.call.name,
            response: {
              error: `Execution failed for tool "${item.call.name}".`,
            },
          });
          emitDeliveryFailure(item.call, delivered);
        } finally {
          activeToolExecutionCount -= 1;
        }
      }
    } finally {
      isProcessingCalls = false;
      freshnessCoordinator?.notifySafeBoundary();
    }
  };

  const getPendingConfirmation = (): PendingConfirmation | undefined => {
    return pendingConfirmations.values().next().value as
      PendingConfirmation | undefined;
  };

  const removePendingConfirmation = (pending: PendingConfirmation): void => {
    for (const [key, value] of pendingConfirmations) {
      if (value === pending) {
        pendingConfirmations.delete(key);
        return;
      }
    }
  };

  const reconnect = dependencies.client.reconnect?.bind(dependencies.client);
  if (dependencies.currentToolSurface && reconnect) {
    freshnessCoordinator = createToolSurfaceFreshnessCoordinator({
      surface: dependencies.currentToolSurface,
      reconnect: () => reconnect(),
      isSafeToRefresh: () =>
        state.status === 'connected' &&
        !providerTurnActive &&
        !isProcessingCalls &&
        activeToolExecutionCount === 0 &&
        pendingConfirmations.size === 0,
      onRefreshStart: () => {
        shouldResumeMicrophoneAfterRefresh = activeStream !== undefined;
        stopMicrophoneCapture();
        dependencies.audioOutput?.stop();
      },
      onRefreshComplete: async () => {
        if (!shouldResumeMicrophoneAfterRefresh) return;
        shouldResumeMicrophoneAfterRefresh = false;
        await startMicrophoneCapture();
      },
      onRefreshFailure: () => {
        if (isDisposed || state.status !== 'connected') return;
        shouldResumeMicrophoneAfterRefresh = false;
        freshnessCoordinator?.stop();
        stopMicrophoneCapture();
        dependencies.audioOutput?.stop();
        dependencies.client.disconnect();
        invalidateSession();
        state = transitionSessionState(state, {
          type: 'error',
          message: 'Assistant session refresh failed. Please reconnect.',
          recoverable: true,
        });
        emit({ type: 'state', state });
        emit({
          type: 'error',
          kind: 'network',
          message: 'Assistant session refresh failed. Please reconnect.',
        });
      },
    });
  }

  const settleSupersededQueuedCalls = (generation: number): void => {
    for (const item of callQueue) {
      if (item.generation !== generation) continue;
      try {
        dependencies.client.sendToolResponse({
          callId: item.call.callId,
          name: item.call.name,
          response: {
            error: {
              code: 'USER_REVISION_SUPERSEDED',
              message:
                'A queued action was not executed because the user requested a revision.',
            },
          },
        });
      } catch {
        // A transport failure must not allow a superseded call to execute.
      }
    }
    callQueue.length = 0;
  };

  const requestRevision = (
    pending: PendingConfirmation,
    correction: string,
  ): boolean => {
    if (!isSessionActive(pending.generation)) return false;
    pendingReplyText = '';
    removePendingConfirmation(pending);
    settleSupersededQueuedCalls(pending.generation);
    sendToolResponseSafely({
      callId: pending.call.callId,
      name: pending.call.name,
      response: {
        error: {
          code: 'USER_REVISION_REQUESTED',
          message: 'The user requested a revision before execution.',
          correction,
        },
      },
    });
    emit({
      type: 'revision_requested',
      callId: pending.call.callId,
      toolName: pending.call.name,
      correction,
    });
    void processCallQueue();
    return true;
  };

  const requestRevisionForCall = (
    callId: string,
    correction = 'The user requested a correction.',
  ): boolean => {
    if (isDisposed) return false;
    const pending = pendingConfirmations.get(callId);
    if (!pending) return false;
    return requestRevision(pending, correction);
  };

  const confirmToolCall = async (callId: string): Promise<void> => {
    if (isDisposed) return;
    const pending = pendingConfirmations.get(callId);
    if (!pending) return;
    pendingReplyText = '';
    pendingConfirmations.delete(callId);
    if (!isSessionActive(pending.generation)) return;

    emit({
      type: 'applying',
      callId: pending.call.callId,
      toolName: pending.call.name,
    });

    activeToolExecutionCount += 1;
    try {
      const response = await dependencies.toolBridge.executeToolCall(
        pending.call,
        { confirmed: true },
      );
      if (!isSessionActive(pending.generation)) return;

      if (response.kind === 'result') {
        const outcome = sendToolResponse(pending.call, response);
        if (outcome.decoded?.kind === 'success') {
          emit({
            type: 'succeeded',
            callId: pending.call.callId,
            toolName: pending.call.name,
            summary: decodedResultMessage(
              outcome.decoded,
              'The requested change was applied.',
            ),
          });
        } else {
          emit({
            type: 'failed',
            callId: pending.call.callId,
            toolName: pending.call.name,
            message: decodedResultMessage(
              outcome.decoded ?? { kind: 'legacy', value: '' },
              'The requested change could not be verified.',
            ),
          });
        }
        emitDeliveryFailure(pending.call, outcome.delivered);
      } else if (response.kind === 'confirmation_required') {
        const delivered = sendToolResponseSafely({
          callId: pending.call.callId,
          name: pending.call.name,
          response: { error: 'Tool confirmation failed unexpectedly.' },
        });
        emit({
          type: 'failed',
          callId: pending.call.callId,
          toolName: pending.call.name,
          message: 'The requested change could not be confirmed.',
        });
        emitDeliveryFailure(pending.call, delivered);
      } else {
        const outcome = sendToolResponse(pending.call, response);
        emit({
          type: 'failed',
          callId: pending.call.callId,
          toolName: pending.call.name,
          message: boundedLifecycleMessage(response.message),
        });
        emitDeliveryFailure(pending.call, outcome.delivered);
      }
    } catch {
      if (!isSessionActive(pending.generation)) return;
      const message = `Execution failed for tool "${pending.call.name}".`;
      const delivered = sendToolResponseSafely({
        callId: pending.call.callId,
        name: pending.call.name,
        response: { error: message },
      });
      emit({
        type: 'failed',
        callId: pending.call.callId,
        toolName: pending.call.name,
        message: boundedLifecycleMessage(message),
      });
      emitDeliveryFailure(pending.call, delivered);
    } finally {
      activeToolExecutionCount -= 1;
      void processCallQueue();
      freshnessCoordinator?.notifySafeBoundary();
    }
  };

  const handlePendingReply = (text: string, final: boolean): void => {
    const pending = getPendingConfirmation();
    if (!pending || !isSessionActive(pending.generation)) return;
    pendingReplyText = mergeLiveTextChunks(pendingReplyText, text);
    const decision = classifyConfirmationReply(pendingReplyText, { final });
    if (decision.kind === 'interim') return;
    if (decision.kind === 'affirmative') {
      pendingReplyText = '';
      return;
    }
    if (decision.text) requestRevision(pending, decision.text);
  };

  const handleClientEvent = (event: GeminiLiveEvent) => {
    if (isDisposed) return;
    if (event.type === 'error') {
      invalidateSession();
      freshnessCoordinator?.stop();
      shouldResumeMicrophoneAfterRefresh = false;
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
        providerTurnActive = true;
        emit({ type: 'text', text: event.text });
        break;
      case 'audio':
        providerTurnActive = true;
        dependencies.audioOutput?.play(event.data, event.mimeType);
        emit({ type: 'audio', data: event.data, mimeType: event.mimeType });
        break;
      case 'transcript':
        providerTurnActive = true;
        emit({
          type: 'transcript',
          speaker: event.speaker,
          text: event.text,
          final: event.final,
        });
        if (event.speaker === 'user') {
          handlePendingReply(event.text, event.final);
        }
        break;
      case 'turn_interrupted':
        providerTurnActive = true;
        turnInterrupted = true;
        break;
      case 'turn_complete':
        providerTurnActive = false;
        emit({
          type: 'turn_complete',
          ...(turnInterrupted ? { interrupted: true } : {}),
        });
        turnInterrupted = false;
        freshnessCoordinator?.notifySafeBoundary();
        break;
      case 'function_call': {
        providerTurnActive = true;
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
      freshnessCoordinator?.stop();
      shouldResumeMicrophoneAfterRefresh = false;
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      state = transitionSessionState(state, { type: 'disconnect' });
      emit({ type: 'state', state });
    };
    dependencies.lifecycleTarget.addEventListener('pagehide', pagehideListener);
  }

  const connectInternal = async (
    eventType: 'connect' | 'retry',
    options?: AssistantConnectOptions,
  ) => {
    if (isDisposed) return;
    freshnessCoordinator?.stop();
    invalidateSession();
    const currentGeneration = sessionGeneration;
    state = transitionSessionState(state, { type: eventType });
    emit({ type: 'state', state });
    try {
      await dependencies.waitForToolSurface?.();
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      await freshnessCoordinator?.start();
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      await dependencies.client.connect(undefined, options?.accessPin);
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      state = transitionSessionState(state, { type: 'connected' });
      emit({ type: 'state', state });
      freshnessCoordinator?.notifySafeBoundary();
    } catch (error: unknown) {
      if (isDisposed || currentGeneration !== sessionGeneration) {
        return;
      }
      freshnessCoordinator?.stop();
      shouldResumeMicrophoneAfterRefresh = false;
      const authFailed =
        error instanceof Error &&
        error.message === 'Assistant session authentication failed.';
      state = transitionSessionState(state, {
        type: 'error',
        message: authFailed
          ? 'Live access was not accepted. Try again.'
          : 'Assistant connection failed.',
        recoverable: true,
      });
      emit({ type: 'state', state });
    }
  };

  return {
    async connect(options?: AssistantConnectOptions): Promise<void> {
      await connectInternal('connect', options);
    },

    async retry(options?: AssistantConnectOptions): Promise<void> {
      await connectInternal('retry', options);
    },

    disconnect(): void {
      if (isDisposed) return;
      invalidateSession();
      freshnessCoordinator?.stop();
      shouldResumeMicrophoneAfterRefresh = false;
      stopMicrophoneCapture();
      dependencies.audioOutput?.stop();
      dependencies.client.disconnect();
      state = transitionSessionState(state, { type: 'disconnect' });
      emit({ type: 'state', state });
    },

    async startMicrophone(): Promise<void> {
      if (!dependencies.microphone || isDisposed) return;
      if (freshnessCoordinator && !(await freshnessCoordinator.beforeTurn())) {
        return;
      }
      await startMicrophoneCapture();
    },

    stopMicrophone(): void {
      shouldResumeMicrophoneAfterRefresh = false;
      stopMicrophoneCapture();
    },

    setSpeakerMuted(muted: boolean): void {
      dependencies.audioOutput?.setMuted?.(muted);
    },

    sendText(text: string): void {
      const pending = getPendingConfirmation();
      if (pending && isSessionActive(pending.generation)) {
        handlePendingReply(text, true);
        return;
      }
      if (freshnessCoordinator) {
        void freshnessCoordinator.beforeTurn().then((canProceed) => {
          if (canProceed && isSessionActive(sessionGeneration)) {
            markOutboundTurnIfSent(() => dependencies.client.sendText(text));
          }
        });
        return;
      }
      markOutboundTurnIfSent(() => dependencies.client.sendText(text));
    },

    confirmToolCall,

    requestRevision: requestRevisionForCall,

    cancelToolCall(callId: string): void {
      if (isDisposed) return;
      const pending = pendingConfirmations.get(callId);
      if (!pending) return;
      pendingConfirmations.delete(callId);
      if (!isSessionActive(pending.generation)) return;

      try {
        sendToolResponseSafely({
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
      freshnessCoordinator?.dispose();
      shouldResumeMicrophoneAfterRefresh = false;
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
