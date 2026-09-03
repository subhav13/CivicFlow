import { describe, expect, it, vi } from 'vitest';

import { createCivicFlowStore } from '../../src/application/store';
import { createAssistantRuntime } from '../../src/assistant/assistant-runtime';
import { createGeminiLiveClient } from '../../src/assistant/gemini-live-client';
import {
  classifyLiveCloseReason,
  createLiveSocketAdapter,
} from '../../src/assistant/gemini-live-socket-adapter';
import type { CurrentToolSurface } from '../../src/assistant/types';
import type { LiveSocket } from '../../src/assistant/gemini-live-client';
import { createDefaultModelContextPort } from '../../src/webmcp/in-process-model-context-port';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import { BrowserModelContextPort } from '../../src/webmcp/browser-model-context-port';
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

class FakeBrowserWebSocket {
  static readonly OPEN = 1;

  readonly url: string;
  readyState = 0;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  sent: string[] = [];
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
    queueMicrotask(() => {
      this.readyState = FakeBrowserWebSocket.OPEN;
      this.dispatch('open', {});
    });
  }

  send(message: string): void {
    this.sent.push(message);
    queueMicrotask(() => {
      const setupResponse = JSON.stringify({ setupComplete: {} });
      const blob = new Blob([setupResponse], {
        type: 'application/json',
      });
      Object.defineProperty(blob, 'text', {
        value: async () => setupResponse,
      });
      this.onmessage?.({
        data: blob,
      });
    });
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1000, wasClean: true });
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  private dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('local Live runtime', () => {
  it('decodes and buffers Blob setupComplete frames from the browser socket', async () => {
    vi.stubGlobal('WebSocket', FakeBrowserWebSocket);
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => []),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };
    const adapter = createLiveSocketAdapter({ surface });
    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    try {
      const connection = client.connect();
      const outcome = await Promise.race([
        connection.then(
          () => 'connected' as const,
          () => 'rejected' as const,
        ),
        new Promise<'timeout'>((resolve) =>
          setTimeout(() => resolve('timeout'), 100),
        ),
      ]);

      expect(outcome).toBe('connected');
      expect(client.isConnected()).toBe(true);
    } finally {
      client.disconnect();
      vi.unstubAllGlobals();
    }
  });

  it('classifies provider close reasons without retaining their text', () => {
    expect(
      classifyLiveCloseReason('Invalid JSON schema in function declaration'),
    ).toBe('setup_schema');
    expect(classifyLiveCloseReason('caller identity is not registered')).toBe(
      'auth',
    );
    expect(classifyLiveCloseReason('')).toBeUndefined();
  });

  it('connects to v1beta constrained WebSocket URL with ephemeral access token', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => []),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };

    let capturedUrl = '';
    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async (url) => {
        capturedUrl = url;
        return socket;
      },
    });

    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token-123',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    expect(capturedUrl).toContain(
      'v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=test-ephemeral-token-123',
    );
  });

  it('supplies the current bridged tool snapshot at connect time', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'read_current_section',
          title: 'Read section',
          description: 'Read the active section',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
      execute: vi.fn(async () => '{"ok":true}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });

    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    expect(surface.snapshot).toHaveBeenCalledOnce();
    expect(socket.sent.length).toBeGreaterThan(0);
    const setupMessage = JSON.parse(socket.sent[0]);
    expect(setupMessage.setup?.tools?.[0]?.functionDeclarations).toEqual([
      expect.objectContaining({ name: 'read_current_section' }),
    ]);
  });

  it('uses exactly the latest static/contextual declarations on one bounded replacement socket', async () => {
    const staticTools = [
      'get_application_progress',
      'navigate_to_section',
      'get_next_actions',
      'add_household_member',
      'add_income_source',
      'set_current_coverage',
      'list_uploaded_documents',
    ].map((name) => ({
      name,
      title: name,
      description: `Description for ${name}`,
      inputSchema: { type: 'object', properties: {} },
    }));
    const contextualTool = {
      name: 'update_income_source',
      title: 'Update income source',
      description: 'Update the selected income source',
      inputSchema: {
        type: 'object',
        properties: { employerName: { type: 'string' } },
      },
    };
    let snapshotIndex = 0;
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () =>
        snapshotIndex++ === 0 ? staticTools : [...staticTools, contextualTool],
      ),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };
    const firstSocket = new FakeLiveSocket();
    const secondSocket = new FakeLiveSocket();
    const createSocket = vi
      .fn<
        (
          url: string,
          credential: { accessToken: string; expiresAt: string },
        ) => LiveSocket
      >()
      .mockReturnValueOnce(firstSocket)
      .mockReturnValueOnce(secondSocket);
    const adapter = createLiveSocketAdapter({ surface, createSocket });
    const client = createGeminiLiveClient({
      issueEphemeralSession: vi
        .fn()
        .mockResolvedValueOnce({
          accessToken: 'first-token',
          expiresAt: '2026-08-29T12:00:00.000Z',
        })
        .mockResolvedValueOnce({
          accessToken: 'second-token',
          expiresAt: '2026-08-29T12:00:00.000Z',
        }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();
    await client.reconnect?.();

    const initialNames = JSON.parse(
      firstSocket.sent[0],
    ).setup.tools[0].functionDeclarations.map(
      (tool: { name: string }) => tool.name,
    );
    const replacementNames = JSON.parse(
      secondSocket.sent[0],
    ).setup.tools[0].functionDeclarations.map(
      (tool: { name: string }) => tool.name,
    );
    expect(initialNames).toEqual(staticTools.map((tool) => tool.name));
    expect(replacementNames).toEqual([
      ...staticTools.map((tool) => tool.name),
      'update_income_source',
    ]);
    expect(firstSocket.sent).toHaveLength(1);
    expect(secondSocket.sent).toHaveLength(1);
    expect(firstSocket.closed).toBe(true);
  });

  it('refreshes the connected runtime after the registry exposes a contextual tool', async () => {
    const store = createCivicFlowStore({
      storage: null,
      sessionStorage: null,
    });
    const port = new FakeModelContextPort();
    const firstSocket = new FakeLiveSocket();
    const secondSocket = new FakeLiveSocket();
    const createSocket = vi
      .fn<() => LiveSocket>()
      .mockReturnValueOnce(firstSocket)
      .mockReturnValueOnce(secondSocket);
    const runtime = createAssistantRuntime({
      store,
      port,
      createSocket,
      fetch: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              accessToken: 'runtime-token',
              expiresAt: '2026-08-29T12:00:00.000Z',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ) as unknown as typeof fetch,
    });

    await runtime.controller.connect();
    const initialNames = JSON.parse(
      firstSocket.sent[0],
    ).setup.tools[0].functionDeclarations.map(
      (tool: { name: string }) => tool.name,
    );
    expect(initialNames).toHaveLength(7);

    store.navigateToSection('review');
    await runtime.registryManager.waitForSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const replacementNames = JSON.parse(
      secondSocket.sent[0],
    ).setup.tools[0].functionDeclarations.map(
      (tool: { name: string }) => tool.name,
    );
    expect(replacementNames).toContain('review_application');
    expect(createSocket).toHaveBeenCalledTimes(2);
    runtime.dispose();
  });

  it('sends setup with models/ resource model, AUDIO modality, transcription configs, and no submit/attest tools', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'get_application_progress',
          title: 'Progress',
          description: 'Get progress',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'submit_application',
          title: 'Submit',
          description: 'Submit application',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'attest_application',
          title: 'Attest',
          description: 'Attest application',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
      execute: vi.fn(async () => '{"ok":true}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });

    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    const setupMessage = JSON.parse(socket.sent[0]);
    expect(setupMessage.setup?.model).toBe(
      'models/gemini-3.1-flash-live-preview',
    );
    expect(setupMessage.setup?.generationConfig?.responseModalities).toEqual([
      'AUDIO',
    ]);
    expect(setupMessage.setup?.inputAudioTranscription).toBeDefined();
    expect(setupMessage.setup?.outputAudioTranscription).toBeDefined();

    const fnDeclarations: Array<{ name: string }> =
      setupMessage.setup?.tools?.[0]?.functionDeclarations ?? [];
    const names = fnDeclarations.map((fn) => fn.name);
    expect(names).toContain('get_application_progress');
    expect(names).not.toContain('submit_application');
    expect(names).not.toContain('attest_application');

    const progressDeclaration = fnDeclarations.find(
      (fn) => fn.name === 'get_application_progress',
    ) as Record<string, unknown> | undefined;
    expect(progressDeclaration).toHaveProperty('parametersJsonSchema');
    expect(progressDeclaration).not.toHaveProperty('parameters');
  });

  it('instructs Live to collect complete tool inputs before invoking tools', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'add_household_member',
          title: 'Add household member',
          description: 'Add a household member',
          inputSchema: {
            type: 'object',
            required: ['firstName', 'ageYears', 'relationship'],
            properties: {
              firstName: { type: 'string' },
              ageYears: { type: 'integer' },
              relationship: { type: 'string' },
            },
          },
        },
      ]),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });
    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    const setupMessage = JSON.parse(socket.sent[0]);
    const instructions = setupMessage.setup?.systemInstruction?.parts?.[0]
      ?.text as string;
    expect(instructions).toContain(
      'Ask for missing required inputs one at a time',
    );
    expect(instructions).toContain(
      'Do not guess, infer, default, or fabricate values',
    );
    expect(instructions).toContain(
      'Do not invoke a tool until all required inputs are explicit',
    );
    expect(instructions).toContain(
      'invoke the tool as a proposal without asking for spoken confirmation',
    );
    expect(instructions).toContain(
      'first speak one concise complete review of every field and value in your normal Live voice',
    );
    expect(instructions).toContain(
      'tell the user the draft is ready for review',
    );
    expect(instructions).toContain(
      'then immediately invoke the tool as a proposal without asking for spoken confirmation or waiting for a spoken reply',
    );
    expect(
      instructions.indexOf('first speak one concise complete review'),
    ).toBeLessThan(
      instructions.indexOf('then immediately invoke the tool as a proposal'),
    );
    expect(instructions).toContain(
      'The portal will pause the proposal and obtain confirmation through its UI before execution',
    );
    expect(instructions).toContain(
      'The navigate_to_section tool is navigation-only: invoke it directly without confirmation, draft cards, or draft-review narration',
    );
    expect(instructions).toContain(
      'add_income_source asks for missing fields one at a time in this order: member, employer or source, amount in dollars, frequency',
    );
    expect(instructions).toContain(
      'weekly, every two weeks, monthly, annually',
    );
    expect(instructions).toContain(
      'retain prior explicit answers when a user provides a correction',
    );
    expect(instructions).toContain(
      'Never claim success before receiving a tool response with ok:true',
    );
    expect(instructions).toContain('What would you like to do next?');
    expect(instructions).not.toContain(
      "wait for the user's explicit confirmation before invoking",
    );
  });

  it('grounds declarations with bounded schema metadata and deterministic field ordering', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'add_household_member',
          title: 'Add household member',
          description: 'Add a household member',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'firstName',
              'ageYears',
              'relationship',
              'applyingForCoverage',
            ],
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              ageYears: { type: 'integer' },
              relationship: { type: 'string' },
              applyingForCoverage: { type: 'boolean' },
            },
          },
        },
      ]),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });
    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    const declaration = JSON.parse(socket.sent[0]).setup.tools[0]
      .functionDeclarations[0] as Record<string, unknown>;
    expect(declaration.description).toContain(
      'Allowed fields: firstName, lastName, ageYears, relationship, applyingForCoverage',
    );
    expect(declaration.description).toContain(
      'Required fields: firstName, ageYears, relationship, applyingForCoverage',
    );
    expect(declaration.parametersJsonSchema).toMatchObject({
      propertyOrdering: [
        'firstName',
        'lastName',
        'ageYears',
        'relationship',
        'applyingForCoverage',
      ],
    });
  });

  it('normalizes TypeBox JSON Schema keywords for the Live provider', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'navigate_to_section',
          title: 'Navigate',
          description: 'Navigate to a section',
          inputSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['section', 'memberNames'],
            properties: {
              section: {
                anyOf: [
                  { const: 'about', type: 'string' },
                  { const: 'review', type: 'string' },
                ],
              },
              memberNames: {
                type: 'array',
                uniqueItems: true,
                minItems: 1,
                items: { type: 'string' },
              },
            },
          },
        },
      ]),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });
    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();

    const setupMessage = JSON.parse(socket.sent[0]);
    const declaration = setupMessage.setup.tools[0].functionDeclarations[0];
    expect(declaration.parametersJsonSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['section', 'memberNames'],
      properties: {
        section: {
          enum: ['about', 'review'],
          type: 'string',
        },
        memberNames: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
      },
      propertyOrdering: ['section', 'memberNames'],
    });
    expect(JSON.stringify(declaration.parametersJsonSchema)).not.toContain(
      'const',
    );
    expect(JSON.stringify(declaration.parametersJsonSchema)).not.toContain(
      'uniqueItems',
    );
  });

  it('uses the existing event and tool-response contract', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => [
        {
          name: 'get_application_progress',
          title: 'Progress',
          description: 'Get progress',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
      execute: vi.fn(async () => '{"progress":80}'),
      subscribe: vi.fn(() => () => {}),
    };

    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => socket,
    });

    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    const receivedEvents: unknown[] = [];
    client.subscribe((event) => receivedEvents.push(event));

    await client.connect();

    // Server sends text
    socket.emit('message', {
      data: JSON.stringify({
        serverContent: {
          modelTurn: {
            parts: [{ text: 'Hello, how can I assist?' }],
          },
          turnComplete: true,
        },
      }),
    } as never);

    expect(receivedEvents).toContainEqual({
      type: 'text',
      text: 'Hello, how can I assist?',
    });
    expect(receivedEvents).toContainEqual({ type: 'turn_complete' });

    // Client sends tool response
    client.sendToolResponse({
      callId: 'call-prog-1',
      name: 'get_application_progress',
      response: { progress: 80 },
    });

    const lastSent = JSON.parse(socket.sent.at(-1) ?? '{}');
    expect(lastSent).toEqual({
      toolResponse: {
        functionResponses: [
          {
            id: 'call-prog-1',
            name: 'get_application_progress',
            response: { progress: 80 },
          },
        ],
      },
    });
  });

  it('does not reconnect after disconnect or quota error', async () => {
    const surface: CurrentToolSurface = {
      snapshot: vi.fn(async () => []),
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => () => {}),
    };

    let socketCount = 0;
    const socket = new FakeLiveSocket();
    const adapter = createLiveSocketAdapter({
      surface,
      createSocket: async () => {
        socketCount++;
        return socket;
      },
    });

    const client = createGeminiLiveClient({
      issueEphemeralSession: async () => ({
        accessToken: 'test-ephemeral-token',
        expiresAt: '2026-08-29T12:00:00.000Z',
      }),
      connectSocket: (credential) => adapter.connectSocket(credential),
    });

    await client.connect();
    expect(socketCount).toBe(1);

    // Disconnect
    client.disconnect();
    expect(client.isConnected()).toBe(false);
    expect(socketCount).toBe(1);

    // Connect again, then trigger quota error
    await client.connect();
    expect(socketCount).toBe(2);

    const receivedErrors: unknown[] = [];
    client.subscribe((event) => {
      if (event.type === 'error') receivedErrors.push(event);
    });

    socket.emit('message', {
      data: JSON.stringify({
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded',
        },
      }),
    } as never);

    expect(receivedErrors).toContainEqual(
      expect.objectContaining({
        type: 'error',
        kind: 'quota',
      }),
    );
    // Verify no automatic reconnection happened
    expect(socketCount).toBe(2);
  });

  it('awaits an unstarted registry manager on connect without render-time side effects', async () => {
    const store = createCivicFlowStore();
    const port = createDefaultModelContextPort();
    const registerSpy = vi.spyOn(port, 'registerTool');

    const fakeSocket = new FakeLiveSocket();
    const runtime = createAssistantRuntime({
      store,
      port,
      createSocket: async () => fakeSocket,
      fetch: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              accessToken: 'token-test',
              expiresAt: '2026-08-29T12:00:00.000Z',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ) as unknown as typeof fetch,
    });

    // Construction must NOT trigger registerTool calls synchronously or eagerly
    expect(registerSpy).not.toHaveBeenCalled();

    // Connecting controller triggers sync on-demand
    await runtime.controller.connect();

    expect(registerSpy).toHaveBeenCalled();
    const registeredTools = await port.getTools();
    expect(registeredTools.length).toBeGreaterThan(0);

    runtime.dispose();
  });

  it('issues a session and connects when browser toolchange observation is unavailable', async () => {
    const store = createCivicFlowStore({
      storage: null,
      sessionStorage: null,
    });
    const registeredTools = new Map<string, Record<string, unknown>>();
    const browserContext = {
      registerTool: vi.fn(async (definition: Record<string, unknown>) => {
        const tool = { ...definition };
        delete tool.execute;
        registeredTools.set(String(tool.name), tool);
      }),
      getTools: vi.fn(async () => Array.from(registeredTools.values())),
      executeTool: vi.fn(async () => '{}'),
    };
    Object.defineProperty(document, 'modelContext', {
      value: browserContext,
      configurable: true,
      writable: true,
    });

    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            accessToken: 'degraded-observation-token',
            expiresAt: '2026-08-30T12:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof globalThis.fetch;
    const socket = new FakeLiveSocket();
    const runtime = createAssistantRuntime({
      store,
      port: new BrowserModelContextPort(),
      createSocket: async () => socket,
      fetch,
    });

    try {
      await runtime.controller.connect();

      expect(fetch).toHaveBeenCalledOnce();
      expect(socket.sent).toHaveLength(1);
      expect(runtime.controller.getState()).toEqual({ status: 'connected' });
    } finally {
      runtime.dispose();
      Object.defineProperty(document, 'modelContext', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
  });
});
