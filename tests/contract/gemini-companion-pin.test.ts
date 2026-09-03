import fs from 'node:fs';

import type {
  GeminiSessionCoreConfig,
  IssuedEphemeralSession,
} from '../../server/gemini-session-core';
import {
  createGeminiSessionCore,
  GEMINI_LIVE_MODEL,
} from '../../server/gemini-session-core';
import { createLocalGeminiSessionHandler } from '../../server/gemini-local-session';
import { createSitesWorker } from '../../server/sites-worker';
import { createLocalViteGeminiSessionHandler } from '../../vite.config';

const expectedOrigin = 'https://civicflow.codesm.chatgpt.site';
const placeholderAccessPin = 'placeholder-access-pin';
const wrongAccessPin = 'wrong-access-pin';

function createIssuedSession(): IssuedEphemeralSession {
  return {
    accessToken: 'ephemeral-test-token',
    expiresAt: '2026-08-28T12:00:00.000Z',
  };
}

function createConfig(
  overrides: Partial<GeminiSessionCoreConfig> & {
    companionPin?: string;
    requireCompanionPin?: boolean;
    maxAuthAttemptsPerWindow?: number;
  } = {},
): GeminiSessionCoreConfig {
  return {
    expectedOrigin,
    model: GEMINI_LIVE_MODEL,
    instructions: 'Synthetic CivicFlow assistant.',
    tools: [],
    maxSessionDurationMs: 60_000,
    idleTimeoutMs: 15_000,
    issueEphemeralSession: async () => createIssuedSession(),
    ...overrides,
  };
}

function request(init: RequestInit = {}, body: string = '{}'): Request {
  const headers = new Headers({
    Origin: expectedOrigin,
    'Content-Type': 'application/json',
  });
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const requestBody = Object.prototype.hasOwnProperty.call(init, 'body')
    ? init.body
    : body;

  return new Request(
    'https://civicflow.codesm.chatgpt.site/api/gemini/session',
    {
      ...init,
      method: init.method ?? 'POST',
      headers,
      body: requestBody,
    },
  );
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function pinBody(accessPin: unknown): string {
  return JSON.stringify({ accessPin });
}

describe('Phase 8 companion PIN session gate', () => {
  it('leaves the ungated local contract able to issue without an access pin', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({ enabled: true, issueEphemeralSession: issue }),
    );

    const response = await handler(request());

    expect(response.status).toBe(200);
    expect(issue).toHaveBeenCalledOnce();
  });

  it('rejects a missing access pin before contacting the issuer', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        issueEphemeralSession: issue,
      }),
    );

    const response = await handler(request({}, '{}'));
    const body = await json(response);

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      error: 'Assistant session authentication failed.',
    });
    expect(issue).not.toHaveBeenCalled();
  });

  it('rejects a non-string, blank, oversized, or incorrect pin with one generic error', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        issueEphemeralSession: issue,
      }),
    );
    const cases = [
      pinBody(1234),
      pinBody(''),
      pinBody('   '),
      pinBody('x'.repeat(129)),
      pinBody(wrongAccessPin),
    ];

    for (const body of cases) {
      const response = await handler(request({}, body));
      const raw = await response.text();
      expect(response.status).toBe(401);
      expect(JSON.parse(raw)).toEqual({
        error: 'Assistant session authentication failed.',
      });
      expect(raw).not.toContain(placeholderAccessPin);
      expect(raw).not.toContain(wrongAccessPin);
    }

    expect(issue).not.toHaveBeenCalled();
  });

  it('issues the existing ephemeral envelope when the access pin is correct', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        issueEphemeralSession: issue,
      }),
    );

    const response = await handler(request({}, pinBody(placeholderAccessPin)));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await json(response)).toEqual({
      accessToken: 'ephemeral-test-token',
      expiresAt: '2026-08-28T12:00:00.000Z',
    });
    expect(issue).toHaveBeenCalledOnce();
  });

  it('counts failed authentication attempts before provider issuance', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        maxAuthAttemptsPerWindow: 2,
        maxSessionsPerWindow: 10,
        issueEphemeralSession: issue,
      }),
    );

    expect((await handler(request({}, pinBody(wrongAccessPin)))).status).toBe(
      401,
    );
    expect((await handler(request({}, pinBody(wrongAccessPin)))).status).toBe(
      401,
    );
    const limited = await handler(request({}, pinBody(placeholderAccessPin)));

    expect(limited.status).toBe(429);
    expect(await json(limited)).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
    expect(issue).not.toHaveBeenCalled();
  });

  it('counts successful authentication attempts in the same bounded window', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        maxAuthAttemptsPerWindow: 2,
        maxSessionsPerWindow: 10,
        issueEphemeralSession: issue,
      }),
    );

    expect(
      (await handler(request({}, pinBody(placeholderAccessPin)))).status,
    ).toBe(200);
    expect(
      (await handler(request({}, pinBody(placeholderAccessPin)))).status,
    ).toBe(200);
    const limited = await handler(request({}, pinBody(placeholderAccessPin)));

    expect(limited.status).toBe(429);
    expect(issue).toHaveBeenCalledTimes(2);
  });

  it('disables hosted issuance when a companion pin is required but absent', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        requireCompanionPin: true,
        issueEphemeralSession: issue,
      }),
    );

    const response = await handler(request({}, pinBody(placeholderAccessPin)));

    expect(response.status).toBe(404);
    expect(await json(response)).toEqual({
      error: 'Session endpoint is disabled.',
    });
    expect(issue).not.toHaveBeenCalled();
  });

  it('never echoes or logs the configured or submitted access values', async () => {
    const log = vi.spyOn(console, 'log');
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        companionPin: placeholderAccessPin,
        issueEphemeralSession: issue,
      }),
    );

    const response = await handler(request({}, pinBody(wrongAccessPin)));
    const raw = await response.text();
    const combined = [
      raw,
      JSON.stringify(log.mock.calls),
      JSON.stringify(warn.mock.calls),
      JSON.stringify(error.mock.calls),
    ].join('\n');

    expect(response.status).toBe(401);
    expect(combined).not.toContain(placeholderAccessPin);
    expect(combined).not.toContain(wrongAccessPin);
    expect(issue).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});

describe('Phase 8 hosted Worker companion PIN', () => {
  function createAssets() {
    return {
      fetch: vi.fn(async () => new Response('asset')),
    };
  }

  it('fails closed without a hosted companion pin and does not call the provider', async () => {
    const provider = vi.fn(async () => new Response('should-not-run'));
    const worker = createSitesWorker({
      sessionOptions: {
        fetch: provider as unknown as typeof fetch,
        now: () => Date.parse('2026-08-30T12:00:00.000Z'),
      },
    });

    const response = await worker.fetch(
      request({}, pinBody(placeholderAccessPin)),
      {
        ASSETS: createAssets(),
        GEMINI_API_KEY: 'test-server-key',
        CIVICFLOW_ALLOWED_ORIGINS: expectedOrigin,
        CIVICFLOW_VOICE_ENABLED: '1',
      },
    );

    expect(response.status).toBe(404);
    expect(provider).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong hosted pin before the provider token endpoint', async () => {
    const provider = vi.fn(async () => new Response('should-not-run'));
    const worker = createSitesWorker({
      sessionOptions: {
        fetch: provider as unknown as typeof fetch,
        now: () => Date.parse('2026-08-30T12:00:00.000Z'),
      },
    });
    const env = {
      ASSETS: createAssets(),
      GEMINI_API_KEY: 'test-server-key',
      CIVICFLOW_ALLOWED_ORIGINS: expectedOrigin,
      CIVICFLOW_VOICE_ENABLED: '1',
      CIVICFLOW_COMPANION_PIN: placeholderAccessPin,
    };

    const missing = await worker.fetch(request({}, '{}'), env);
    const wrong = await worker.fetch(request({}, pinBody(wrongAccessPin)), env);

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(provider).not.toHaveBeenCalled();
  });

  it('issues a one-use hosted token only after the placeholder pin is accepted', async () => {
    const provider = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<
          string,
          unknown
        >;
        expect(body.uses).toBe(1);
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
      request({}, pinBody(placeholderAccessPin)),
      {
        ASSETS: createAssets(),
        GEMINI_API_KEY: 'test-server-key',
        CIVICFLOW_ALLOWED_ORIGINS: expectedOrigin,
        CIVICFLOW_VOICE_ENABLED: '1',
        CIVICFLOW_COMPANION_PIN: placeholderAccessPin,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await json(response)).toEqual({
      accessToken: 'ephemeral-worker-token',
      expiresAt: '2026-08-30T12:10:00.000Z',
    });
    expect(provider).toHaveBeenCalledOnce();
  });
});

describe('Phase 8 local handler PIN contract', () => {
  const localOrigin = 'http://localhost:5173';

  function createRequest(body = '{}'): Request {
    return new Request('http://localhost:5173/api/gemini/session', {
      method: 'POST',
      headers: {
        Origin: localOrigin,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  it('keeps an explicitly ungated local handler usable without a pin', async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'ephemeral-token-ungated',
            expireTime: '2026-08-29T11:40:00.000Z',
          }),
          { status: 200 },
        ),
    );
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      fetch: fakeFetch as unknown as typeof fetch,
      now: () => Date.parse('2026-08-29T11:30:00.000Z'),
    });

    const response = await handler(createRequest());

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('gates a locally constructed handler when a companion pin is supplied', async () => {
    const fakeFetch = vi.fn(async () => new Response('should-not-run'));
    const handler = createLocalGeminiSessionHandler({
      auditEnabled: true,
      apiKey: 'test-api-key',
      expectedOrigin: localOrigin,
      companionPin: placeholderAccessPin,
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const response = await handler(createRequest(pinBody(wrongAccessPin)));

    expect(response.status).toBe(401);
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});

describe('Phase 8 local Vite middleware PIN wiring', () => {
  const localOrigin = 'http://localhost:5173';
  const envKeys = [
    'CIVICFLOW_COMPANION_PIN',
    'CIVICFLOW_LIVE_AUDIT',
    'CIVICFLOW_VOICE_ENABLED',
    'CIVICFLOW_LIVE_ORIGIN',
    'GEMINI_API_KEY',
  ] as const;
  const previousEnv: Partial<
    Record<(typeof envKeys)[number], string | undefined>
  > = {};

  beforeEach(() => {
    for (const key of envKeys) {
      previousEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function createRequest(body = '{}'): Request {
    return new Request('http://localhost:5173/api/gemini/session', {
      method: 'POST',
      headers: {
        Origin: localOrigin,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  function createProviderFetch() {
    return vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'ephemeral-vite-local-token',
            expireTime: '2026-08-29T11:40:00.000Z',
          }),
          { status: 200 },
        ),
    );
  }

  function createViteHandler(
    loadedEnv: Record<string, string>,
    fetchFn: ReturnType<typeof createProviderFetch>,
  ) {
    return createLocalViteGeminiSessionHandler(
      {
        CIVICFLOW_LIVE_AUDIT: '1',
        CIVICFLOW_LIVE_ORIGIN: localOrigin,
        ...loadedEnv,
      },
      {
        apiKey: 'test-api-key',
        fetch: fetchFn as unknown as typeof fetch,
        now: () => Date.parse('2026-08-29T11:30:00.000Z'),
      },
    );
  }

  it('does not open .env.local when wiring the local Vite session handler', () => {
    const readFileSync = vi.spyOn(fs, 'readFileSync');
    const readFile = vi.spyOn(fs, 'readFile');
    const fakeFetch = createProviderFetch();

    createViteHandler(
      { CIVICFLOW_COMPANION_PIN: placeholderAccessPin },
      fakeFetch,
    );

    const openedPaths = [...readFileSync.mock.calls, ...readFile.mock.calls]
      .map((args) => String(args[0] ?? ''))
      .join('\n');
    expect(openedPaths).not.toContain('.env.local');
    readFileSync.mockRestore();
    readFile.mockRestore();
  });

  it('keeps local Vite issuance ungated when the companion pin is absent', async () => {
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler({}, fakeFetch);

    const response = await handler(createRequest());

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('keeps local Vite issuance ungated when the companion pin is blank', async () => {
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler(
      { CIVICFLOW_COMPANION_PIN: '   ' },
      fakeFetch,
    );

    const response = await handler(createRequest());

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('rejects a missing access pin before provider issuance when the loaded env pin is set', async () => {
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler(
      { CIVICFLOW_COMPANION_PIN: placeholderAccessPin },
      fakeFetch,
    );

    const response = await handler(createRequest());

    expect(response.status).toBe(401);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('rejects a wrong loaded-env pin before provider issuance', async () => {
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler(
      { CIVICFLOW_COMPANION_PIN: placeholderAccessPin },
      fakeFetch,
    );

    const response = await handler(createRequest(pinBody(wrongAccessPin)));
    const raw = await response.text();

    expect(response.status).toBe(401);
    expect(JSON.parse(raw)).toEqual({
      error: 'Assistant session authentication failed.',
    });
    expect(raw).not.toContain(placeholderAccessPin);
    expect(raw).not.toContain(wrongAccessPin);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('issues a local Vite session after the loaded-env placeholder pin is accepted', async () => {
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler(
      { CIVICFLOW_COMPANION_PIN: placeholderAccessPin },
      fakeFetch,
    );

    const response = await handler(
      createRequest(pinBody(placeholderAccessPin)),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await json(response)).toEqual({
      accessToken: 'ephemeral-vite-local-token',
      expiresAt: '2026-08-29T11:40:00.000Z',
    });
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('rejects a wrong process.env pin before provider issuance', async () => {
    process.env.CIVICFLOW_COMPANION_PIN = placeholderAccessPin;
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler({}, fakeFetch);

    const response = await handler(createRequest(pinBody(wrongAccessPin)));

    expect(response.status).toBe(401);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('issues a local Vite session after the process.env placeholder pin is accepted', async () => {
    process.env.CIVICFLOW_COMPANION_PIN = placeholderAccessPin;
    const fakeFetch = createProviderFetch();
    const handler = createViteHandler({}, fakeFetch);

    const response = await handler(
      createRequest(pinBody(placeholderAccessPin)),
    );

    expect(response.status).toBe(200);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });
});
