import {
  createGeminiSessionCore,
  GEMINI_LIVE_MODEL,
  type GeminiSessionHandler,
  type GeminiSessionIssueRequest,
  type IssuedEphemeralSession,
} from './gemini-session-core.ts';

export const GEMINI_NEW_SESSION_WINDOW_MS = 60_000;
export const GEMINI_SESSION_EXPIRY_MS = 10 * 60_000;

type RuntimeEnvironment = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const processEnv = (globalThis as RuntimeEnvironment).process?.env;
  return processEnv?.[name];
}

export interface LocalGeminiSessionIssuerConfig {
  apiKey?: string;
  fetch?: typeof fetch;
  endpointUrl?: string;
  now?: () => number;
}

export function createLocalGeminiSessionIssuer(
  config: LocalGeminiSessionIssuerConfig = {},
): (request: GeminiSessionIssueRequest) => Promise<IssuedEphemeralSession> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const endpointUrl =
    config.endpointUrl ??
    'https://generativelanguage.googleapis.com/v1beta/auth_tokens';
  const nowFn = config.now ?? Date.now;

  return async function issueLocalGeminiSession(
    request: GeminiSessionIssueRequest,
  ): Promise<IssuedEphemeralSession> {
    const apiKey = config.apiKey ?? runtimeEnv('GEMINI_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured on the local server.');
    }

    const targetUrl = new URL(endpointUrl);
    const now = nowFn();
    const requestedDuration = request.maxSessionDurationMs;
    const sessionDuration = Math.min(
      GEMINI_SESSION_EXPIRY_MS,
      Math.max(
        GEMINI_NEW_SESSION_WINDOW_MS,
        typeof requestedDuration === 'number' &&
          Number.isFinite(requestedDuration)
          ? Math.floor(requestedDuration)
          : GEMINI_SESSION_EXPIRY_MS,
      ),
    );
    const expireTime = new Date(now + sessionDuration).toISOString();
    const newSessionExpireTime = new Date(
      now + GEMINI_NEW_SESSION_WINDOW_MS,
    ).toISOString();
    const model = `models/${request.model.replace(/^(?:models\/)+/, '')}`;

    let response: Response;
    try {
      response = await fetchFn(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
          bidiGenerateContentSetup: {
            model,
          },
          fieldMask: 'model',
        }),
      });
    } catch (err) {
      throw new Error(
        `Failed to reach token issuance endpoint: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const isQuotaStatus = response.status === 429;
    const rawText = await response.text();

    let data: Record<string, unknown> = {};
    if (rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        // Fallback to error handling below
      }
    }

    if (!response.ok) {
      const errorObj = (data.error ?? {}) as Record<string, unknown>;
      const errorMessage = String(errorObj.message ?? rawText);
      const isQuota =
        isQuotaStatus ||
        errorObj.status === 'RESOURCE_EXHAUSTED' ||
        errorMessage.toLowerCase().includes('quota');
      if (isQuota) {
        throw new Error('quota exceeded: provider resource exhausted');
      }
      throw new Error('Upstream ephemeral token issuance failed');
    }

    const accessToken =
      typeof data.token === 'string' && data.token
        ? data.token
        : typeof data.accessToken === 'string' && data.accessToken
          ? data.accessToken
          : typeof data.name === 'string' && data.name
            ? data.name
            : '';

    const expiresAt =
      typeof data.expireTime === 'string' && data.expireTime
        ? data.expireTime
        : typeof data.expiresAt === 'string' && data.expiresAt
          ? data.expiresAt
          : expireTime;

    const parsedExpiresAt = Date.parse(expiresAt);
    if (
      !accessToken.trim() ||
      !expiresAt.trim() ||
      accessToken.includes(apiKey.trim()) ||
      !Number.isFinite(parsedExpiresAt) ||
      parsedExpiresAt <= now ||
      parsedExpiresAt > now + sessionDuration
    ) {
      throw new Error('Invalid ephemeral token response from provider');
    }

    return {
      accessToken,
      expiresAt,
    };
  };
}

export interface LocalGeminiSessionHandlerOptions {
  auditEnabled?: boolean;
  voiceEnabled?: boolean;
  apiKey?: string;
  expectedOrigin?: string;
  expectedOrigins?: readonly string[];
  maxSessionDurationMs?: number;
  maxBodyBytes?: number;
  fetch?: typeof fetch;
  endpointUrl?: string;
  maxSessionsPerWindow?: number;
  rateWindowMs?: number;
  now?: () => number;
}

export function createLocalGeminiSessionHandler(
  options: LocalGeminiSessionHandlerOptions = {},
): GeminiSessionHandler {
  const auditEnabled =
    options.auditEnabled ?? runtimeEnv('CIVICFLOW_LIVE_AUDIT') === '1';
  const voiceEnabled =
    options.voiceEnabled ?? runtimeEnv('CIVICFLOW_VOICE_ENABLED') === '1';
  const expectedOrigin =
    options.expectedOrigin ??
    runtimeEnv('CIVICFLOW_LIVE_ORIGIN') ??
    'http://localhost:5173';
  const maxBodyBytes = options.maxBodyBytes ?? 16 * 1024;

  const issuer = createLocalGeminiSessionIssuer({
    apiKey: options.apiKey,
    fetch: options.fetch,
    endpointUrl: options.endpointUrl,
    now: options.now,
  });

  return createGeminiSessionCore({
    enabled: auditEnabled || voiceEnabled,
    ...(options.expectedOrigins
      ? { expectedOrigins: options.expectedOrigins }
      : { expectedOrigin }),
    model: GEMINI_LIVE_MODEL,
    instructions: 'CivicFlow Live Assistant.',
    tools: [],
    maxSessionDurationMs:
      options.maxSessionDurationMs ?? GEMINI_SESSION_EXPIRY_MS,
    maxBodyBytes,
    maxSessionsPerWindow: options.maxSessionsPerWindow ?? 10,
    rateWindowMs: options.rateWindowMs ?? 60_000,
    now: options.now,
    issueEphemeralSession: issuer,
  });
}
