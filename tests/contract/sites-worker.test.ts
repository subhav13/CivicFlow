import { describe, expect, it, vi } from 'vitest';

import { createSitesWorker } from '../../server/sites-worker';

const siteOrigin = 'https://civicflow.codesm.chatgpt.site';

function createAssets() {
  return {
    fetch: vi.fn(async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/index.html' || pathname === '/deep-link') {
        return new Response('<!doctype html><html><body>app</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return new Response('missing', { status: 404 });
    }),
  };
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`${siteOrigin}${path}`, init);
}

describe('Sites Worker artifact', () => {
  it('routes the session API before assets and keeps unknown API paths JSON', async () => {
    const assets = createAssets();
    const worker = createSitesWorker({
      sessionHandler: vi.fn(
        async () =>
          new Response(
            JSON.stringify({ accessToken: 'test', expiresAt: 'later' }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      ),
    });

    const sessionResponse = await worker.fetch(request('/api/gemini/session'), {
      ASSETS: assets,
      CIVICFLOW_ALLOWED_ORIGINS: siteOrigin,
      CIVICFLOW_VOICE_ENABLED: '1',
    });
    const unknownResponse = await worker.fetch(request('/api/unknown'), {
      ASSETS: assets,
      CIVICFLOW_ALLOWED_ORIGINS: siteOrigin,
      CIVICFLOW_VOICE_ENABLED: '1',
    });

    expect(sessionResponse.headers.get('content-type')).toContain(
      'application/json',
    );
    expect(unknownResponse.status).toBe(404);
    expect(unknownResponse.headers.get('content-type')).toContain(
      'application/json',
    );
    expect(await unknownResponse.text()).not.toContain('<html');
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('preserves root and deep-link SPA fallback for non-API GET requests', async () => {
    const assets = createAssets();
    const worker = createSitesWorker();
    const env = { ASSETS: assets };

    const rootResponse = await worker.fetch(request('/'), env);
    const deepLinkResponse = await worker.fetch(request('/household'), env);

    expect(rootResponse.status).toBe(200);
    expect(deepLinkResponse.status).toBe(200);
    expect(await deepLinkResponse.text()).toContain('app');
    expect(assets.fetch).toHaveBeenCalled();
  });

  it('keeps the server gate independent from client configuration', async () => {
    const assets = createAssets();
    const worker = createSitesWorker();
    const env = {
      ASSETS: assets,
      GEMINI_API_KEY: 'test-server-key',
      CIVICFLOW_ALLOWED_ORIGINS: siteOrigin,
      CIVICFLOW_VOICE_ENABLED: '0',
      CIVICFLOW_LIVE_AUDIT: '1',
    };

    const response = await worker.fetch(
      request('/api/gemini/session', {
        method: 'POST',
        headers: {
          Origin: siteOrigin,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      env,
    );

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('test-server-key');
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('composes the enabled Worker session route with the secure broker', async () => {
    const assets = createAssets();
    const provider = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<
          string,
          unknown
        >;
        expect(body.uses).toBe(1);
        expect(body.bidiGenerateContentSetup).toEqual({
          model: 'models/gemini-3.1-flash-live-preview',
        });
        expect(body.fieldMask).toBe('model');
        expect(body.liveConnectConstraints).toBeUndefined();
        return new Response(
          JSON.stringify({
            name: 'ephemeral-worker-token',
            expireTime: '2026-08-30T12:10:00.000Z',
          }),
          { status: 200 },
        );
      },
    );
    const worker = createSitesWorker({
      sessionOptions: {
        fetch: provider as unknown as typeof fetch,
        now: () => Date.parse('2026-08-30T12:00:00.000Z'),
      },
    });

    const response = await worker.fetch(
      request('/api/gemini/session', {
        method: 'POST',
        headers: {
          Origin: siteOrigin,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      {
        ASSETS: assets,
        GEMINI_API_KEY: 'test-server-key',
        CIVICFLOW_ALLOWED_ORIGINS: siteOrigin,
        CIVICFLOW_VOICE_ENABLED: '1',
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      accessToken: 'ephemeral-worker-token',
      expiresAt: '2026-08-30T12:10:00.000Z',
    });
    expect(provider).toHaveBeenCalledOnce();
    expect(assets.fetch).not.toHaveBeenCalled();
  });
});
