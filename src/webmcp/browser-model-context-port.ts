import type {
  ModelContextPort,
  RegisteredToolRef,
  ToolDefinition,
} from './model-context-port';

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
    return context.executeTool(tool, input, options);
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
