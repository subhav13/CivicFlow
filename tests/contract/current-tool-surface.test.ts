import { describe, expect, it, vi } from 'vitest';

import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import type {
  ModelContextPort,
  RegisteredToolRef,
  ToolDefinition,
} from '../../src/webmcp/model-context-port';

function makeTool(
  name: string,
  handler: ToolDefinition['handler'] = async () => `result:${name}`,
  readOnly = false,
): ToolDefinition {
  return {
    name,
    title: name.replaceAll('_', ' '),
    description: `Description for ${name}`,
    inputSchema: { type: 'object', additionalProperties: false },
    ...(readOnly ? { annotations: { readOnlyHint: true } } : {}),
    handler,
  };
}

function makePort(
  tools: RegisteredToolRef[],
  executeTool: ModelContextPort['executeTool'] = async () => '{"ok":true}',
): ModelContextPort {
  return {
    isAvailable: () => true,
    registerTool: async () => {},
    getTools: async () => tools,
    executeTool,
    subscribeToolChange: () => () => {},
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('CurrentToolSurface Contract (Phase 2 Packet 2.1)', () => {
  it('returns the current registration snapshot without internal handlers', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const port = new FakeModelContextPort();
    await port.registerTool(
      makeTool('get_application_progress', undefined, true),
    );

    const surface = createCurrentToolSurface(port);
    const tools = await surface.snapshot();

    expect(tools).toEqual([
      {
        name: 'get_application_progress',
        title: 'get application progress',
        description: 'Description for get_application_progress',
        inputSchema: { type: 'object', additionalProperties: false },
        annotations: { readOnlyHint: true },
      },
    ] satisfies RegisteredToolRef[]);
    expect(tools[0]).not.toHaveProperty('handler');
  });

  it('parses browser JSON-string schemas for snapshots but preserves raw refs for execution', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const schema = {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false,
    };
    const rawTool = {
      ...makeTool('add_income_source'),
      inputSchema: JSON.stringify(
        schema,
      ) as unknown as RegisteredToolRef['inputSchema'],
    };
    const executeTool = vi.fn(async () => '{"ok":true}');
    const surface = createCurrentToolSurface(makePort([rawTool], executeTool));

    const [snapshotTool] = await surface.snapshot();

    expect(snapshotTool?.inputSchema).toEqual(schema);
    await expect(
      surface.execute('add_income_source', '{"value":"x"}'),
    ).resolves.toBe('{"ok":true}');
    expect(executeTool).toHaveBeenCalledWith(
      rawTool,
      { value: 'x' },
      undefined,
    );
  });

  it.each([
    ['malformed JSON', '{"type":"object"'],
    ['JSON primitive', 'null'],
    ['JSON array', '[]'],
    ['native primitive', 42],
  ] as const)(
    'omits %s schemas from the assistant snapshot',
    async (_, inputSchema) => {
      const { createCurrentToolSurface } = await import(
        /* @vite-ignore */
        '../../src/assistant/current-tool-surface'
      );
      const rawTool = {
        ...makeTool('broken_schema_tool'),
        inputSchema: inputSchema as unknown as RegisteredToolRef['inputSchema'],
      };
      const surface = createCurrentToolSurface(makePort([rawTool]));

      await expect(surface.snapshot()).resolves.toEqual([]);
    },
  );

  it('forwards dynamic registration changes and stops after unsubscribe', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const port = new FakeModelContextPort();
    const surface = createCurrentToolSurface(port);
    const listener = vi.fn();
    const unsubscribe = surface.subscribe(listener);

    await port.registerTool(makeTool('get_next_actions', undefined, true));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await port.registerTool(makeTool('navigate_to_section'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refreshes before execution and rejects a disappeared contextual tool', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const handler = vi.fn(async () => 'must not execute');
    const port = new FakeModelContextPort();
    const controller = new AbortController();
    await port.registerTool(makeTool('update_household_member', handler), {
      signal: controller.signal,
    });
    const surface = createCurrentToolSurface(port);

    await surface.snapshot();
    controller.abort();

    await expect(
      surface.execute('update_household_member', '{}'),
    ).rejects.toThrow(/current|available|registered/i);
    expect(handler).not.toHaveBeenCalled();
  });

  it('executes the current tool and returns its exact result string', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const result = '{"ok":true,"message":"exact"}';
    const handler = vi.fn(async (input: unknown) => {
      expect(input).toEqual({ value: 7 });
      return result;
    });
    const port = new FakeModelContextPort();
    await port.registerTool(makeTool('add_income_source', handler));

    const surface = createCurrentToolSurface(port);
    await expect(
      surface.execute('add_income_source', '{"value":7}'),
    ).resolves.toBe(result);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('serializes conflicting mutation calls in order', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const first = deferred<string>();
    const handler = vi
      .fn<ToolDefinition['handler']>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce('second');
    const port = new FakeModelContextPort();
    await port.registerTool(makeTool('add_household_member', handler));
    const surface = createCurrentToolSurface(port);

    const firstCall = surface.execute('add_household_member', '{}');
    await Promise.resolve();
    const secondCall = surface.execute('add_household_member', '{}');
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    first.resolve('first');
    await expect(firstCall).resolves.toBe('first');
    await expect(secondCall).resolves.toBe('second');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does not block a read-only call behind a pending mutation', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const mutation = deferred<string>();
    const mutationHandler = vi.fn(() => mutation.promise);
    const readHandler = vi.fn(async () => 'read-result');
    const port = new FakeModelContextPort();
    await port.registerTool(makeTool('add_household_member', mutationHandler));
    await port.registerTool(
      makeTool('get_application_progress', readHandler, true),
    );
    const surface = createCurrentToolSurface(port);

    const mutationCall = surface.execute('add_household_member', '{}');
    await Promise.resolve();
    await expect(
      surface.execute('get_application_progress', '{}'),
    ).resolves.toBe('read-result');
    expect(readHandler).toHaveBeenCalledTimes(1);

    mutation.resolve('mutation-result');
    await expect(mutationCall).resolves.toBe('mutation-result');
  });

  it('rejects an already-aborted call without invoking the tool', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const handler = vi.fn(async () => 'must not execute');
    const port = new FakeModelContextPort();
    await port.registerTool(makeTool('get_next_actions', handler, true));
    const surface = createCurrentToolSurface(port);
    const controller = new AbortController();
    controller.abort();

    await expect(
      surface.execute('get_next_actions', '{}', controller.signal),
    ).rejects.toThrow(/abort/i);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not return stale success after an in-flight call is aborted', async () => {
    const { createCurrentToolSurface } = await import(
      /* @vite-ignore */
      '../../src/assistant/current-tool-surface'
    );
    const result = deferred<string>();
    const port = new FakeModelContextPort();
    await port.registerTool(
      makeTool('get_application_progress', () => result.promise, true),
    );
    const surface = createCurrentToolSurface(port);
    const controller = new AbortController();
    const call = surface.execute(
      'get_application_progress',
      '{}',
      controller.signal,
    );

    await Promise.resolve();
    controller.abort();
    result.resolve('{"ok":true,"stale":true}');

    await expect(call).rejects.toThrow(/abort/i);
  });
});
