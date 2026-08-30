import { describe, expect, it, vi } from 'vitest';

import {
  createLocalGeminiSessionHandler,
  createLocalGeminiSessionIssuer,
} from '../../server/gemini-local-session';

describe('local Gemini session boundary', () => {
  const localOrigin = 'http://localhost:5173';

  function createRequest(
    init: RequestInit = {},
    body = '{}',
    path = 'http://localhost:5173/api/gemini/session',
  ): Request {
    const headers = new Headers({
      Origin: localOrigin,
      'Content-Type': 'application/json',
    });
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    const requestBody = Object.prototype.hasOwnProperty.call(init, 'body')
      ? init.body
      : body;

    return new Request(path, {
      ...init,
      method: init.method ?? 'POST',
      headers,
      body: requestBody,
    });
  }

  it('refuses the endpoint when audit mode is disabled', async () => {
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: false,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects non-local origin and non-POST requests', async () => {
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
    });

    const badOriginResponse = await handler(
      createRequest({
        headers: { Origin: 'https://attacker.example.com' },
      }),
    );
    const getResponse = await handler(
      createRequest({ method: 'GET', body: undefined }),
    );

    expect(badOriginResponse.status).toBe(403);
    expect(getResponse.status).toBe(405);
  });

  it('forwards only the pinned Live model and returns an ephemeral token', async () => {
    const fakeFetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        expect(urlStr).toContain('v1beta/auth_tokens');
        const parsedUrl = new URL(urlStr);
        // Must NOT include key in query params
        expect(parsedUrl.searchParams.has('key')).toBe(false);

        // Must send API key in x-goog-api-key header
        const headers = new Headers(init?.headers);
        expect(headers.get('x-goog-api-key')).toBe('test-api-key');

        const body = JSON.parse(String(init?.body ?? '{}'));
        expect(body).toEqual({
          uses: 1,
          expireTime: '2026-08-29T11:40:00.000Z',
          newSessionExpireTime: '2026-08-29T11:31:00.000Z',
          bidiGenerateContentSetup: {
            model: 'models/gemini-3.1-flash-live-preview',
          },
          fieldMask: 'model',
        });
        expect(body.liveConnectConstraints).toBeUndefined();
        return new Response(JSON.stringify({ name: 'ephemeral-token-abc' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(
      createRequest(
        {},
        JSON.stringify({
          model: 'unauthorized-client-chosen-model',
          instructions: 'unauthorized client instructions',
        }),
      ),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      accessToken: 'ephemeral-token-abc',
      expiresAt: '2026-08-29T11:40:00.000Z',
    });
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('normalizes bare and prefixed model names for the direct REST issuer', async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ name: 'ephemeral-token-abc' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const issuer = createLocalGeminiSessionIssuer({
      apiKey: 'test-api-key',
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    await issuer({ model: 'gemini-3.1-flash-live-preview' });
    await issuer({ model: 'models/gemini-3.1-flash-live-preview' });

    expect(fakeFetch).toHaveBeenCalledTimes(2);
    const models = fakeFetch.mock.calls.map(([, init]) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        bidiGenerateContentSetup?: { model?: string };
        fieldMask?: string;
        liveConnectConstraints?: unknown;
      };
      expect(body.fieldMask).toBe('model');
      expect(body.liveConnectConstraints).toBeUndefined();
      return body.bidiGenerateContentSetup?.model;
    });
    expect(models).toEqual([
      'models/gemini-3.1-flash-live-preview',
      'models/gemini-3.1-flash-live-preview',
    ]);
  });

  it('retains rate limiting across separate requests handled by the same local handler', async () => {
    const fakeFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          token: 'ephemeral-token-123',
          expireTime: '2026-08-29T11:40:00.000Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      maxSessionsPerWindow: 2,
      rateWindowMs: 60_000,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const first = await handler(createRequest());
    const second = await handler(createRequest());
    const third = await handler(createRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
  });

  it('maps provider quota failures to a safe 429', async () => {
    const fakeFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: 'Resource exhausted (quota exceeded)',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
  });

  it('never includes provider credentials in the response', async () => {
    const rawSecret = 'AIzaSyTestSecretKey_NeverExposeThisKey';
    const fakeFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          token: 'ephemeral-token-safe',
          expireTime: '2026-08-29T11:40:00.000Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: rawSecret,
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(createRequest());
    const rawText = await response.text();

    expect(response.status).toBe(200);
    expect(rawText).not.toContain(rawSecret);
  });

  it('rejects a provider response that echoes the server credential', async () => {
    const rawSecret = 'AIzaSyTestSecretKey_RejectEchoedCredential';
    const fakeFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          token: rawSecret,
          expireTime: '2026-08-29T11:40:00.000Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: rawSecret,
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
  });

  it('enforces a bounded request body limit', async () => {
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
    });

    // Create an oversized body exceeding default 16KB limit
    const largeBody = JSON.stringify({ padding: 'x'.repeat(20 * 1024) });
    const response = await handler(createRequest({}, largeBody));

    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data).toEqual({ error: 'Payload too large.' });
  });

  it('keeps the public server gate off even when a key is configured', async () => {
    const issue = vi.fn(async () => {
      throw new Error('must not issue while disabled');
    });
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: false,
      voiceEnabled: false,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: issue as unknown as typeof fetch,
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(404);
    expect(issue).not.toHaveBeenCalled();
  });

  it('allows the public server gate explicitly without enabling local audit mode', async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'ephemeral-token-public-gate',
            expireTime: '2026-08-29T11:40:00.000Z',
          }),
          { status: 200 },
        ),
    );
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: false,
      voiceEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: 'ephemeral-token-public-gate',
      expiresAt: '2026-08-29T11:40:00.000Z',
    });
  });

  it('fails closed when the provider returns an invalid expiry', async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            token: 'ephemeral-token-invalid-expiry',
            expireTime: '2026-08-29T11:41:00.000Z',
          }),
          { status: 200 },
        ),
    );
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      maxSessionDurationMs: 10 * 60_000,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
  });
});
