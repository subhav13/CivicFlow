import {
  createGeminiLiveClient,
  parseGeminiLiveMessage,
} from '../../src/assistant/gemini-live-client';
import type {
  EphemeralSessionCredential,
  LiveSocket,
} from '../../src/assistant/gemini-live-client';

class FakeSocket implements LiveSocket {
  sent: string[] = [];
  closed = false;
  private listeners = new Map<string, Set<(event: never) => void>>();

  constructor(private readonly autoSetupComplete = true) {}

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
    if (type === 'message' && this.autoSetupComplete) {
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

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class ThrowingSocket extends FakeSocket {
  send(): void {
    throw new Error('socket is closing');
  }
}

const credential: EphemeralSessionCredential = {
  accessToken: 'ephemeral-test-token',
  expiresAt: '2026-08-28T12:00:00.000Z',
};

function createClient(socket = new FakeSocket()) {
  const issueEphemeralSession = vi.fn(async () => credential);
  const connectSocket = vi.fn(async () => socket);
  const client = createGeminiLiveClient({
    issueEphemeralSession,
    connectSocket,
  });
  return { client, socket, issueEphemeralSession, connectSocket };
}

describe('Gemini Live protocol client', () => {
  it('waits for setupComplete before resolving or reporting connected', async () => {
    const socket = new FakeSocket(false);
    const { client } = createClient(socket);
    let resolved = false;
    const connectPromise = client.connect().then(() => {
      resolved = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(resolved).toBe(false);
    expect(client.isConnected()).toBe(false);

    socket.emit('message', {
      data: JSON.stringify({ setupComplete: {} }),
    } as never);
    await connectPromise;

    expect(client.isConnected()).toBe(true);
  });

  it('rejects a pre-setup close with bounded diagnostics and no raw reason', async () => {
    const socket = new FakeSocket(false);
    const { client } = createClient(socket);
    const events: unknown[] = [];
    client.subscribe((event) => events.push(event));
    const connectPromise = client.connect();

    await new Promise((resolve) => setTimeout(resolve, 0));
    socket.emit('close', {
      code: 1007,
      wasClean: false,
      reason: 'provider setup secret',
      reasonCategory: 'setup_schema',
    } as never);

    await expect(connectPromise).rejects.toThrow(
      'Assistant setup was rejected.',
    );
    expect(client.isConnected()).toBe(false);
    expect(events).toContainEqual({
      type: 'error',
      kind: 'protocol',
      message: 'Assistant setup was rejected.',
      diagnostic: {
        phase: 'setup_rejected',
        closeCode: 1007,
        wasClean: false,
        closeReasonCategory: 'setup_schema',
      },
    });
    expect(JSON.stringify(events)).not.toContain('provider setup secret');
  });

  it('waits for the close event after a pre-setup transport error', async () => {
    const socket = new FakeSocket(false);
    const { client } = createClient(socket);
    const connectPromise = client.connect();
    let settled = false;
    void connectPromise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    socket.emit('error', { error: new Error('transport detail') } as never);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(settled).toBe(false);

    socket.emit('close', {
      code: 1007,
      wasClean: true,
      reason: 'provider setup secret',
      reasonCategory: 'setup_schema',
    } as never);

    await expect(connectPromise).rejects.toThrow(
      'Assistant setup was rejected.',
    );
  });

  it('retains only bounded diagnostics for a close after setup acceptance', async () => {
    const socket = new FakeSocket();
    const { client } = createClient(socket);
    const events: unknown[] = [];
    client.subscribe((event) => events.push(event));

    await client.connect();
    socket.emit('close', {
      code: 1008,
      wasClean: false,
      reason: 'provider close secret',
      reasonCategory: 'auth',
    } as never);

    expect(events).toContainEqual({
      type: 'error',
      kind: 'network',
      message: 'Assistant connection closed.',
      diagnostic: {
        phase: 'remote_close_after_setup',
        closeCode: 1008,
        wasClean: false,
        closeReasonCategory: 'auth',
      },
    });
    expect(JSON.stringify(events)).not.toContain('provider close secret');
  });

  it('connects with a short-lived credential and no client-selected config', async () => {
    const { client, connectSocket, issueEphemeralSession } = createClient();

    await client.connect();

    expect(issueEphemeralSession).toHaveBeenCalledOnce();
    expect(connectSocket).toHaveBeenCalledWith(credential);
  });

  it('sends text as a complete client content turn', async () => {
    const { client, socket } = createClient();
    await client.connect();

    client.sendText('Read the current section.');

    expect(JSON.parse(socket.sent.at(-1) ?? '')).toEqual({
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: 'Read the current section.' }],
          },
        ],
        turnComplete: true,
      },
    });
  });

  it('sends raw 16 kHz PCM audio as realtime input using official audio object', async () => {
    const { client, socket } = createClient();
    await client.connect();

    client.sendAudio('base64-pcm', 'audio/pcm;rate=16000');

    expect(JSON.parse(socket.sent.at(-1) ?? '')).toEqual({
      realtimeInput: {
        audio: { mimeType: 'audio/pcm;rate=16000', data: 'base64-pcm' },
      },
    });
  });

  it('parses model text, audio, transcripts, and turn completion', () => {
    const events = parseGeminiLiveMessage(
      JSON.stringify({
        serverContent: {
          modelTurn: {
            parts: [
              { text: 'Hello' },
              {
                inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'audio' },
              },
            ],
          },
          outputTranscription: { text: 'Hello', finished: true },
          turnComplete: true,
        },
      }),
    );

    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'audio', mimeType: 'audio/pcm;rate=24000', data: 'audio' },
      { type: 'transcript', speaker: 'model', text: 'Hello', final: true },
      { type: 'turn_complete' },
    ]);
  });

  it('emits interruption separately and waits for the real turn boundary', () => {
    expect(
      parseGeminiLiveMessage(
        JSON.stringify({
          serverContent: {
            inputTranscription: { text: 'I need help' },
            outputTranscription: { text: 'I can help' },
            generationComplete: true,
            interrupted: true,
          },
        }),
      ),
    ).toEqual([
      {
        type: 'transcript',
        speaker: 'user',
        text: 'I need help',
        final: true,
      },
      {
        type: 'transcript',
        speaker: 'model',
        text: 'I can help',
        final: false,
      },
      { type: 'turn_interrupted' },
    ]);

    expect(
      parseGeminiLiveMessage(
        JSON.stringify({ serverContent: { turnComplete: true } }),
      ),
    ).toEqual([{ type: 'turn_complete' }]);
    expect(
      parseGeminiLiveMessage(
        JSON.stringify({ serverContent: { generationComplete: true } }),
      ),
    ).toEqual([]);
  });

  it('distinguishes interim input transcription from authoritative input transcription', () => {
    expect(
      parseGeminiLiveMessage(
        JSON.stringify({
          serverContent: {
            interimInputTranscription: { text: "I've confirmed" },
            inputTranscription: {
              text: "I've confirmed the details, add it",
            },
          },
        }),
      ),
    ).toEqual([
      {
        type: 'transcript',
        speaker: 'user',
        text: "I've confirmed",
        final: false,
      },
      {
        type: 'transcript',
        speaker: 'user',
        text: "I've confirmed the details, add it",
        final: true,
      },
    ]);
  });

  it('parses function calls with exact IDs and JSON arguments', () => {
    const events = parseGeminiLiveMessage(
      JSON.stringify({
        toolCall: {
          functionCalls: [
            {
              id: 'call-1',
              name: 'read_current_section',
              args: { section: 'income' },
            },
          ],
        },
      }),
    );

    expect(events).toEqual([
      {
        type: 'function_call',
        calls: [
          {
            callId: 'call-1',
            name: 'read_current_section',
            argumentsJson: '{"section":"income"}',
          },
        ],
      },
    ]);
  });

  it('emits sanitized protocol, quota, and network errors', async () => {
    const socket = new FakeSocket();
    const { client } = createClient(socket);
    const events: unknown[] = [];
    client.subscribe((event) => events.push(event));
    await client.connect();

    socket.emit('message', { data: '{bad' } as never);
    socket.emit('error', {
      error: new Error('provider secret detail'),
    } as never);
    socket.emit('close', { code: 1008 } as never);

    expect(events).toEqual([
      {
        type: 'error',
        kind: 'protocol',
        message: 'Received an invalid assistant event.',
      },
      {
        type: 'error',
        kind: 'network',
        message: 'Assistant connection failed.',
      },
    ]);
    expect(socket.closed).toBe(true);
    expect(socket.listenerCount('message')).toBe(0);
    expect(socket.listenerCount('error')).toBe(0);
    expect(socket.listenerCount('close')).toBe(0);
  });

  it('disconnects and removes every socket listener', async () => {
    const socket = new FakeSocket();
    const { client } = createClient(socket);
    await client.connect();

    expect(socket.listenerCount('message')).toBe(1);
    client.disconnect();

    expect(socket.closed).toBe(true);
    expect(socket.listenerCount('message')).toBe(0);
    expect(client.isConnected()).toBe(false);
  });

  it('closes a previous socket before replacing it during reconnect', async () => {
    const firstSocket = new FakeSocket();
    const secondSocket = new FakeSocket();
    const issueEphemeralSession = vi
      .fn<() => Promise<EphemeralSessionCredential>>()
      .mockResolvedValue(credential);
    const connectSocket = vi
      .fn<(credential: EphemeralSessionCredential) => Promise<LiveSocket>>()
      .mockResolvedValueOnce(firstSocket)
      .mockResolvedValueOnce(secondSocket);
    const client = createGeminiLiveClient({
      issueEphemeralSession,
      connectSocket,
    });

    await client.connect();
    await client.connect();

    expect(firstSocket.closed).toBe(true);
    expect(firstSocket.listenerCount('message')).toBe(0);
    expect(client.isConnected()).toBe(true);
  });

  it('marks the client disconnected on socket close and ignores later sends', async () => {
    const { client, socket } = createClient();
    await client.connect();

    socket.emit('close', { code: 1000 } as never);
    client.sendText('stale');

    expect(client.isConnected()).toBe(false);
    expect(socket.sent).toHaveLength(0);
  });

  it('closes and detaches the socket when it reports a transport error', async () => {
    const { client, socket } = createClient();
    await client.connect();

    socket.emit('error', { error: new Error('transport details') } as never);

    expect(client.isConnected()).toBe(false);
    expect(socket.closed).toBe(true);
    expect(socket.listenerCount('message')).toBe(0);
  });

  it('ignores a socket that resolves after disconnect', async () => {
    let resolveSocket!: (socket: LiveSocket) => void;
    const socketPromise = new Promise<LiveSocket>((resolve) => {
      resolveSocket = resolve;
    });
    const socket = new FakeSocket();
    const client = createGeminiLiveClient({
      issueEphemeralSession: vi.fn(async () => credential),
      connectSocket: vi.fn(async () => socketPromise),
    });

    const connectPromise = client.connect();
    client.disconnect();
    resolveSocket(socket);
    await connectPromise;

    expect(client.isConnected()).toBe(false);
    expect(socket.closed).toBe(true);
    expect(socket.listenerCount('message')).toBe(0);
  });

  it('rejects function calls without exact non-empty IDs and names', () => {
    const events = parseGeminiLiveMessage(
      JSON.stringify({
        toolCall: {
          functionCalls: [{ id: '', name: '', args: {} }],
        },
      }),
    );

    expect(events).toEqual([
      {
        type: 'error',
        kind: 'protocol',
        message: 'Received an invalid assistant event.',
      },
    ]);
  });

  it('sends tool responses without exposing model or system configuration', async () => {
    const { client, socket } = createClient();
    await client.connect();

    client.sendToolResponse({
      callId: 'call-1',
      name: 'read_current_section',
      response: { result: 'ok' },
    });

    const message = JSON.parse(socket.sent.at(-1) ?? '') as Record<
      string,
      unknown
    >;
    expect(message).toEqual({
      toolResponse: {
        functionResponses: [
          {
            id: 'call-1',
            name: 'read_current_section',
            response: { result: 'ok' },
          },
        ],
      },
    });
    expect(JSON.stringify(message)).not.toContain('instructions');
    expect(JSON.stringify(message)).not.toContain('tools');
    expect(JSON.stringify(message)).not.toContain('model');
  });

  it('reports whether tool-response delivery was accepted by the socket', async () => {
    const { client } = createClient();
    const response = {
      callId: 'call-disconnected',
      name: 'read_current_section',
      response: { result: 'ok' },
    };

    expect(client.sendToolResponse(response)).toBe(false);
    await client.connect();
    expect(client.sendToolResponse(response)).toBe(true);

    client.disconnect();
    expect(client.sendToolResponse(response)).toBe(false);
  });

  it('reports false when the active socket rejects a tool response', async () => {
    const socket = new ThrowingSocket();
    const { client } = createClient(socket);
    await client.connect();

    expect(
      client.sendToolResponse({
        callId: 'call-throwing',
        name: 'read_current_section',
        response: { result: 'ok' },
      }),
    ).toBe(false);
  });
});
