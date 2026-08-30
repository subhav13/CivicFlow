import type {
  AudioOutput,
  MicrophoneProvider,
  MicrophoneStream,
  MicrophoneTrack,
  PageLifecycleTarget,
} from './assistant-controller';

export interface BrowserMicrophoneProviderOptions {
  mediaDevices?: MediaDevices;
  audioContextConstructor?: typeof AudioContext;
}

export interface BrowserAudioOutputOptions {
  audioContextConstructor?: typeof AudioContext;
}

interface WindowWithAudioContext {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function resolveAudioContextClass(
  customConstructor?: typeof AudioContext,
): typeof AudioContext | undefined {
  if (customConstructor) return customConstructor;
  if (typeof window === 'undefined') return undefined;
  const win = window as unknown as WindowWithAudioContext;
  return win.AudioContext || win.webkitAudioContext;
}

function floatTo16BitPcmBase64(input: Float32Array): string {
  const pcmBytes = new Uint8Array(input.length * 2);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    const int16 = Math.floor(val);
    pcmBytes[i * 2] = int16 & 0xff;
    pcmBytes[i * 2 + 1] = (int16 >> 8) & 0xff;
  }

  let binary = '';
  const len = pcmBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pcmBytes[i]);
  }
  return btoa(binary);
}

function base64PcmToFloat32(base64Data: string): Float32Array {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const sampleCount = Math.floor(len / 2);
  const floats = new Float32Array(sampleCount);
  const dataView = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    floats[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }
  return floats;
}
function resampleTo16kHz(
  input: Float32Array,
  inputSampleRate: number,
): Float32Array {
  if (inputSampleRate === 16000 || input.length === 0) {
    return input;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originPos = i * ratio;
    const leftIndex = Math.floor(originPos);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const fraction = originPos - leftIndex;
    result[i] =
      input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
  }

  return result;
}

export function createBrowserMicrophoneProvider(
  options: BrowserMicrophoneProviderOptions = {},
): MicrophoneProvider {
  return {
    async requestStream(): Promise<MicrophoneStream> {
      const mediaDevices =
        options.mediaDevices ??
        (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined);

      if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
        throw new Error('Audio input is unsupported in this environment.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        throw new Error(
          `Microphone permission was denied or unavailable: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const AudioContextClass = resolveAudioContextClass(
        options.audioContextConstructor,
      );

      let audioCtx: AudioContext | undefined;
      let sourceNode: MediaStreamAudioSourceNode | undefined;
      let processorNode: ScriptProcessorNode | undefined;
      let silentGainNode: GainNode | undefined;

      const listeners = new Set<(data: string, mimeType?: string) => void>();
      let isActive = true;

      const cleanup = () => {
        if (!isActive) return;
        isActive = false;
        listeners.clear();

        if (processorNode) {
          try {
            processorNode.onaudioprocess = null;
            processorNode.disconnect();
          } catch {
            // Safe teardown
          }
          processorNode = undefined;
        }

        if (silentGainNode) {
          try {
            silentGainNode.disconnect();
          } catch {
            // Safe teardown
          }
          silentGainNode = undefined;
        }

        if (sourceNode) {
          try {
            sourceNode.disconnect();
          } catch {
            // Safe teardown
          }
          sourceNode = undefined;
        }

        if (audioCtx) {
          try {
            void audioCtx.close();
          } catch {
            // Safe teardown
          }
          audioCtx = undefined;
        }
      };

      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass({ sampleRate: 16000 });
          sourceNode = audioCtx.createMediaStreamSource(mediaStream);
          processorNode = audioCtx.createScriptProcessor(4096, 1, 1);

          processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
            if (!isActive) return;
            const inputChannel = event.inputBuffer?.getChannelData(0);
            if (!isActive || !inputChannel || inputChannel.length === 0) return;
            const sampleRate =
              event.inputBuffer.sampleRate || audioCtx?.sampleRate || 16000;
            const resampled = resampleTo16kHz(inputChannel, sampleRate);
            const base64Pcm = floatTo16BitPcmBase64(resampled);
            if (!isActive) return;
            for (const listener of listeners) {
              listener(base64Pcm, 'audio/pcm;rate=16000');
            }
          };

          sourceNode.connect(processorNode);
          if (typeof audioCtx.createGain === 'function') {
            silentGainNode = audioCtx.createGain();
            silentGainNode.gain.value = 0;
            processorNode.connect(silentGainNode);
            silentGainNode.connect(audioCtx.destination);
          } else {
            processorNode.connect(audioCtx.destination);
          }
        } catch {
          // Fallback if audio graph creation fails
        }
      }

      const rawTracks = mediaStream.getTracks ? mediaStream.getTracks() : [];
      const tracks: MicrophoneTrack[] = rawTracks.map((track) => ({
        stop() {
          try {
            track.stop();
          } catch {
            // Safe teardown
          }
          cleanup();
        },
      }));

      return {
        getTracks(): readonly MicrophoneTrack[] {
          return tracks;
        },
        subscribe(
          listener: (data: string, mimeType?: string) => void,
        ): () => void {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
              cleanup();
            }
          };
        },
      };
    },
  };
}

export function createBrowserAudioOutput(
  options: BrowserAudioOutputOptions = {},
): AudioOutput {
  const AudioContextClass = resolveAudioContextClass(
    options.audioContextConstructor,
  );

  let audioCtx: AudioContext | undefined;
  const activeSources = new Set<AudioBufferSourceNode>();
  let nextPlayTime = 0;
  let isMuted = false;

  const getOrCreateContext = (): AudioContext | undefined => {
    if (!audioCtx && AudioContextClass) {
      try {
        audioCtx = new AudioContextClass({ sampleRate: 24000 });
      } catch {
        // Safe fallback
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  };

  const stopOutput = (): void => {
    for (const source of activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // Safe teardown
      }
    }
    activeSources.clear();
    nextPlayTime = 0;
    if (audioCtx) {
      try {
        void audioCtx.close();
      } catch {
        // Safe teardown
      }
      audioCtx = undefined;
    }
  };

  return {
    play(data: string, mimeType: string): void {
      if (isMuted) return;
      const ctx = getOrCreateContext();
      if (!ctx || !data) return;

      let sampleRate = 24000;
      const rateMatch = /rate=(\d+)/i.exec(mimeType);
      if (rateMatch && rateMatch[1]) {
        const parsed = parseInt(rateMatch[1], 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          sampleRate = parsed;
        }
      }

      try {
        const floatData = base64PcmToFloat32(data);
        if (floatData.length === 0) return;

        const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
        buffer.getChannelData(0).set(floatData);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        const startTime = Math.max(currentTime, nextPlayTime);
        source.start(startTime);
        nextPlayTime = startTime + buffer.duration;

        activeSources.add(source);
        source.onended = () => {
          if (!activeSources.has(source)) return;
          activeSources.delete(source);
          try {
            source.disconnect();
          } catch {
            // Safe teardown
          }
        };
      } catch {
        // Safe error recovery without throwing
      }
    },

    stop: stopOutput,

    setMuted(muted: boolean): void {
      isMuted = muted;
      if (muted) {
        stopOutput();
      }
    },
  };
}

export function createBrowserPageLifecycleTarget(
  target?: Window | PageLifecycleTarget,
): PageLifecycleTarget {
  const win = target ?? (typeof window !== 'undefined' ? window : undefined);

  return {
    addEventListener(type: 'pagehide', listener: () => void): void {
      if (win && typeof win.addEventListener === 'function') {
        win.addEventListener(type, listener);
      }
    },
    removeEventListener(type: 'pagehide', listener: () => void): void {
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener(type, listener);
      }
    },
  };
}
