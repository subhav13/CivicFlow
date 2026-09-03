import { describe, expect, it, vi } from 'vitest';

import { createCivicFlowStore } from '../../src/application/store';
import { createAssistantController } from '../../src/assistant/assistant-controller';
import { createAssistantRuntime } from '../../src/assistant/assistant-runtime';
import {
  createGeminiLiveClient,
  type EphemeralSessionCredential,
  type LiveSocket,
} from '../../src/assistant/gemini-live-client';
import type { GeminiToolBridge } from '../../src/assistant/gemini-tool-bridge';

const placeholderAccessPin = 'placeholder-access-pin';
const credential: EphemeralSessionCredential = {
  accessToken: 'ephemeral-test-token',
  expiresAt: '2026-08-28T12:00:00.000Z',
};

class FakeLiveSocket implements LiveSocket {
  sent: string[] = [];
  closed = false;
  private listeners = new Map<string, Set<(event: never) => void>>();

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {
    this.closed = true;
  }

  addEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    if (type === 'message') {
      queueMicrotask(() =>
        this.emit('message', {
          data: JSON.stringify({ setupComplete: {} }),
        } as never),
      );
    }
  }

  removeEventListener(type: string, listener: (event: never) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: never): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('Phase 8 assistant access-value path', () => {
  it('sends the in-memory access pin only in the session request body', async () => {
    const bodies: unknown[] = [];
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response(JSON.stringify(credential), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const store = createCivicFlowStore({
      storage: null,
      sessionStorage: null,
    });
    const runtime = createAssistantRuntime({
      store,
      fetch: fetchFn as unknown as typeof fetch,
      createSocket: async () => new FakeLiveSocket(),
    });

    await runtime.controller.connect({ accessPin: placeholderAccessPin });

    expect(bodies).toEqual([{ accessPin: placeholderAccessPin }]);
    runtime.dispose();
  });

  it('reuses the in-memory pin for an internal reconnect and clears it after disconnect', async () => {
    const issueEphemeralSession = vi.fn(async () => credential);
    const firstSocket = new FakeLiveSocket();
    const secondSocket = new FakeLiveSocket();
    const thirdSocket = new FakeLiveSocket();
    const connectSocket = vi
      .fn<() => Promise<LiveSocket>>()
      .mockResolvedValueOnce(firstSocket)
      .mockResolvedValueOnce(secondSocket)
      .mockResolvedValueOnce(thirdSocket);
    const client = createGeminiLiveClient({
      issueEphemeralSession,
      connectSocket,
    });

    await client.connect(undefined, placeholderAccessPin);
    await client.reconnect?.();
    client.disconnect();
    await client.connect();

    expect(issueEphemeralSession.mock.calls[0]?.[1]).toBe(placeholderAccessPin);
    expect(issueEphemeralSession.mock.calls[1]?.[1]).toBe(placeholderAccessPin);
    expect(issueEphemeralSession.mock.calls[2]?.[1]).toBeUndefined();
  });

  it('clears the retained pin after a failed connect and does not echo it', async () => {
    const issueEphemeralSession = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Assistant session authentication failed.'),
      )
      .mockResolvedValue(credential);
    const client = createGeminiLiveClient({
      issueEphemeralSession,
      connectSocket: async () => new FakeLiveSocket(),
    });

    await expect(
      client.connect(undefined, placeholderAccessPin),
    ).rejects.toThrow('Assistant session authentication failed.');
    await client.connect();

    expect(issueEphemeralSession.mock.calls[1]?.[1]).toBeUndefined();
    expect(String(issueEphemeralSession.mock.results[0]?.reason)).not.toContain(
      placeholderAccessPin,
    );
  });

  it('maps a 401 session response to a generic authentication error without the pin', async () => {
    const fetchFn = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: 'Assistant session authentication failed.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const store = createCivicFlowStore({
      storage: null,
      sessionStorage: null,
    });
    const runtime = createAssistantRuntime({
      store,
      fetch: fetchFn as unknown as typeof fetch,
      createSocket: async () => new FakeLiveSocket(),
    });

    await runtime.controller.connect({ accessPin: placeholderAccessPin });

    expect(runtime.controller.getState()).toEqual({
      status: 'error',
      message: 'Live access was not accepted. Try again.',
      recoverable: true,
    });
    expect(JSON.stringify(fetchFn.mock.calls)).not.toContain(
      'Live access was not accepted',
    );
    runtime.dispose();
  });

  it('does not start the microphone while connecting with an access pin', async () => {
    const client = createGeminiLiveClient({
      issueEphemeralSession: vi.fn(async () => credential),
      connectSocket: async () => new FakeLiveSocket(),
    });
    const requestStream = vi.fn(async () => ({
      getTracks: () => [],
      subscribe: () => () => {},
    }));
    const controller = createAssistantController({
      client,
      toolBridge: {
        listFunctions: async () => [],
        executeToolCall: async () => ({
          kind: 'error',
          message: 'unused',
        }),
      } as unknown as GeminiToolBridge,
      microphone: { requestStream },
    });

    await controller.connect({ accessPin: placeholderAccessPin });

    expect(controller.getState().status).toBe('connected');
    expect(requestStream).not.toHaveBeenCalled();
    controller.dispose();
  });
});
