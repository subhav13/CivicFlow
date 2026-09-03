import {
  createLocalGeminiSessionHandler,
  type LocalGeminiSessionHandlerOptions,
} from './gemini-local-session.ts';
import type { GeminiSessionHandler } from './gemini-session-core.ts';
import {
  createSitesGeminiSessionAdapter,
  type SitesAssetBinding,
  type SitesGeminiSessionAdapter,
} from './sites-gemini-session-adapter.ts';

export interface SitesWorkerEnvironment {
  ASSETS: SitesAssetBinding;
  GEMINI_API_KEY?: string;
  CIVICFLOW_ALLOWED_ORIGINS?: string;
  CIVICFLOW_VOICE_ENABLED?: string;
  CIVICFLOW_COMPANION_PIN?: string;
  /** Legacy local-only flag; the hosted Worker never reads it. */
  CIVICFLOW_LIVE_AUDIT?: string;
}

export interface SitesWorkerOptions {
  sessionHandler?: GeminiSessionHandler;
  sessionOptions?: Omit<LocalGeminiSessionHandlerOptions, 'apiKey'>;
}

export interface SitesWorker {
  fetch(request: Request, env: SitesWorkerEnvironment): Promise<Response>;
}

function isEnabled(value: string | undefined): boolean {
  return value?.trim() === '1';
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];

  const origins: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value.split(',')) {
    const trimmed = candidate.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    try {
      const parsed = new URL(trimmed);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.origin !== trimmed
      ) {
        continue;
      }
      seen.add(trimmed);
      origins.push(trimmed);
    } catch {
      // Ignore malformed configuration and fail closed at the session route.
    }
  }
  return origins;
}

function createConfiguredSessionHandler(
  env: SitesWorkerEnvironment,
  options: SitesWorkerOptions,
): GeminiSessionHandler {
  if (options.sessionHandler) return options.sessionHandler;

  const expectedOrigins = parseAllowedOrigins(env.CIVICFLOW_ALLOWED_ORIGINS);
  const sessionOptions = options.sessionOptions ?? {};
  return createLocalGeminiSessionHandler({
    ...sessionOptions,
    auditEnabled: false,
    apiKey: env.GEMINI_API_KEY,
    expectedOrigins,
    companionPin: env.CIVICFLOW_COMPANION_PIN,
    requireCompanionPin: true,
    // The hosted Worker intentionally does not honor the local audit bypass.
    voiceEnabled:
      isEnabled(env.CIVICFLOW_VOICE_ENABLED) && expectedOrigins.length > 0,
  });
}

export function createSitesWorker(
  options: SitesWorkerOptions = {},
): SitesWorker {
  const adapters = new WeakMap<object, SitesGeminiSessionAdapter>();

  return {
    fetch(request, env): Promise<Response> {
      let adapter = adapters.get(env);
      if (!adapter) {
        adapter = createSitesGeminiSessionAdapter({
          sessionHandler: createConfiguredSessionHandler(env, options),
          assets: env.ASSETS,
        });
        adapters.set(env, adapter);
      }
      return adapter.fetch(request);
    },
  };
}

const worker = createSitesWorker();

export default worker;
