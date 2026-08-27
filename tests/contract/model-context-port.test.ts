import { describe, expect, it, vi } from 'vitest';

import { type ToolDefinition } from '../../src/webmcp/model-context-port';
import { BrowserModelContextPort } from '../../src/webmcp/browser-model-context-port';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';

describe('ModelContextPort Contract', () => {
  describe('BrowserModelContextPort', () => {
    it('reports unavailable when document.modelContext is missing', () => {
      const port = new BrowserModelContextPort();
      expect(port.isAvailable()).toBe(false);
    });

    it('returns empty tool list and handles registrations gracefully when unavailable', async () => {
      const port = new BrowserModelContextPort();
      const tools = await port.getTools();
      expect(tools).toEqual([]);

      const unsubscribe = port.subscribeToolChange(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('never throws on unavailable browser execution', async () => {
      const port = new BrowserModelContextPort();
      await expect(
        port.executeTool(
          {
            name: 'test_tool',
            title: 'Test',
            description: 'Test',
            inputSchema: {},
          },
          {},
        ),
      ).rejects.toThrow(/unavailable/i);
    });

    it('browser adapter sends execute (not handler) to document.modelContext.registerTool', async () => {
      // Strict browser-like double: only accepts the current WebMCP contract property `execute`.
      // Rejects any registration that uses `handler` instead.
      const registrations: unknown[] = [];
      const strictBrowserContext = {
        registerTool(definition: unknown): Promise<void> {
          const def = definition as Record<string, unknown>;
          if (typeof def['execute'] !== 'function') {
            return Promise.reject(
              new Error(
                `WebMCP contract violation: tool registration must use 'execute', got keys: ${Object.keys(def).join(', ')}`,
              ),
            );
          }
          if (typeof def['handler'] === 'function') {
            return Promise.reject(
              new Error(
                `WebMCP contract violation: 'handler' is an internal property and must not be forwarded to the browser API`,
              ),
            );
          }
          registrations.push(definition);
          return Promise.resolve();
        },
        getTools: () => Promise.resolve([]),
        executeTool: () => Promise.resolve(''),
        addEventListener: () => {},
        removeEventListener: () => {},
      };

      // Install the strict browser double on document.
      Object.defineProperty(document, 'modelContext', {
        value: strictBrowserContext,
        configurable: true,
        writable: true,
      });

      try {
        const executeSpy = vi.fn(async () => JSON.stringify({ ok: true }));
        const port = new BrowserModelContextPort();
        expect(port.isAvailable()).toBe(true);

        const definition: ToolDefinition = {
          name: 'get_application_progress',
          title: 'Get Application Progress',
          description: 'Returns current progress',
          inputSchema: { type: 'object', additionalProperties: false },
          annotations: { readOnlyHint: true },
          handler: executeSpy,
        };

        // Must succeed with the strict browser double (execute present, handler absent).
        await port.registerTool(definition);

        // The registration must have been forwarded with execute, not handler.
        expect(registrations).toHaveLength(1);
        const sent = registrations[0] as Record<string, unknown>;
        expect(typeof sent['execute']).toBe('function');
        expect('handler' in sent).toBe(false);

        // The execute callback must invoke the internal handler.
        const executeCallback = sent['execute'] as (
          input: unknown,
          options?: { signal?: AbortSignal },
        ) => Promise<string>;
        const result = await executeCallback({ applicantId: 'test' });
        expect(executeSpy).toHaveBeenCalledWith({ applicantId: 'test' });
        expect(result).toBe(JSON.stringify({ ok: true }));
      } finally {
        // Restore the absent modelContext for subsequent tests.
        Object.defineProperty(document, 'modelContext', {
          value: undefined,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('FakeModelContextPort', () => {
    const sampleTool: ToolDefinition = {
      name: 'get_application_progress',
      title: 'Get Application Progress',
      description: 'Get synthetic demo progress',
      inputSchema: { type: 'object', additionalProperties: false },
      annotations: { readOnlyHint: true },
      handler: vi.fn(async () =>
        JSON.stringify({ ok: true, message: 'Sample output' }),
      ),
    };

    it('reports available by default', () => {
      const port = new FakeModelContextPort();
      expect(port.isAvailable()).toBe(true);
    });

    it('registers and retrieves tool snapshots without handlers', async () => {
      const port = new FakeModelContextPort();
      await port.registerTool(sampleTool);

      const tools = await port.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        name: 'get_application_progress',
        title: 'Get Application Progress',
        description: 'Get synthetic demo progress',
        inputSchema: { type: 'object', additionalProperties: false },
        annotations: { readOnlyHint: true },
      });
      expect('handler' in tools[0]).toBe(false);
    });

    it('rejects duplicate tool registrations with fatal error', async () => {
      const port = new FakeModelContextPort();
      await port.registerTool(sampleTool);

      await expect(port.registerTool(sampleTool)).rejects.toThrow(
        /already registered/i,
      );
    });

    it('executes registered tool handler and returns result string', async () => {
      const port = new FakeModelContextPort();
      await port.registerTool(sampleTool);

      const tools = await port.getTools();
      const output = await port.executeTool(tools[0], {});
      expect(JSON.parse(output)).toEqual({
        ok: true,
        message: 'Sample output',
      });
      expect(sampleTool.handler).toHaveBeenCalled();
    });

    it('rejects execution of unregistered tools', async () => {
      const port = new FakeModelContextPort();
      await expect(
        port.executeTool(
          {
            name: 'unregistered_tool',
            title: 'Unregistered',
            description: 'Unregistered',
            inputSchema: {},
          },
          {},
        ),
      ).rejects.toThrow(/not registered/i);
    });

    it('notifies subscribers on tool registration and unregistration', async () => {
      const port = new FakeModelContextPort();
      const listener = vi.fn();
      const unsubscribe = port.subscribeToolChange(listener);

      const controller = new AbortController();
      await port.registerTool(sampleTool, { signal: controller.signal });
      expect(listener).toHaveBeenCalledTimes(1);

      controller.abort();
      expect(listener).toHaveBeenCalledTimes(2);

      const tools = await port.getTools();
      expect(tools).toHaveLength(0);

      unsubscribe();
      const secondTool: ToolDefinition = {
        name: 'navigate_to_section',
        title: 'Navigate',
        description: 'Navigate',
        inputSchema: {},
        handler: async () => '{}',
      };
      await port.registerTool(secondTool);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('honors abort signal passed during registration', async () => {
      const port = new FakeModelContextPort();
      const controller = new AbortController();
      controller.abort();

      await expect(
        port.registerTool(sampleTool, { signal: controller.signal }),
      ).rejects.toThrow(/aborted/i);

      const tools = await port.getTools();
      expect(tools).toHaveLength(0);
    });

    it('honors abort signal during getTools and executeTool', async () => {
      const port = new FakeModelContextPort();
      await port.registerTool(sampleTool);
      const tools = await port.getTools();

      const controller = new AbortController();
      controller.abort();

      await expect(
        port.getTools({ signal: controller.signal }),
      ).rejects.toThrow(/aborted/i);

      await expect(
        port.executeTool(tools[0], {}, { signal: controller.signal }),
      ).rejects.toThrow(/aborted/i);
    });
  });
});
