import { BrowserModelContextPort } from './browser-model-context-port';
import type {
  ModelContextPort,
  RegisteredToolRef,
  ToolDefinition,
} from './model-context-port';

/**
 * First-party in-process ModelContextPort for browser environments where
 * document.modelContext is unavailable (such as localhost / dev mode).
 *
 * Implements tool registration, execution, change notification, and cancellation
 * without importing or depending on testing fakes.
 */
export class InProcessModelContextPort implements ModelContextPort {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly listeners = new Set<() => void>();

  isAvailable(): boolean {
    return true;
  }

  async registerTool(
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
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
        // Safe dispatch: listener errors do not break registry lifecycle
      }
    }
  }
}

/**
 * Creates the appropriate ModelContextPort for the current runtime environment.
 * If document.modelContext is present, uses the browser adapter; otherwise,
 * uses the in-process port.
 */
export function createDefaultModelContextPort(): ModelContextPort {
  const browserPort = new BrowserModelContextPort();
  if (browserPort.isAvailable()) {
    return browserPort;
  }
  return new InProcessModelContextPort();
}
