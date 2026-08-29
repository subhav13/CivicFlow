import type {
  GeminiSessionCoreConfig,
  GeminiSessionIssueRequest,
  IssuedEphemeralSession,
} from '../../server/gemini-session-core';
import {
  createGeminiSessionCore,
  GEMINI_LIVE_MODEL,
} from '../../server/gemini-session-core';
import { createSitesGeminiSessionAdapter } from '../../server/sites-gemini-session-adapter';
import type { ProviderFunctionTool } from '../../src/assistant/types';

const expectedOrigin = 'https://civicflow.codesm.chatgpt.site';
const fixedTools: ProviderFunctionTool[] = [
  {
    type: 'function',
    name: 'read_current_section',
    description: 'Read the current section.',
    parameters: { type: 'object', properties: {} },
  },
];

function createIssuedSession(): IssuedEphemeralSession {
  return {
    accessToken: 'ephemeral-test-token',
    expiresAt: '2026-08-28T12:00:00.000Z',
  };
}

function createConfig(
  overrides: Partial<GeminiSessionCoreConfig> = {},
): GeminiSessionCoreConfig {
  return {
    expectedOrigin,
    model: GEMINI_LIVE_MODEL,
    instructions: 'Synthetic CivicFlow assistant.',
    tools: fixedTools,
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

describe('Gemini session boundary', () => {
  it('is disabled by default and returns a cache-safe response', async () => {
    const handler = createGeminiSessionCore(createConfig());

    const response = await handler(request());

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects an unexpected origin before contacting the upstream', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({ enabled: true, issueEphemeralSession: issue }),
    );

    const response = await handler(
      request({ headers: { Origin: 'https://attacker.example' } }),
    );

    expect(response.status).toBe(403);
    expect(issue).not.toHaveBeenCalled();
  });

  it('rejects non-POST and non-JSON requests', async () => {
    const handler = createGeminiSessionCore(createConfig({ enabled: true }));

    const methodResponse = await handler(
      request({ method: 'GET', body: undefined }),
    );
    const contentTypeResponse = await handler(
      request({ headers: { 'Content-Type': 'text/plain' } }),
    );

    expect(methodResponse.status).toBe(405);
    expect(contentTypeResponse.status).toBe(415);
  });

  it('rejects an oversized request body', async () => {
    const handler = createGeminiSessionCore(
      createConfig({ enabled: true, maxBodyBytes: 3 }),
    );

    const response = await handler(request({}, '{"x":1}'));

    expect(response.status).toBe(413);
  });

  it('rejects an oversized declared body before reading it', async () => {
    const issue = vi.fn(async () => createIssuedSession());
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        maxBodyBytes: 3,
        issueEphemeralSession: issue,
      }),
    );

    const response = await handler(
      request({ headers: { 'Content-Length': '999' } }, '{}'),
    );

    expect(response.status).toBe(413);
    expect(issue).not.toHaveBeenCalled();
  });

  it('accepts only the application/json media type', async () => {
    const handler = createGeminiSessionCore(createConfig({ enabled: true }));

    const response = await handler(
      request({ headers: { 'Content-Type': 'application/json-payload' } }),
    );

    expect(response.status).toBe(415);
  });

  it('keeps model, instructions, and tools server-owned', async () => {
    const issue = vi.fn(async (input: GeminiSessionIssueRequest) => {
      expect(input).toEqual({
        model: GEMINI_LIVE_MODEL,
        instructions: 'Synthetic CivicFlow assistant.',
        tools: fixedTools,
        maxSessionDurationMs: 60_000,
        idleTimeoutMs: 15_000,
      });
      return createIssuedSession();
    });
    const handler = createGeminiSessionCore(
      createConfig({ enabled: true, issueEphemeralSession: issue }),
    );

    const response = await handler(
      request(
        {},
        JSON.stringify({
          model: 'client-selected-model',
          instructions: 'client-selected-instructions',
          tools: [{ name: 'submit_application' }],
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(issue).toHaveBeenCalledOnce();
  });

  it('returns only the short-lived credential envelope and never config or logs', async () => {
    const log = vi.spyOn(console, 'log');
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const handler = createGeminiSessionCore(createConfig({ enabled: true }));

    const response = await handler(request());
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      accessToken: 'ephemeral-test-token',
      expiresAt: '2026-08-28T12:00:00.000Z',
    });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });

  it('maps upstream quota errors to a safe bounded response', async () => {
    const handler = createGeminiSessionCore(
      createConfig({
        enabled: true,
        issueEphemeralSession: async () => {
          throw new Error('quota exceeded: upstream details');
        },
      }),
    );

    const response = await handler(request());

    expect(response.status).toBe(429);
    expect(await json(response)).toEqual({
      error: 'Assistant session is temporarily unavailable.',
    });
  });

  it('maps malformed, timeout, and network failures without echoing upstream data', async () => {
    const cases: Array<{
      issue: GeminiSessionCoreConfig['issueEphemeralSession'];
    }> = [
      {
        issue: async () => ({ accessToken: '', expiresAt: '' }),
      },
      {
        issue: async () => {
          throw new Error('timeout secret details');
        },
      },
      {
        issue: async () => {
          throw new Error('network secret details');
        },
      },
    ];

    for (const testCase of cases) {
      const handler = createGeminiSessionCore(
        createConfig({
          enabled: true,
          issueEphemeralSession: testCase.issue,
        }),
      );

      const response = await handler(request());
      const body = await json(response);

      expect(response.status).toBe(502);
      expect(JSON.stringify(body)).not.toContain('secret details');
    }
  });

  it('enforces the configured session rate window', async () => {
    const handler = createGeminiSessionCore(
      createConfig({ enabled: true, maxSessionsPerWindow: 1 }),
    );

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(429);
  });

  it('routes only the exact session path to the session handler', async () => {
    const sessionHandler = vi.fn(async () => new Response('session'));
    const assets = { fetch: vi.fn(async () => new Response('asset')) };
    const adapter = createSitesGeminiSessionAdapter({
      sessionHandler,
      assets,
    });

    const sessionResponse = await adapter.fetch(request());
    const assetResponse = await adapter.fetch(
      new Request('https://civicflow.codesm.chatgpt.site/'),
    );

    expect(await sessionResponse.text()).toBe('session');
    expect(await assetResponse.text()).toBe('asset');
    expect(sessionHandler).toHaveBeenCalledOnce();
    expect(assets.fetch).toHaveBeenCalledOnce();
  });
});
