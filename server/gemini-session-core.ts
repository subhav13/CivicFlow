import type { ProviderFunctionTool } from '../src/assistant/types.ts';

export { GEMINI_LIVE_MODEL } from '../src/assistant/gemini-live-model.ts';

export interface GeminiSessionIssueRequest {
  model: string;
  instructions?: string;
  tools?: readonly ProviderFunctionTool[];
  maxSessionDurationMs?: number;
  idleTimeoutMs?: number;
}

export interface IssuedEphemeralSession {
  accessToken: string;
  expiresAt: string;
}

export const ACCESS_PIN_MAX_CHARS = 128;
export const SESSION_AUTH_FAILED_ERROR =
  'Assistant session authentication failed.';

export interface GeminiSessionCoreConfig {
  enabled?: boolean;
  expectedOrigin?: string;
  expectedOrigins?: readonly string[];
  model: string;
  instructions: string;
  tools: readonly ProviderFunctionTool[];
  maxSessionDurationMs?: number;
  idleTimeoutMs?: number;
  maxBodyBytes?: number;
  maxSessionsPerWindow?: number;
  maxAuthAttemptsPerWindow?: number;
  rateWindowMs?: number;
  now?: () => number;
  companionPin?: string;
  requireCompanionPin?: boolean;
  issueEphemeralSession(
    request: GeminiSessionIssueRequest,
  ): Promise<IssuedEphemeralSession>;
}

export type GeminiSessionHandler = (request: Request) => Promise<Response>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function configuredCompanionPin(config: GeminiSessionCoreConfig): string {
  return typeof config.companionPin === 'string'
    ? config.companionPin.trim()
    : '';
}

function submittedAccessPin(parsedBody: unknown): string {
  if (parsedBody === undefined || parsedBody === null) return '';
  if (typeof parsedBody !== 'object' || Array.isArray(parsedBody)) return '';
  const value = (parsedBody as Record<string, unknown>).accessPin;
  return typeof value === 'string' ? value : '';
}

async function digestUtf8(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

function digestEquals(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length, 1);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function pruneTimestamps(timestamps: number[], cutoff: number): void {
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }
}

export function createGeminiSessionCore(
  config: GeminiSessionCoreConfig,
): GeminiSessionHandler {
  const sessionTimestamps: number[] = [];
  const authAttemptTimestamps: number[] = [];
  const nowFn = config.now ?? Date.now;
  const rateWindowMs = config.rateWindowMs ?? 60_000;
  const allowedOrigins = new Set(
    [
      ...(config.expectedOrigins ?? []),
      ...(config.expectedOrigin ? [config.expectedOrigin] : []),
    ]
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  );

  return async function handleGeminiSession(
    request: Request,
  ): Promise<Response> {
    if (!config.enabled) {
      return jsonResponse({ error: 'Session endpoint is disabled.' }, 404);
    }

    const origin = request.headers.get('origin');
    if (!origin || !allowedOrigins.has(origin)) {
      return jsonResponse({ error: 'Forbidden origin.' }, 403);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    const contentType = request.headers.get('content-type') ?? '';
    const mediaType = contentType.split(';')[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return jsonResponse({ error: 'Unsupported media type.' }, 415);
    }

    const declaredLength = request.headers.get('content-length');
    if (config.maxBodyBytes !== undefined && declaredLength !== null) {
      const parsedLength = parseInt(declaredLength, 10);
      if (!Number.isNaN(parsedLength) && parsedLength > config.maxBodyBytes) {
        return jsonResponse({ error: 'Payload too large.' }, 413);
      }
    }
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return jsonResponse({ error: 'Invalid request body.' }, 400);
    }
    const byteLength = new TextEncoder().encode(rawBody).length;
    if (config.maxBodyBytes !== undefined && byteLength > config.maxBodyBytes) {
      return jsonResponse({ error: 'Payload too large.' }, 413);
    }

    let parsedBody: unknown;
    if (rawBody.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return jsonResponse({ error: 'Invalid JSON body.' }, 400);
      }
    }

    const expectedPin = configuredCompanionPin(config);
    if (config.requireCompanionPin && expectedPin.length === 0) {
      return jsonResponse({ error: 'Session endpoint is disabled.' }, 404);
    }

    const currentTime = nowFn();
    const cutoff = currentTime - rateWindowMs;
    const pinGated =
      Boolean(config.requireCompanionPin) || expectedPin.length > 0;
    if (pinGated) {
      const maxAuthAttempts =
        config.maxAuthAttemptsPerWindow ?? config.maxSessionsPerWindow ?? 10;
      if (maxAuthAttempts > 0) {
        pruneTimestamps(authAttemptTimestamps, cutoff);
        if (authAttemptTimestamps.length >= maxAuthAttempts) {
          return jsonResponse(
            { error: 'Assistant session is temporarily unavailable.' },
            429,
          );
        }
        authAttemptTimestamps.push(currentTime);
      }

      const submitted = submittedAccessPin(parsedBody);
      const trimmedSubmitted = submitted.trim();
      const formatOk =
        trimmedSubmitted.length > 0 && submitted.length <= ACCESS_PIN_MAX_CHARS;
      const expectedDigest = await digestUtf8(expectedPin);
      const submittedDigest = await digestUtf8(
        formatOk ? trimmedSubmitted : submitted,
      );
      if (!formatOk || !digestEquals(submittedDigest, expectedDigest)) {
        return jsonResponse({ error: SESSION_AUTH_FAILED_ERROR }, 401);
      }
    }

    if (
      config.maxSessionsPerWindow !== undefined &&
      config.maxSessionsPerWindow > 0
    ) {
      pruneTimestamps(sessionTimestamps, cutoff);
      if (sessionTimestamps.length >= config.maxSessionsPerWindow) {
        return jsonResponse(
          { error: 'Assistant session is temporarily unavailable.' },
          429,
        );
      }
    }

    try {
      const issued = await config.issueEphemeralSession({
        model: config.model,
        instructions: config.instructions,
        tools: config.tools,
        maxSessionDurationMs: config.maxSessionDurationMs,
        idleTimeoutMs: config.idleTimeoutMs,
      });

      if (
        !issued ||
        typeof issued.accessToken !== 'string' ||
        !issued.accessToken ||
        typeof issued.expiresAt !== 'string' ||
        !issued.expiresAt
      ) {
        return jsonResponse(
          { error: 'Assistant session is temporarily unavailable.' },
          502,
        );
      }

      sessionTimestamps.push(currentTime);
      return jsonResponse(
        {
          accessToken: issued.accessToken,
          expiresAt: issued.expiresAt,
        },
        200,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isQuota = message.toLowerCase().includes('quota');
      return jsonResponse(
        { error: 'Assistant session is temporarily unavailable.' },
        isQuota ? 429 : 502,
      );
    }
  };
}
