import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { createLocalGeminiSessionHandler } from './server/gemini-local-session.ts';

export interface LocalViteGeminiSessionSeams {
  fetch?: typeof fetch;
  now?: () => number;
  endpointUrl?: string;
  apiKey?: string;
}

function nonblankEnvValue(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
}

export function createLocalViteGeminiSessionHandler(
  loadedEnv: Record<string, string>,
  seams: LocalViteGeminiSessionSeams = {},
) {
  const expectedOrigin =
    process.env.CIVICFLOW_LIVE_ORIGIN ||
    loadedEnv.CIVICFLOW_LIVE_ORIGIN ||
    'http://localhost:5173';
  const auditEnabled =
    process.env.CIVICFLOW_LIVE_AUDIT !== undefined
      ? process.env.CIVICFLOW_LIVE_AUDIT === '1'
      : loadedEnv.CIVICFLOW_LIVE_AUDIT === '1';
  const voiceEnabled =
    process.env.CIVICFLOW_VOICE_ENABLED !== undefined
      ? process.env.CIVICFLOW_VOICE_ENABLED === '1'
      : loadedEnv.CIVICFLOW_VOICE_ENABLED === '1';
  const companionPin = nonblankEnvValue(
    process.env.CIVICFLOW_COMPANION_PIN,
    loadedEnv.CIVICFLOW_COMPANION_PIN,
  );
  return createLocalGeminiSessionHandler({
    auditEnabled,
    voiceEnabled,
    expectedOrigin,
    apiKey:
      seams.apiKey ?? (process.env.GEMINI_API_KEY || loadedEnv.GEMINI_API_KEY),
    fetch: seams.fetch,
    now: seams.now,
    endpointUrl: seams.endpointUrl,
    ...(companionPin ? { companionPin, requireCompanionPin: true } : {}),
  });
}

function localGeminiSessionPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-gemini-session-middleware',
    apply: 'serve',
    configureServer(server) {
      const handler = createLocalViteGeminiSessionHandler(env);
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost:5173') : null;
        if (url && url.pathname === '/api/gemini/session') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(
                typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
              );
            }
            const bodyBuffer = Buffer.concat(chunks);
            const bodyString = bodyBuffer.toString('utf-8');

            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (Array.isArray(value)) {
                for (const v of value) headers.append(key, v);
              } else if (typeof value === 'string') {
                headers.set(key, value);
              }
            }

            const isEncrypted =
              'encrypted' in req.socket && Boolean(req.socket.encrypted);
            const protocol = isEncrypted ? 'https' : 'http';
            const host = req.headers.host || 'localhost:5173';
            const fullUrl = `${protocol}://${host}${req.url}`;

            const webRequest = new Request(fullUrl, {
              method: req.method,
              headers,
              body: ['GET', 'HEAD'].includes(req.method ?? 'GET')
                ? undefined
                : bodyString,
            });

            const webResponse = await handler(webRequest);
            res.statusCode = webResponse.status;
            webResponse.headers.forEach((v, k) => {
              res.setHeader(k, v);
            });
            const responseText = await webResponse.text();
            res.end(responseText);
            return;
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Vite exposes .env files through import.meta.env, but server middleware
  // reads Node's process.env. Load the full local env explicitly here and
  // pass only the server-side credential and optional companion PIN to the
  // session issuer. Never log those values.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      outDir: 'dist/client',
    },
    plugins: [react(), sites(), localGeminiSessionPlugin(env)],
  };
});
