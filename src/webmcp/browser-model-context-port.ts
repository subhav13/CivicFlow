import type {
  ModelContextPort,
  RegisteredToolRef,
  ToolDefinition,
} from './model-context-port';

function normalizeExecutionResult(value: string): string {
  // WebMCP stringifies the value returned by a tool callback. CivicFlow's
  // internal handlers also return serialized receipts so the in-process port
  // can stay transport-neutral. Unwrap exactly that one browser boundary,
  // while preserving ordinary object JSON and legacy text results.
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : value;
  } catch {
    return value;
  }
}

/**
 * Browser adapter for document.modelContext.
 *
 * This is the ONLY source file in the application permitted to reference
 * document.modelContext. Unsupported browsers feature-detect safely and never
 * crash on startup.
 */
export class BrowserModelContextPort implements ModelContextPort {
  isAvailable(): boolean {
    return (
      typeof document !== 'undefined' &&
      typeof document.modelContext !== 'undefined' &&
      document.modelContext !== null
    );
  }

  async registerTool(
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }
    const context = document.modelContext;
    if (!context) {
      return;
    }
    await context.registerTool(
      {
        name: definition.name,
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: definition.annotations,
        execute: definition.handler,
      },
      options,
    );
  }

  async getTools(options?: {
    signal?: AbortSignal;
  }): Promise<RegisteredToolRef[]> {
    if (!this.isAvailable()) {
      return [];
    }
    const context = document.modelContext;
    if (!context) {
      return [];
    }
    const tools = await context.getTools(options);
    return tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }));
  }

  async executeTool(
    tool: RegisteredToolRef,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error(
        'document.modelContext is unavailable in this browser environment',
      );
    }
    const context = document.modelContext;
    if (!context) {
      throw new Error(
        'document.modelContext is unavailable in this browser environment',
      );
    }
    const serializedResult = await context.executeTool(tool, input, options);
    return normalizeExecutionResult(serializedResult);
  }

  subscribeToolChange(listener: () => void): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }
    const context = document.modelContext;
    if (!context) {
      return () => {};
    }

    context.addEventListener('toolchange', listener);
    return () => {
      try {
        context.removeEventListener('toolchange', listener);
      } catch {
        // Safe disposal on torn-down contexts
      }
    };
  }
}
