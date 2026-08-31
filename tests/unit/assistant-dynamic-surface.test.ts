import { describe, expect, it, vi } from 'vitest';

import {
  createAssistantController,
  type MicrophoneStream,
} from '../../src/assistant/assistant-controller';
import type {
  GeminiLiveClient,
  GeminiLiveEvent,
} from '../../src/assistant/gemini-live-client';
import type { CurrentToolSurface } from '../../src/assistant/types';
import type { RegisteredToolRef } from '../../src/webmcp/model-context-port';

const staticTools: RegisteredToolRef[] = [
  {
    name: 'get_application_progress',
    title: 'Get application progress',
    description: 'Read application progress',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'navigate_to_section',
    title: 'Navigate to section',
    description: 'Navigate to a section',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_next_actions',
    title: 'Get next actions',
    description: 'Read next actions',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_household_member',
    title: 'Add household member',
    description: 'Add a household member',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_income_source',
    title: 'Add income source',
    description: 'Add an income source',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'set_current_coverage',
    title: 'Set current coverage',
    description: 'Set current coverage',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_uploaded_documents',
    title: 'List uploaded documents',
    description: 'Read uploaded documents',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
];

const updateIncomeTool: RegisteredToolRef = {
  name: 'update_income_source',
  title: 'Update income source',
  description: 'Update the selected income source',
  inputSchema: {
    type: 'object',
    properties: { employerName: { type: 'string' } },
  },
};

class DynamicSurface implements CurrentToolSurface {
  private readonly listeners = new Set<() => void>();
  private tools: RegisteredToolRef[];

  constructor(initialTools: RegisteredToolRef[]) {
    this.tools = initialTools;
  }

  readonly snapshot = vi.fn(async () => this.tools);
  readonly execute = vi.fn(async () => '{}');

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTools(tools: RegisteredToolRef[]): void {
    this.tools = tools;
  }

  notifyToolChange(): void {
    for (const listener of this.listeners) listener();
  }
}

class FakeClient implements GeminiLiveClient {
  private readonly listeners = new Set<(event: GeminiLiveEvent) => void>();
  private connected = false;

  readonly connect = vi.fn(async () => {
    this.connected = true;
  });
  readonly reconnect = vi.fn(async () => {
    this.connected = true;
  });
  readonly disconnect = vi.fn(() => {
    this.connected = false;
  });
  readonly sendText = vi.fn();
  readonly sendAudio = vi.fn();
  readonly sendToolResponse = vi.fn(() => true);

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

  setTransportConnected(connected: boolean): void {
    this.connected = connected;
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

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function makeHarness() {
  const surface = new DynamicSurface(staticTools);
  const client = new FakeClient();
  const bridge = {
    listFunctions: vi.fn(async () => []),
    executeToolCall: vi.fn(async () => ({
      kind: 'result' as const,
      callId: 'call-1',
      result: '{}',
    })),
  };
  const controller = createAssistantController({
    client,
    toolBridge: bridge,
    currentToolSurface: surface,
  });
  return { surface, client, bridge, controller };
}

describe('assistant dynamic WebMCP surface continuity', () => {
  it('refreshes once for contextual appearance and once for contextual removal', async () => {
    const harness = makeHarness();
    await harness.controller.connect();

    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    harness.surface.notifyToolChange();
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();

    harness.surface.setTools(staticTools);
    harness.surface.notifyToolChange();
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledTimes(2);
    harness.controller.dispose();
  });

  it('observes a context revision triggered by the connected-state consumer', async () => {
    const harness = makeHarness();
    let changed = false;
    harness.controller.subscribe((event) => {
      if (
        event.type !== 'state' ||
        event.state.status !== 'connected' ||
        changed
      ) {
        return;
      }
      changed = true;
      harness.surface.setTools([...staticTools, updateIncomeTool]);
      harness.surface.notifyToolChange();
    });

    await harness.controller.connect();
    await flush();
    await flush();

    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('observes a surface revision that occurs while the client is connecting', async () => {
    const surface = new DynamicSurface(staticTools);
    const client = new FakeClient();
    client.connect.mockImplementationOnce(async () => {
      await Promise.resolve();
      surface.setTools([...staticTools, updateIncomeTool]);
      surface.notifyToolChange();
      client.setTransportConnected(true);
    });
    const bridge = {
      listFunctions: vi.fn(async () => []),
      executeToolCall: vi.fn(async () => ({
        kind: 'result' as const,
        callId: 'call-1',
        result: '{}',
      })),
    };
    const controller = createAssistantController({
      client,
      toolBridge: bridge,
      currentToolSurface: surface,
    });

    await controller.connect();
    await flush();
    await flush();

    expect(client.reconnect).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('defers a surface revision after outbound text until turn_complete', async () => {
    const harness = makeHarness();
    await harness.controller.connect();

    harness.controller.sendText('Read my progress');
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    await flush();

    expect(harness.client.sendText).toHaveBeenCalledWith('Read my progress');
    expect(harness.client.reconnect).not.toHaveBeenCalled();

    harness.client.emit({ type: 'turn_complete' });
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('defers a surface revision after outbound audio until turn_complete', async () => {
    const harness = makeHarness();
    const stream = new FakeStream();
    const controller = createAssistantController({
      client: harness.client,
      toolBridge: harness.bridge,
      currentToolSurface: harness.surface,
      microphone: { requestStream: vi.fn(async () => stream) },
    });
    await controller.connect();
    await controller.startMicrophone();

    stream.emit('pcm', 'audio/pcm;rate=16000');
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    await flush();

    expect(harness.client.sendAudio).toHaveBeenCalledWith(
      'pcm',
      'audio/pcm;rate=16000',
    );
    expect(harness.client.reconnect).not.toHaveBeenCalled();

    harness.client.emit({ type: 'turn_complete' });
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('does not hold a critical section for a suppressed outbound send', async () => {
    const harness = makeHarness();
    await harness.controller.connect();
    harness.client.disconnect();

    harness.controller.sendText('This transport is closed');
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    await flush();

    expect(harness.client.sendText).not.toHaveBeenCalled();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('does not connect after disconnect cancels pre-connect registry synchronization', async () => {
    const harness = makeHarness();
    const synchronization = deferred<void>();
    const waitForToolSurface = vi.fn(() => synchronization.promise);
    const controller = createAssistantController({
      client: harness.client,
      toolBridge: harness.bridge,
      currentToolSurface: harness.surface,
      waitForToolSurface,
    });

    const connecting = controller.connect();
    await Promise.resolve();
    expect(waitForToolSurface).toHaveBeenCalledOnce();

    controller.disconnect();
    synchronization.resolve();
    await connecting;

    expect(harness.client.connect).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle' });
    controller.dispose();
  });

  it('does not connect after dispose cancels freshness baseline startup', async () => {
    const harness = makeHarness();
    const baseline = deferred<RegisteredToolRef[]>();
    harness.surface.snapshot.mockImplementationOnce(() => baseline.promise);
    const controller = createAssistantController({
      client: harness.client,
      toolBridge: harness.bridge,
      currentToolSurface: harness.surface,
    });

    const connecting = controller.connect();
    await Promise.resolve();
    controller.dispose();
    baseline.resolve(staticTools);
    await connecting;

    expect(harness.client.connect).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('prevents an older retry preflight from opening a stale connection', async () => {
    const harness = makeHarness();
    const firstSynchronization = deferred<void>();
    const waitForToolSurface = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => firstSynchronization.promise)
      .mockResolvedValue(undefined);
    const controller = createAssistantController({
      client: harness.client,
      toolBridge: harness.bridge,
      currentToolSurface: harness.surface,
      waitForToolSurface,
    });

    const firstConnect = controller.connect();
    await Promise.resolve();
    const retry = controller.retry();
    await retry;
    firstSynchronization.resolve();
    await firstConnect;

    expect(waitForToolSurface).toHaveBeenCalledTimes(2);
    expect(harness.client.connect).toHaveBeenCalledOnce();
    expect(controller.getState()).toEqual({ status: 'connected' });
    controller.dispose();
  });

  it('defers refresh while a confirmation and mutation are active until the provider turn ends', async () => {
    const harness = makeHarness();
    harness.bridge.executeToolCall.mockResolvedValueOnce({
      kind: 'confirmation_required',
      callId: 'call-1',
      toolName: 'add_income_source',
      message: 'Confirm the income change.',
      draft: { title: 'Income', fields: [] },
    });
    harness.bridge.executeToolCall.mockResolvedValueOnce({
      kind: 'result',
      callId: 'call-1',
      result: '{}',
    });
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      ],
    });
    await flush();
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    expect(harness.client.reconnect).not.toHaveBeenCalled();

    await harness.controller.confirmToolCall('call-1');
    harness.client.emit({ type: 'turn_complete' });
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('does not replace the socket while a confirmed mutation is still applying', async () => {
    const harness = makeHarness();
    let releaseMutation!: () => void;
    const mutationComplete = new Promise<void>((resolve) => {
      releaseMutation = resolve;
    });
    harness.bridge.executeToolCall
      .mockResolvedValueOnce({
        kind: 'confirmation_required',
        callId: 'call-apply',
        toolName: 'add_income_source',
        message: 'Confirm the income change.',
        draft: { title: 'Income', fields: [] },
      })
      .mockImplementationOnce(async () => {
        await mutationComplete;
        return { kind: 'result', callId: 'call-apply', result: '{}' };
      });
    await harness.controller.connect();
    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-apply',
          name: 'add_income_source',
          argumentsJson: '{}',
        },
      ],
    });
    await flush();

    const confirmation = harness.controller.confirmToolCall('call-apply');
    await Promise.resolve();
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    harness.client.emit({ type: 'turn_complete' });
    await flush();
    expect(harness.client.reconnect).not.toHaveBeenCalled();

    releaseMutation();
    await confirmation;
    await flush();
    await flush();
    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('stops and resumes the microphone only after replacement setup completes', async () => {
    const harness = makeHarness();
    const firstStream = new FakeStream();
    const secondStream = new FakeStream();
    let streamIndex = 0;
    const requestStream = vi.fn(async () =>
      streamIndex++ === 0 ? firstStream : secondStream,
    );
    const controller = createAssistantController({
      client: harness.client,
      toolBridge: harness.bridge,
      currentToolSurface: harness.surface,
      microphone: { requestStream },
      audioOutput: { play: vi.fn(), stop: vi.fn() },
    });
    await controller.connect();
    await controller.startMicrophone();

    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    await flush();

    expect(firstStream.track.stop).toHaveBeenCalledOnce();
    expect(requestStream).toHaveBeenCalledTimes(2);
    expect(secondStream.track.stop).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('turns one refresh failure into a recoverable error without looping', async () => {
    const harness = makeHarness();
    harness.client.reconnect.mockRejectedValueOnce(new Error('provider quota'));
    await harness.controller.connect();
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    await flush();
    harness.surface.notifyToolChange();
    await flush();

    expect(harness.client.reconnect).toHaveBeenCalledOnce();
    expect(harness.controller.getState()).toEqual({
      status: 'error',
      message: 'Assistant session refresh failed. Please reconnect.',
      recoverable: true,
    });
    harness.controller.dispose();
  });

  it('does not refresh after controller cleanup', async () => {
    const harness = makeHarness();
    await harness.controller.connect();
    harness.controller.dispose();
    harness.surface.setTools([...staticTools, updateIncomeTool]);
    harness.surface.notifyToolChange();
    await flush();
    expect(harness.client.reconnect).not.toHaveBeenCalled();
  });
});
