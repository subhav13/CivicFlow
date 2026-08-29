import { createAssistantController } from '../../src/assistant/assistant-controller';
import type {
  AssistantControllerDependencies,
  MicrophoneStream,
} from '../../src/assistant/assistant-controller';
import type {
  GeminiLiveClient,
  GeminiLiveEvent,
} from '../../src/assistant/gemini-live-client';

class FakeLifecycleTarget {
  private pagehideListeners = new Set<() => void>();

  addEventListener(type: 'pagehide', listener: () => void): void {
    if (type === 'pagehide') this.pagehideListeners.add(listener);
  }

  removeEventListener(type: 'pagehide', listener: () => void): void {
    if (type === 'pagehide') this.pagehideListeners.delete(listener);
  }

  emitPagehide(): void {
    for (const listener of this.pagehideListeners) listener();
  }

  listenerCount(): number {
    return this.pagehideListeners.size;
  }
}

class FakeStream implements MicrophoneStream {
  readonly track = { stop: vi.fn() };
  readonly unsubscribe = vi.fn();
  private listener?: (data: string, mimeType?: string) => void;

  getTracks() {
    return [this.track];
  }

  subscribe(listener: (data: string, mimeType?: string) => void): () => void {
    this.listener = listener;
    return this.unsubscribe;
  }

  emit(data: string, mimeType?: string): void {
    this.listener?.(data, mimeType);
  }
}

class FakeClient implements GeminiLiveClient {
  readonly connect = vi.fn(async () => {
    this.connected = true;
  });
  readonly disconnect = vi.fn();
  readonly sendText = vi.fn();
  readonly sendAudio = vi.fn();
  readonly sendToolResponse = vi.fn(() => true);
  private listeners = new Set<(event: GeminiLiveEvent) => void>();
  private connected = false;

  subscribe(listener: (event: GeminiLiveEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return this.connected;
  }

  emit(event: GeminiLiveEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function createHarness() {
  const client = new FakeClient();
  const stream = new FakeStream();
  const lifecycle = new FakeLifecycleTarget();
  const toolBridge = {
    listFunctions: vi.fn(async () => []),
    executeToolCall: vi.fn(async () => ({
      kind: 'result' as const,
      callId: 'call-1',
      result: 'ok',
    })),
  };
  const dependencies: AssistantControllerDependencies = {
    client,
    toolBridge,
    microphone: { requestStream: vi.fn(async () => stream) },
    audioOutput: { play: vi.fn(), stop: vi.fn() },
    lifecycleTarget: lifecycle,
  };
  return {
    client,
    stream,
    lifecycle,
    toolBridge,
    microphone: dependencies.microphone!,
    audioOutput: dependencies.audioOutput!,
    controller: createAssistantController(dependencies),
  };
}

async function connect(
  harness: ReturnType<typeof createHarness>,
): Promise<void> {
  await harness.controller.connect();
}

describe('assistant controller lifecycle', () => {
  it('does not request a microphone before an explicit start action', async () => {
    const harness = createHarness();

    await harness.controller.connect();

    expect(harness.microphone.requestStream).not.toHaveBeenCalled();
  });

  it('starts microphone capture only after the explicit action and forwards audio', async () => {
    const harness = createHarness();
    await connect(harness);

    await harness.controller.startMicrophone();
    harness.stream.emit('pcm', 'audio/pcm;rate=16000');

    expect(harness.microphone.requestStream).toHaveBeenCalledOnce();
    expect(harness.client.sendAudio).toHaveBeenCalledWith(
      'pcm',
      'audio/pcm;rate=16000',
    );
  });

  it('stops tracks and removes the stream listener when microphone capture stops', async () => {
    const harness = createHarness();
    await connect(harness);
    await harness.controller.startMicrophone();

    harness.controller.stopMicrophone();

    expect(harness.stream.track.stop).toHaveBeenCalledOnce();
    expect(harness.stream.unsubscribe).toHaveBeenCalledOnce();
  });

  it('ignores audio emitted by a stopped microphone stream', async () => {
    const harness = createHarness();
    await connect(harness);
    await harness.controller.startMicrophone();

    harness.controller.stopMicrophone();
    harness.stream.emit('stale-pcm', 'audio/pcm;rate=16000');

    expect(harness.client.sendAudio).not.toHaveBeenCalled();
  });

  it('cleans up microphone, audio, client, and page listeners on page hide', async () => {
    const harness = createHarness();
    await connect(harness);
    await harness.controller.startMicrophone();

    harness.lifecycle.emitPagehide();

    expect(harness.stream.track.stop).toHaveBeenCalledOnce();
    expect(harness.audioOutput.stop).toHaveBeenCalledOnce();
    expect(harness.client.disconnect).toHaveBeenCalledOnce();
  });

  it('relays text, audio, and transcript events without touching application state', async () => {
    const harness = createHarness();
    const events: unknown[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await connect(harness);

    harness.client.emit({ type: 'text', text: 'Hello' });
    harness.client.emit({
      type: 'audio',
      data: 'audio',
      mimeType: 'audio/pcm;rate=24000',
    });
    harness.client.emit({
      type: 'transcript',
      speaker: 'model',
      text: 'Hello',
      final: true,
    });

    expect(events).toEqual([
      { type: 'state', state: { status: 'connecting' } },
      { type: 'state', state: { status: 'connected' } },
      { type: 'text', text: 'Hello' },
      { type: 'audio', data: 'audio', mimeType: 'audio/pcm;rate=24000' },
      { type: 'transcript', speaker: 'model', text: 'Hello', final: true },
    ]);
    expect(harness.audioOutput.play).toHaveBeenCalledWith(
      'audio',
      'audio/pcm;rate=24000',
    );
  });

  it('attaches an interruption only to the next real turn completion', async () => {
    const harness = createHarness();
    const events: unknown[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await connect(harness);

    harness.client.emit({
      type: 'turn_interrupted',
    } as unknown as GeminiLiveEvent);
    harness.client.emit({ type: 'turn_complete' });
    harness.client.emit({ type: 'turn_complete' });

    expect(
      events.filter(
        (event): event is { type: 'turn_complete'; interrupted?: boolean } =>
          typeof event === 'object' &&
          event !== null &&
          (event as { type?: unknown }).type === 'turn_complete',
      ),
    ).toEqual([
      { type: 'turn_complete', interrupted: true },
      { type: 'turn_complete' },
    ]);
  });

  it('routes function calls through the current Phase 2 bridge and returns the result', async () => {
    const harness = createHarness();
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-1',
          name: 'read_current_section',
          argumentsJson: '{}',
        },
      ],
    });
    await Promise.resolve();

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledWith(
      {
        callId: 'call-1',
        name: 'read_current_section',
        argumentsJson: '{}',
      },
      expect.any(Object),
    );
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-1',
      name: 'read_current_section',
      response: { result: 'ok' },
    });
  });

  it('returns a structured sanitized INVALID_ARGUMENTS response with the original call identity', async () => {
    const harness = createHarness();
    harness.toolBridge.executeToolCall.mockResolvedValueOnce({
      kind: 'invalid_arguments',
      code: 'INVALID_ARGUMENTS',
      callId: 'call-invalid-1',
      toolName: 'add_household_member',
      message: 'Provide the missing household member fields.',
      providedFields: ['firstName', 'relationship'],
      missingFields: ['ageYears', 'applyingForCoverage'],
      invalidFields: [],
    } as never);
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-invalid-1',
          name: 'add_household_member',
          argumentsJson: JSON.stringify({
            firstName: 'Private Person',
            relationship: 'spouse',
          }),
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-invalid-1',
      name: 'add_household_member',
      response: {
        error: {
          code: 'INVALID_ARGUMENTS',
          message: 'Provide the missing household member fields.',
          providedFields: ['firstName', 'relationship'],
          missingFields: ['ageYears', 'applyingForCoverage'],
          invalidFields: [],
        },
      },
    });
    expect(
      JSON.stringify(harness.client.sendToolResponse.mock.calls),
    ).not.toContain('Private Person');
  });

  it('decodes a serialized WebMCP failure envelope into a structured provider error', async () => {
    const harness = createHarness();
    const failureEnvelope = {
      ok: false,
      tool: 'add_household_member',
      actionId: 'action-failure-1',
      error: {
        code: 'PERSON_NOT_FOUND',
        message: 'The household member could not be found.',
        recoverable: true,
      },
      stateRevision: 3,
    } as const;
    harness.toolBridge.executeToolCall.mockResolvedValueOnce({
      kind: 'result',
      callId: 'call-failure-1',
      result: JSON.stringify(failureEnvelope),
    });
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-failure-1',
          name: 'add_household_member',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-failure-1',
      name: 'add_household_member',
      response: failureEnvelope,
    });
    expect(harness.client.sendToolResponse).not.toHaveBeenCalledWith(
      expect.objectContaining({
        response: { result: JSON.stringify(failureEnvelope) },
      }),
    );
  });

  it('decodes a serialized WebMCP success envelope into a structured provider result', async () => {
    const harness = createHarness();
    const successEnvelope = {
      ok: true,
      tool: 'add_household_member',
      actionId: 'action-success-1',
      changed: true,
      message: 'Added household member.',
      data: { memberId: 'member-1' },
      stateRevision: 4,
      visibleEffect: 'Added household member.',
    } as const;
    harness.toolBridge.executeToolCall.mockResolvedValueOnce({
      kind: 'result',
      callId: 'call-success-1',
      result: JSON.stringify(successEnvelope),
    });
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-success-1',
          name: 'add_household_member',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-success-1',
      name: 'add_household_member',
      response: { result: successEnvelope },
    });
  });

  it('keeps malformed and unrecognized legacy result strings as safe compatibility results', async () => {
    const harness = createHarness();
    harness.toolBridge.executeToolCall
      .mockResolvedValueOnce({
        kind: 'result',
        callId: 'call-malformed-1',
        result: '{malformed',
      })
      .mockResolvedValueOnce({
        kind: 'result',
        callId: 'call-legacy-1',
        result: '{"ok":true}',
      });
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-malformed-1',
          name: 'first',
          argumentsJson: '{}',
        },
        {
          callId: 'call-legacy-1',
          name: 'second',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendToolResponse).toHaveBeenNthCalledWith(1, {
      callId: 'call-malformed-1',
      name: 'first',
      response: { result: '{malformed' },
    });
    expect(harness.client.sendToolResponse).toHaveBeenNthCalledWith(2, {
      callId: 'call-legacy-1',
      name: 'second',
      response: { result: '{"ok":true}' },
    });
  });

  it('serializes function calls across separate provider events', async () => {
    const harness = createHarness();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstComplete = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    harness.toolBridge.executeToolCall
      .mockImplementationOnce(async (call) => {
        order.push(`start:${call.callId}`);
        await firstComplete;
        order.push(`end:${call.callId}`);
        return { kind: 'result', callId: call.callId, result: 'one' };
      })
      .mockImplementationOnce(async (call) => {
        order.push(`start:${call.callId}`);
        return { kind: 'result', callId: call.callId, result: 'two' };
      });
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [{ callId: 'call-1', name: 'first', argumentsJson: '{}' }],
    });
    harness.client.emit({
      type: 'function_call',
      calls: [{ callId: 'call-2', name: 'second', argumentsJson: '{}' }],
    });
    await Promise.resolve();
    expect(order).toEqual(['start:call-1']);

    releaseFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(order).toEqual(['start:call-1', 'end:call-1', 'start:call-2']);
  });

  it('does not send a queued tool result after the controller disconnects', async () => {
    const harness = createHarness();
    let releaseCall!: () => void;
    const callComplete = new Promise<void>((resolve) => {
      releaseCall = resolve;
    });
    harness.toolBridge.executeToolCall.mockImplementationOnce(async (call) => {
      await callComplete;
      return { kind: 'result', callId: call.callId, result: 'stale' };
    });
    await connect(harness);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-stale',
          name: 'read_current_section',
          argumentsJson: '{}',
        },
      ],
    });
    await Promise.resolve();
    harness.controller.disconnect();
    releaseCall();
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.client.sendToolResponse).not.toHaveBeenCalled();
  });

  it('turns permission denial into a safe recoverable state and does not leak tracks', async () => {
    const harness = createHarness();
    harness.microphone.requestStream = vi.fn(async () => {
      throw new Error('permission denied with device details');
    });

    await expect(harness.controller.startMicrophone()).resolves.toBeUndefined();
    expect(harness.controller.getState()).toEqual({
      status: 'error',
      message: 'Microphone permission was denied.',
      recoverable: true,
    });
  });

  it('sanitizes connection failures before exposing controller state', async () => {
    const harness = createHarness();
    harness.client.connect.mockImplementationOnce(async () => {
      throw new Error('provider credential and endpoint details');
    });

    await harness.controller.connect();

    expect(harness.controller.getState()).toEqual({
      status: 'error',
      message: 'Assistant connection failed.',
      recoverable: true,
    });
  });

  it('cleans up on provider failure, supports retry, and removes page listeners on dispose', async () => {
    const harness = createHarness();
    await connect(harness);
    await harness.controller.startMicrophone();

    harness.client.emit({
      type: 'error',
      kind: 'quota',
      message: 'Assistant session is temporarily unavailable.',
    });

    expect(harness.stream.track.stop).toHaveBeenCalledOnce();
    expect(harness.audioOutput.stop).toHaveBeenCalledOnce();
    expect(harness.client.disconnect).toHaveBeenCalledOnce();
    expect(harness.controller.getState()).toEqual({
      status: 'error',
      message: 'Assistant session is temporarily unavailable.',
      recoverable: true,
    });

    await harness.controller.retry();
    expect(harness.client.connect).toHaveBeenCalledTimes(2);
    harness.controller.dispose();
    expect(harness.lifecycle.listenerCount()).toBe(0);
  });
});
