export interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface RegisteredToolRef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ToolAnnotations;
}

export type ToolHandler = (
  input: unknown,
  options?: { signal?: AbortSignal },
) => Promise<string> | string;

export interface ToolDefinition extends RegisteredToolRef {
  handler: ToolHandler;
}

export interface ModelContextPort {
  isAvailable(): boolean;
  registerTool(
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  getTools(options?: { signal?: AbortSignal }): Promise<RegisteredToolRef[]>;
  executeTool(
    tool: RegisteredToolRef,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
  subscribeToolChange(listener: () => void): () => void;
}
