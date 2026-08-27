/**
 * Isolated draft ambient types for the W3C WebMCP draft Community Group Report
 * and Chrome/OpenAI prototype implementations.
 *
 * All references to document.modelContext in application source are isolated
 * to src/webmcp/browser-model-context-port.ts.
 */

export interface ModelContextToolDefinition {
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
}

export interface ModelContextRegisteredTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

export interface ModelContext {
  registerTool(
    tool: ModelContextToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  getTools(options?: {
    signal?: AbortSignal;
  }): Promise<ModelContextRegisteredTool[]>;
  executeTool(
    tool: ModelContextRegisteredTool,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
  addEventListener(type: 'toolchange', listener: () => void): void;
  removeEventListener(type: 'toolchange', listener: () => void): void;
  ontoolchange?: (() => void) | null;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}
