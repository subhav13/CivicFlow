import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { createLocalGeminiSessionHandler } from './server/gemini-local-session';

function localGeminiSessionPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-gemini-session-middleware',
    apply: 'serve',
    configureServer(server) {
      const expectedOrigin =
        process.env.CIVICFLOW_LIVE_ORIGIN ||
        env.CIVICFLOW_LIVE_ORIGIN ||
        'http://localhost:5173';
      const auditEnabled =
        process.env.CIVICFLOW_LIVE_AUDIT !== undefined
          ? process.env.CIVICFLOW_LIVE_AUDIT === '1'
          : env.CIVICFLOW_LIVE_AUDIT === '1';
      const handler = createLocalGeminiSessionHandler({
        auditEnabled,
        expectedOrigin,
        apiKey: process.env.GEMINI_API_KEY || env.GEMINI_API_KEY,
      });
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
  // pass only the server-side credential to the session issuer.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      outDir: 'dist/client',
    },
    plugins: [react(), sites(), localGeminiSessionPlugin(env)],
  };
});
