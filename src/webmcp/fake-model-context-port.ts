import type {
  ModelContextPort,
  RegisteredToolRef,
  ToolDefinition,
} from './model-context-port';

/**
 * Deterministic in-memory ModelContextPort for contract and integration testing.
 *
 * Implements duplicate-name rejection, abort signal cleanup, execution,
 * snapshot isolation, and change subscriptions.
 */
export class FakeModelContextPort implements ModelContextPort {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly listeners = new Set<() => void>();
  private readonly available: boolean;
  private registerDelayMs: number;

  constructor(options: { available?: boolean; registerDelayMs?: number } = {}) {
    this.available = options.available ?? true;
    this.registerDelayMs = options.registerDelayMs ?? 0;
  }

  setRegisterDelay(ms: number): void {
    this.registerDelayMs = ms;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async registerTool(
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    if (!this.available) {
      return;
    }
    if (options?.signal?.aborted) {
      throw new Error('Registration aborted');
    }
    if (this.registerDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          options?.signal?.removeEventListener('abort', onAbort);
          resolve();
        }, this.registerDelayMs);
        const onAbort = () => {
          clearTimeout(timeout);
          reject(new Error('Registration aborted'));
        };
        options?.signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
    if (options?.signal?.aborted) {
      throw new Error('Registration aborted');
    }
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool "${definition.name}" is already registered`);
    }
    this.tools.set(definition.name, definition);

    if (options?.signal) {
      const onAbort = () => {
        if (this.tools.get(definition.name) === definition) {
          this.tools.delete(definition.name);
          this.notifyChange();
        }
      };
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    this.notifyChange();
  }

  async getTools(options?: {
    signal?: AbortSignal;
  }): Promise<RegisteredToolRef[]> {
    if (!this.available) {
      return [];
    }
    if (options?.signal?.aborted) {
      throw new Error('Operation aborted');
    }
    return Array.from(this.tools.values()).map((tool) => ({
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
    if (!this.available) {
      throw new Error('Model context is unavailable in this environment');
    }
    if (options?.signal?.aborted) {
      throw new Error('Execution aborted');
    }
    const registered = this.tools.get(tool.name);
    if (!registered) {
      throw new Error(`Tool "${tool.name}" is not registered`);
    }
    return registered.handler(input, options);
  }

  subscribeToolChange(listener: () => void): () => void {
    if (!this.available) {
      return () => {};
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Listener errors do not block port lifecycle
      }
    }
  }
}
