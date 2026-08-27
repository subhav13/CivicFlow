import type { Page } from '@playwright/test';
import type { RegisteredToolRef } from '../../src/webmcp/model-context-port';

export interface ModelContextToolEnvelope<T = unknown> {
  ok: boolean;
  tool: string;
  actionId: string;
  changed?: boolean;
  message?: string;
  data?: T;
  stateRevision: number;
  visibleEffect?: string;
  code?: string;
  recoverable?: boolean;
  fieldErrors?: Record<string, string>;
}

/**
 * Installs a deterministic W3C WebMCP document.modelContext implementation
 * before the application loads in a Playwright browser page.
 */
export async function installBrowserModelContext(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type ToolEntry = {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: {
        readOnlyHint?: boolean;
        untrustedContentHint?: boolean;
      };
      execute: (
        input: unknown,
        options?: { signal?: AbortSignal },
      ) => Promise<string> | string;
    };

    const registered = new Map<string, ToolEntry>();
    const listeners = new Set<() => void>();
    let executionDelayMs = 0;
    function notify() {
      for (const listener of Array.from(listeners)) {
        try {
          listener();
        } catch {
          // Keep notification loop resilient
        }
      }
    }

    const modelContext = {
      setExecutionDelay(ms: number): void {
        executionDelayMs = Math.max(0, ms);
      },
      async registerTool(
        definition: ToolEntry,
        options?: { signal?: AbortSignal },
      ): Promise<void> {
        if (options?.signal?.aborted) return;
        if (registered.has(definition.name)) {
          throw new Error(`Duplicate tool: ${definition.name}`);
        }
        registered.set(definition.name, { ...definition });

        if (options?.signal) {
          options.signal.addEventListener(
            'abort',
            () => {
              if (registered.has(definition.name)) {
                registered.delete(definition.name);
                notify();
              }
            },
            { once: true },
          );
        }

        notify();
      },

      async getTools(options?: {
        signal?: AbortSignal;
      }): Promise<RegisteredToolRef[]> {
        if (options?.signal?.aborted) return [];
        return Array.from(registered.values()).map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        }));
      },

      async executeTool(
        tool: RegisteredToolRef,
        input: unknown,
        options?: { signal?: AbortSignal },
      ): Promise<string> {
        if (options?.signal?.aborted) {
          throw new Error('Tool execution aborted');
        }
        const entry = registered.get(tool.name);
        if (!entry) {
          throw new Error(`Tool not registered: ${tool.name}`);
        }
        const result = await entry.execute(input, options);
        if (executionDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, executionDelayMs));
        }
        return result;
      },

      addEventListener(type: string, listener: () => void): void {
        if (type === 'toolchange') {
          listeners.add(listener);
        }
      },

      removeEventListener(type: string, listener: () => void): void {
        if (type === 'toolchange') {
          listeners.delete(listener);
        }
      },
    };

    Object.defineProperty(document, 'modelContext', {
      value: modelContext,
      configurable: true,
      writable: true,
    });
  });
}

export async function getBrowserTools(
  page: Page,
): Promise<RegisteredToolRef[]> {
  return page.evaluate(async () => {
    if (!document.modelContext) return [];
    return document.modelContext.getTools();
  });
}

export async function executeBrowserTool<T = unknown>(
  page: Page,
  name: string,
  input: unknown = {},
): Promise<ModelContextToolEnvelope<T>> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      if (!document.modelContext) {
        throw new Error('document.modelContext is not defined');
      }
      const tools = await document.modelContext.getTools();
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool not registered: ${toolName}`);
      }
      const resultJson = await document.modelContext.executeTool(
        tool,
        toolInput,
      );
      return typeof resultJson === 'string'
        ? JSON.parse(resultJson)
        : resultJson;
    },
    { toolName: name, toolInput: input },
  );
}

export async function setBrowserExecutionDelay(
  page: Page,
  delayMs: number,
): Promise<void> {
  await page.evaluate((ms) => {
    const ctx = document.modelContext as unknown as {
      setExecutionDelay?: (delay: number) => void;
    };
    if (ctx && typeof ctx.setExecutionDelay === 'function') {
      ctx.setExecutionDelay(ms);
    }
  }, delayMs);
}

export const setExecutionDelay = setBrowserExecutionDelay;
