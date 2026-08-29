import type { CivicFlowStore } from '../application/store';
import type { ModelContextPort } from '../webmcp/model-context-port';
import { createDefaultModelContextPort } from '../webmcp/in-process-model-context-port';
import { WebMcpRegistryManager } from '../webmcp/registry-manager';
import {
  createAssistantController,
  type AssistantController,
  type AudioOutput,
  type MicrophoneProvider,
  type PageLifecycleTarget,
} from './assistant-controller';
import {
  createBrowserAudioOutput,
  createBrowserMicrophoneProvider,
  createBrowserPageLifecycleTarget,
} from './browser-media';
import { createCurrentToolSurface } from './current-tool-surface';
import {
  createGeminiLiveClient,
  type EphemeralSessionCredential,
  type GeminiLiveClient,
  type LiveSocket,
} from './gemini-live-client';
import { createLiveSocketAdapter } from './gemini-live-socket-adapter';
import {
  createGeminiToolBridge,
  type GeminiToolBridge,
} from './gemini-tool-bridge';
import type { CurrentToolSurface } from './types';

export interface AssistantRuntimeOptions {
  store: CivicFlowStore;
  port?: ModelContextPort;
  registryManager?: WebMcpRegistryManager;
  sessionEndpointUrl?: string;
  fetch?: typeof fetch;
  instructions?: string;
  createSocket?: (
    url: string,
    credential: EphemeralSessionCredential,
  ) => Promise<LiveSocket> | LiveSocket;
  microphone?: MicrophoneProvider;
  audioOutput?: AudioOutput;
  lifecycleTarget?: PageLifecycleTarget;
}

export interface AssistantRuntime {
  controller: AssistantController;
  client: GeminiLiveClient;
  port: ModelContextPort;
  surface: CurrentToolSurface;
  toolBridge: GeminiToolBridge;
  registryManager: WebMcpRegistryManager;
  dispose(): void;
}

export function createAssistantRuntime(
  options: AssistantRuntimeOptions,
): AssistantRuntime {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const endpointUrl = options.sessionEndpointUrl ?? '/api/gemini/session';

  const port = options.port ?? createDefaultModelContextPort();
  const surface = createCurrentToolSurface(port);
  const toolBridge = createGeminiToolBridge(surface);
  const registryManager =
    options.registryManager ??
    new WebMcpRegistryManager({
      port,
      store: options.store,
    });
  const socketAdapter = createLiveSocketAdapter({
    surface,
    waitForRegistry: () => registryManager.waitForSync(),
    instructions: options.instructions,
    createSocket: options.createSocket,
  });

  const client = createGeminiLiveClient({
    issueEphemeralSession: async (signal?: AbortSignal) => {
      let response: Response;
      try {
        response = await fetchFn(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
          signal,
        });
      } catch (err) {
        throw new Error(
          `Failed to reach session endpoint: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!response.ok) {
        let errorMsg = 'Session endpoint request failed';
        try {
          const body = (await response.json()) as Record<string, unknown>;
          if (typeof body.error === 'string') {
            errorMsg = body.error;
          }
        } catch {
          // Ignore json parse error
        }
        if (response.status === 429) {
          throw new Error('quota exceeded: assistant session unavailable');
        }
        throw new Error(errorMsg);
      }

      const data = (await response.json()) as EphemeralSessionCredential;
      if (
        !data ||
        typeof data.accessToken !== 'string' ||
        !data.accessToken ||
        typeof data.expiresAt !== 'string' ||
        !data.expiresAt
      ) {
        throw new Error('Invalid ephemeral session response');
      }

      return data;
    },
    connectSocket: (credential) => socketAdapter.connectSocket(credential),
  });

  const microphone = options.microphone ?? createBrowserMicrophoneProvider();
  const audioOutput = options.audioOutput ?? createBrowserAudioOutput();
  const lifecycleTarget =
    options.lifecycleTarget ?? createBrowserPageLifecycleTarget();

  const controller = createAssistantController({
    client,
    toolBridge,
    microphone,
    audioOutput,
    lifecycleTarget,
  });

  return {
    controller,
    client,
    port,
    surface,
    toolBridge,
    registryManager,
    dispose() {
      controller.dispose();
      registryManager.dispose();
    },
  };
}
