import { describe, expect, it, vi } from 'vitest';

import { createCurrentToolSurface } from '../../src/assistant/current-tool-surface';
import type { RegisteredToolRef } from '../../src/webmcp/model-context-port';
import type { ModelContextPort } from '../../src/webmcp/model-context-port';
import { TOOL_CATALOG } from '../../src/webmcp/tool-catalog';

function makeTool(
  name: string,
  options: Partial<RegisteredToolRef> = {},
): RegisteredToolRef {
  return {
    name,
    title: name.replaceAll('_', ' '),
    description: `Description for ${name}`,
    inputSchema: {
      type: 'object',
      properties: { value: { type: 'string' } },
      additionalProperties: false,
    },
    ...options,
  };
}

function makeSurface(tools: RegisteredToolRef[] = []) {
  let currentTools = tools;
  const execute = vi.fn(async () => '{"ok":true}');
  return {
    snapshot: vi.fn(async () => currentTools),
    execute,
    subscribe: vi.fn(() => () => {}),
    setTools(next: RegisteredToolRef[]) {
      currentTools = next;
    },
  };
}

function makeBrowserPort(
  tool: RegisteredToolRef,
  executeTool: ModelContextPort['executeTool'] = async () => '{"ok":true}',
): ModelContextPort {
  return {
    isAvailable: () => true,
    registerTool: async () => {},
    getTools: async () => [tool],
    executeTool,
    subscribeToolChange: () => () => {},
  };
}

describe('Gemini tool bridge Contract (Phase 2 Packet 2.2)', () => {
  it('maps one registered tool to an exact provider-neutral function declaration', async () => {
    const { mapRegisteredTool } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-function-mapper'
    );
    const tool = makeTool('get_application_progress', {
      annotations: { readOnlyHint: true },
    });

    expect(mapRegisteredTool(tool)).toEqual({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    });
  });

  it('maps a tool list without leaking handlers or changing order/schema identity', async () => {
    const { mapRegisteredTools } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-function-mapper'
    );
    const tools = [
      makeTool('get_application_progress'),
      makeTool('navigate_to_section'),
    ];

    const mapped = mapRegisteredTools(tools);

    expect(mapped.map((tool) => tool.name)).toEqual([
      'get_application_progress',
      'navigate_to_section',
    ]);
    expect(mapped[0]?.parameters).toBe(tools[0]?.inputSchema);
    expect(mapped[0]).not.toHaveProperty('handler');
  });

  it('refreshes provider declarations from the current tool snapshot', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('get_application_progress')]);
    const bridge = createGeminiToolBridge(surface);

    await expect(bridge.listFunctions()).resolves.toHaveLength(1);
    surface.setTools([makeTool('get_next_actions')]);
    await expect(bridge.listFunctions()).resolves.toEqual([
      expect.objectContaining({ name: 'get_next_actions' }),
    ]);
  });

  it('uses normalized browser schemas for declarations and validation while preserving the raw execution ref', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const canonicalSchema = JSON.parse(
      JSON.stringify(TOOL_CATALOG.add_household_member.inputSchema),
    ) as Record<string, unknown>;
    const rawTool = makeTool('add_household_member', {
      inputSchema: JSON.stringify(
        canonicalSchema,
      ) as unknown as RegisteredToolRef['inputSchema'],
    });
    const executeTool = vi.fn(async () => '{"ok":true}');
    const bridge = createGeminiToolBridge(
      createCurrentToolSurface(makeBrowserPort(rawTool, executeTool)),
    );
    const completeCall = {
      callId: 'call-browser-schema-complete',
      name: 'add_household_member',
      argumentsJson: JSON.stringify({
        firstName: 'Maya',
        ageYears: 32,
        relationship: 'spouse',
        applyingForCoverage: true,
      }),
    };

    await expect(bridge.listFunctions()).resolves.toEqual([
      expect.objectContaining({
        name: 'add_household_member',
        parameters: canonicalSchema,
      }),
    ]);
    await expect(bridge.executeToolCall(completeCall)).resolves.toMatchObject({
      kind: 'confirmation_required',
      callId: completeCall.callId,
    });
    expect(executeTool).not.toHaveBeenCalled();

    await expect(
      bridge.executeToolCall({
        callId: 'call-browser-schema-incomplete',
        name: 'add_household_member',
        argumentsJson: JSON.stringify({
          firstName: 'Maya',
          relationship: 'spouse',
        }),
      }),
    ).resolves.toMatchObject({
      kind: 'invalid_arguments',
      code: 'INVALID_ARGUMENTS',
      missingFields: ['ageYears', 'applyingForCoverage'],
    });
    expect(executeTool).not.toHaveBeenCalled();

    await expect(
      bridge.executeToolCall(completeCall, { confirmed: true }),
    ).resolves.toMatchObject({
      kind: 'result',
      callId: completeCall.callId,
    });
    expect(executeTool).toHaveBeenCalledWith(
      rawTool,
      {
        firstName: 'Maya',
        ageYears: 32,
        relationship: 'spouse',
        applyingForCoverage: true,
      },
      undefined,
    );
  });

  it('does not expose malformed browser schemas or execute their tools', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const rawTool = makeTool('broken_schema_tool', {
      inputSchema:
        '{"type":"object"' as unknown as RegisteredToolRef['inputSchema'],
    });
    const executeTool = vi.fn(async () => '{"ok":true}');
    const bridge = createGeminiToolBridge(
      createCurrentToolSurface(makeBrowserPort(rawTool, executeTool)),
    );

    await expect(bridge.listFunctions()).resolves.toEqual([]);
    await expect(
      bridge.executeToolCall({
        callId: 'call-browser-schema-malformed',
        name: 'broken_schema_tool',
        argumentsJson: '{}',
      }),
    ).resolves.toMatchObject({
      kind: 'error',
      callId: 'call-browser-schema-malformed',
    });
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('round-trips the exact WebMCP result and original argument JSON', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('get_application_progress')]);
    const exactResult = '{"ok":true,"message":"do not reserialize"}';
    surface.execute.mockResolvedValue(exactResult);
    const bridge = createGeminiToolBridge(surface);

    await expect(
      bridge.executeToolCall({
        callId: 'call-1',
        name: 'get_application_progress',
        argumentsJson: '{"value":"x"}',
      }),
    ).resolves.toEqual({
      kind: 'result',
      callId: 'call-1',
      result: exactResult,
    });
    expect(surface.execute).toHaveBeenCalledWith(
      'get_application_progress',
      '{"value":"x"}',
      undefined,
    );
  });

  it('rejects invalid JSON without executing a tool', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('get_application_progress')]);
    const bridge = createGeminiToolBridge(surface);

    await expect(
      bridge.executeToolCall({
        callId: 'call-2',
        name: 'get_application_progress',
        argumentsJson: '{invalid',
      }),
    ).resolves.toMatchObject({
      kind: 'invalid_arguments',
      callId: 'call-2',
    });
    expect(surface.execute).not.toHaveBeenCalled();
  });

  it('rejects incomplete household arguments before confirmation or execution', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([TOOL_CATALOG.add_household_member]);
    const bridge = createGeminiToolBridge(surface);
    const partialArguments = {
      firstName: 'Sensitive Name',
      relationship: 'spouse',
    };

    const response = await bridge.executeToolCall({
      callId: 'call-incomplete-household',
      name: 'add_household_member',
      argumentsJson: JSON.stringify(partialArguments),
    });

    expect(response).toEqual({
      kind: 'invalid_arguments',
      code: 'INVALID_ARGUMENTS',
      callId: 'call-incomplete-household',
      toolName: 'add_household_member',
      message: expect.any(String),
      providedFields: ['firstName', 'relationship'],
      missingFields: ['ageYears', 'applyingForCoverage'],
      invalidFields: [],
    });
    expect(response.kind).not.toBe('confirmation_required');
    expect(surface.execute).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain('Sensitive Name');
  });

  it('preserves confirmation and executes a complete mutation exactly once', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([TOOL_CATALOG.add_household_member]);
    const bridge = createGeminiToolBridge(surface);
    const call = {
      callId: 'call-complete-household',
      name: 'add_household_member',
      argumentsJson: JSON.stringify({
        firstName: 'Maya',
        ageYears: 32,
        relationship: 'spouse',
        applyingForCoverage: true,
      }),
    };

    await expect(bridge.executeToolCall(call)).resolves.toMatchObject({
      kind: 'confirmation_required',
      callId: call.callId,
      toolName: call.name,
    });
    expect(surface.execute).not.toHaveBeenCalled();

    await expect(
      bridge.executeToolCall(call, { confirmed: true }),
    ).resolves.toMatchObject({ kind: 'result', callId: call.callId });
    expect(surface.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects a tool that disappeared after the assistant snapshot', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('update_income_source')]);
    const bridge = createGeminiToolBridge(surface);
    await bridge.listFunctions();
    surface.setTools([]);

    await expect(
      bridge.executeToolCall({
        callId: 'call-3',
        name: 'update_income_source',
        argumentsJson: '{}',
      }),
    ).resolves.toMatchObject({
      kind: 'error',
      callId: 'call-3',
    });
    expect(surface.execute).not.toHaveBeenCalled();
  });

  it('returns a bounded bridge error for upstream failure without inventing state', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('get_application_progress')]);
    const upstreamDetails = 'upstream failure details '.repeat(100);
    surface.execute.mockRejectedValue(new Error(upstreamDetails));
    const bridge = createGeminiToolBridge(surface);

    await expect(
      bridge.executeToolCall({
        callId: 'call-4',
        name: 'get_application_progress',
        argumentsJson: '{}',
      }),
    ).resolves.toMatchObject({
      kind: 'error',
      callId: 'call-4',
    });
    const response = await bridge.executeToolCall({
      callId: 'call-4b',
      name: 'get_application_progress',
      argumentsJson: '{}',
    });
    expect(response).toMatchObject({ kind: 'error', callId: 'call-4b' });
    expect(
      response.kind === 'error' ? response.message.length : 0,
    ).toBeLessThanOrEqual(200);
    expect(JSON.stringify(response)).not.toContain(upstreamDetails);
  });

  it('returns a generic bridge error for an uncompilable tool schema', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([
      makeTool('broken_schema_tool', {
        inputSchema: {
          type: 'object',
          properties: { value: { type: 'not-a-json-schema-type' } },
        },
      }),
    ]);
    const bridge = createGeminiToolBridge(surface);

    const response = await bridge.executeToolCall({
      callId: 'call-broken-schema',
      name: 'broken_schema_tool',
      argumentsJson: '{}',
    });

    expect(response).toEqual({
      kind: 'error',
      callId: 'call-broken-schema',
      message: 'Tool schema could not be compiled.',
    });
    expect(response).not.toHaveProperty('invalidFields');
    expect(surface.execute).not.toHaveBeenCalled();
  });

  it('requires confirmation before a mutation and executes only after confirmation', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([makeTool('add_household_member')]);
    const bridge = createGeminiToolBridge(surface);
    const call = {
      callId: 'call-5',
      name: 'add_household_member',
      argumentsJson: '{}',
    };

    await expect(bridge.executeToolCall(call)).resolves.toMatchObject({
      kind: 'confirmation_required',
      callId: 'call-5',
      toolName: 'add_household_member',
    });
    expect(surface.execute).not.toHaveBeenCalled();

    await expect(
      bridge.executeToolCall(call, { confirmed: true }),
    ).resolves.toMatchObject({ kind: 'result', callId: 'call-5' });
    expect(surface.execute).toHaveBeenCalledTimes(1);
  });

  it('does not expose a submit or attest registration to provider declarations', async () => {
    const { createGeminiToolBridge } = await import(
      /* @vite-ignore */
      '../../src/assistant/gemini-tool-bridge'
    );
    const surface = makeSurface([
      makeTool('get_application_progress'),
      makeTool('submit_application'),
      makeTool('attest_application'),
      makeTool('submitApplication'),
      makeTool('attestApplication'),
    ]);
    const bridge = createGeminiToolBridge(surface);

    const functions = await bridge.listFunctions();

    expect(functions.map((tool) => tool.name)).toEqual([
      'get_application_progress',
    ]);
  });
});
