import { createAssistantController } from '../../src/assistant/assistant-controller';
import type {
  AssistantControllerDependencies,
  AssistantControllerEvent,
} from '../../src/assistant/assistant-controller';
import type {
  GeminiLiveClient,
  GeminiLiveEvent,
} from '../../src/assistant/gemini-live-client';

class FakeClient implements GeminiLiveClient {
  readonly connect = vi.fn(async () => {});
  readonly disconnect = vi.fn();
  readonly sendText = vi.fn();
  readonly sendAudio = vi.fn();
  readonly sendToolResponse = vi.fn();
  private readonly listeners = new Set<(event: GeminiLiveEvent) => void>();

  subscribe(listener: (event: GeminiLiveEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return true;
  }

  emit(event: GeminiLiveEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function createHarness() {
  const client = new FakeClient();
  const toolBridge = {
    listFunctions: vi.fn(async () => []),
    executeToolCall: vi.fn(async (call, options) =>
      options?.confirmed
        ? { kind: 'result' as const, callId: call.callId, result: 'confirmed' }
        : {
            kind: 'confirmation_required' as const,
            callId: call.callId,
            toolName: call.name,
            message: 'Confirm this change.',
          },
    ),
  };
  const dependencies: AssistantControllerDependencies = {
    client,
    toolBridge,
  };
  return {
    client,
    toolBridge,
    controller: createAssistantController(dependencies),
  };
}

describe('Phase 4 controller confirmation boundary', () => {
  it('holds a mutation until confirmToolCall explicitly approves it', async () => {
    const harness = createHarness();
    const events: GeminiLiveEvent[] = [];
    harness.controller.subscribe((event) => {
      if (event.type !== 'state' && event.type !== 'confirmation_required') {
        events.push(event);
      }
    });
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      ],
    });
    await Promise.resolve();

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledWith(
      { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      {},
    );
    expect(harness.client.sendToolResponse).not.toHaveBeenCalled();

    await harness.controller.confirmToolCall('call-1');

    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(
      { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      { confirmed: true },
    );
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-1',
      name: 'add_income_source',
      response: { result: 'confirmed' },
    });
    expect(events).toEqual([]);
  });

  it('returns a cancellation response without executing the pending mutation', async () => {
    const harness = createHarness();
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-2', name: 'set_current_coverage', argumentsJson: '{}' },
      ],
    });
    await Promise.resolve();
    harness.toolBridge.executeToolCall.mockClear();

    harness.controller.cancelToolCall('call-2');

    expect(harness.toolBridge.executeToolCall).not.toHaveBeenCalled();
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-2',
      name: 'set_current_coverage',
      response: { error: 'Action cancelled by the user.' },
    });
  });

  it('pauses later function calls until the first pending confirmation is resolved', async () => {
    const harness = createHarness();
    const confirmationEvents: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => {
      if (event.type === 'confirmation_required')
        confirmationEvents.push(event);
    });
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
        { callId: 'call-2', name: 'set_current_coverage', argumentsJson: '{}' },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    expect(confirmationEvents).toHaveLength(1);
    expect(confirmationEvents[0]).toMatchObject({ callId: 'call-1' });

    await harness.controller.confirmToolCall('call-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(3);
    expect(confirmationEvents).toHaveLength(2);
    expect(confirmationEvents[1]).toMatchObject({ callId: 'call-2' });
  });
});
