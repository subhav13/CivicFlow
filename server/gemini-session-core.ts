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
  rateWindowMs?: number;
  now?: () => number;
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

export function createGeminiSessionCore(
  config: GeminiSessionCoreConfig,
): GeminiSessionHandler {
  const sessionTimestamps: number[] = [];
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

    if (rawBody.trim().length > 0) {
      try {
        JSON.parse(rawBody);
      } catch {
        return jsonResponse({ error: 'Invalid JSON body.' }, 400);
      }
    }

    const currentTime = nowFn();
    if (
      config.maxSessionsPerWindow !== undefined &&
      config.maxSessionsPerWindow > 0
    ) {
      const cutoff = currentTime - rateWindowMs;
      while (sessionTimestamps.length > 0 && sessionTimestamps[0] <= cutoff) {
        sessionTimestamps.shift();
      }
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
