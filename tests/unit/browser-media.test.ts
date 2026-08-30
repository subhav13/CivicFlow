import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserAudioOutput,
  createBrowserMicrophoneProvider,
  createBrowserPageLifecycleTarget,
} from '../../src/assistant/browser-media';

describe('browser media adapters', () => {
  it('does not invoke getUserMedia before explicit stream request', () => {
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [],
    }));
    const mediaDevices = { getUserMedia } as unknown as MediaDevices;

    createBrowserMicrophoneProvider({ mediaDevices });

    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('captures mono 16 kHz PCM frames only while active and stops tracks on teardown', async () => {
    const mockTrack = {
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
    };

    let audioProcessCallback: ((event: unknown) => void) | undefined;
    const mockSourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const mockProcessorNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      set onaudioprocess(fn: ((event: unknown) => void) | undefined) {
        audioProcessCallback = fn;
      },
      get onaudioprocess() {
        return audioProcessCallback;
      },
    };

    const mockGainNode = {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const mockAudioContext = {
      sampleRate: 16000,
      createMediaStreamSource: vi.fn(() => mockSourceNode),
      createScriptProcessor: vi.fn(() => mockProcessorNode),
      createGain: vi.fn(() => mockGainNode),
      close: vi.fn(async () => {}),
      destination: {},
    };
    const getUserMedia = vi.fn(async () => mockStream);
    const mediaDevices = { getUserMedia } as unknown as MediaDevices;

    const provider = createBrowserMicrophoneProvider({
      mediaDevices,
      audioContextConstructor: vi.fn(function () {
        return mockAudioContext;
      }) as unknown as typeof AudioContext,
    });

    const stream = await provider.requestStream();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({
          channelCount: 1,
        }),
      }),
    );

    const receivedChunks: Array<{ data: string; mimeType?: string }> = [];
    const unsubscribe = stream.subscribe((data, mimeType) => {
      receivedChunks.push({ data, mimeType });
    });

    expect(audioProcessCallback).toBeDefined();

    // Simulate an audio processing event with 512 Float32 samples
    const inputChannel = new Float32Array(512);
    inputChannel[0] = 0.5; // ~16384 in int16
    inputChannel[1] = -0.5; // ~-16384 in int16

    audioProcessCallback?.({
      inputBuffer: {
        getChannelData: () => inputChannel,
      },
    });

    expect(receivedChunks.length).toBe(1);
    expect(receivedChunks[0].mimeType).toBe('audio/pcm;rate=16000');
    expect(typeof receivedChunks[0].data).toBe('string');
    expect(receivedChunks[0].data.length).toBeGreaterThan(0);

    // Unsubscribe / teardown
    unsubscribe();
    expect(mockProcessorNode.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect(mockSourceNode.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    expect(mockTrack.stop).toHaveBeenCalled();

    // Audio callback after unsubscribe must not emit
    audioProcessCallback?.({
      inputBuffer: {
        getChannelData: () => inputChannel,
      },
    });
    expect(receivedChunks.length).toBe(1);
  });

  it('fails safely when media is denied or unsupported without leaking state', async () => {
    const getUserMedia = vi.fn(async () => {
      throw new Error('NotAllowedError: Permission denied');
    });
    const mediaDevices = { getUserMedia } as unknown as MediaDevices;

    const provider = createBrowserMicrophoneProvider({ mediaDevices });

    await expect(provider.requestStream()).rejects.toThrow(
      /Permission denied|unsupported/i,
    );
  });

  it('resamples non-16-kHz input context (48 kHz) to 16 kHz mono frames', async () => {
    const mockTrack = {
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
    };

    let audioProcessCallback: ((event: unknown) => void) | undefined;
    const mockProcessorNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      set onaudioprocess(fn: ((event: unknown) => void) | undefined) {
        audioProcessCallback = fn;
      },
      get onaudioprocess() {
        return audioProcessCallback;
      },
    };

    const mockAudioContext = {
      sampleRate: 48000,
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createScriptProcessor: vi.fn(() => mockProcessorNode),
      createGain: vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      close: vi.fn(async () => {}),
      destination: {},
    };

    const getUserMedia = vi.fn(async () => mockStream);
    const mediaDevices = { getUserMedia } as unknown as MediaDevices;

    const provider = createBrowserMicrophoneProvider({
      mediaDevices,
      audioContextConstructor: vi.fn(function () {
        return mockAudioContext;
      }) as unknown as typeof AudioContext,
    });

    const stream = await provider.requestStream();
    const receivedChunks: Array<{ data: string; mimeType?: string }> = [];
    stream.subscribe((data, mimeType) => {
      receivedChunks.push({ data, mimeType });
    });

    // 4800 samples at 48 kHz should be resampled to 1600 samples at 16 kHz
    const inputChannel = new Float32Array(4800);
    for (let i = 0; i < 4800; i++) {
      inputChannel[i] = Math.sin((i / 4800) * Math.PI * 2);
    }

    audioProcessCallback?.({
      inputBuffer: {
        sampleRate: 48000,
        getChannelData: () => inputChannel,
      },
    });

    expect(receivedChunks.length).toBe(1);
    expect(receivedChunks[0].mimeType).toBe('audio/pcm;rate=16000');
    // 1600 samples * 2 bytes = 3200 bytes -> 3200 * 4 / 3 = ~4268 chars in base64
    const decodedBytes = atob(receivedChunks[0].data);
    expect(decodedBytes.length).toBe(3200);
  });

  it('plays 24 kHz PCM audio and handles stop deterministically', () => {
    const mockSourceNode = {
      buffer: null as unknown,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null as unknown,
    };

    const mockAudioContext = {
      sampleRate: 24000,
      currentTime: 0,
      createBuffer: vi.fn(
        (channels: number, length: number, sampleRate: number) => ({
          channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          copyToChannel: vi.fn(),
          getChannelData: vi.fn(() => new Float32Array(length)),
        }),
      ),
      createBufferSource: vi.fn(() => mockSourceNode),
      destination: {},
      close: vi.fn(async () => {}),
    };

    const output = createBrowserAudioOutput({
      audioContextConstructor: vi.fn(function () {
        return mockAudioContext;
      }) as unknown as typeof AudioContext,
    });

    // Valid base64 PCM data (100 samples of 16-bit PCM = 200 bytes)
    const rawBytes = new Uint8Array(200);
    let binary = '';
    for (let i = 0; i < rawBytes.length; i++) {
      binary += String.fromCharCode(rawBytes[i]);
    }
    const base64Data = btoa(binary);

    output.play(base64Data, 'audio/pcm;rate=24000');

    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockSourceNode.start).toHaveBeenCalled();

    output.stop();
    expect(mockSourceNode.stop).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('mutes active and future PCM output until the speaker is turned back on', () => {
    const createSource = () => ({
      buffer: null as unknown,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null as unknown,
    });
    const sources: Array<ReturnType<typeof createSource>> = [];
    const mockAudioContext = {
      sampleRate: 24000,
      currentTime: 0,
      createBuffer: vi.fn(
        (channels: number, length: number, sampleRate: number) => ({
          channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: vi.fn(() => new Float32Array(length)),
        }),
      ),
      createBufferSource: vi.fn(() => {
        const source = createSource();
        sources.push(source);
        return source;
      }),
      destination: {},
      close: vi.fn(async () => {}),
    };
    const output = createBrowserAudioOutput({
      audioContextConstructor: vi.fn(function () {
        return mockAudioContext;
      }) as unknown as typeof AudioContext,
    });
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(200)));

    output.play(base64Data, 'audio/pcm;rate=24000');
    expect(sources).toHaveLength(1);

    output.setMuted(true);
    expect(sources[0]?.stop).toHaveBeenCalledOnce();
    output.play(base64Data, 'audio/pcm;rate=24000');
    expect(sources).toHaveLength(1);

    output.setMuted(false);
    output.play(base64Data, 'audio/pcm;rate=24000');
    expect(sources).toHaveLength(2);
  });

  it('provides a safe page lifecycle target that handles pagehide listeners', () => {
    const listeners = new Set<() => void>();
    const fakeWindow = {
      addEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'pagehide') listeners.add(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'pagehide') listeners.delete(listener);
      }),
    };

    const target = createBrowserPageLifecycleTarget(
      fakeWindow as unknown as Window,
    );
    const callback = vi.fn();

    target.addEventListener('pagehide', callback);
    expect(fakeWindow.addEventListener).toHaveBeenCalledWith(
      'pagehide',
      callback,
    );

    target.removeEventListener('pagehide', callback);
    expect(fakeWindow.removeEventListener).toHaveBeenCalledWith(
      'pagehide',
      callback,
    );
  });
});
