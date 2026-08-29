import type {
  ModelContextPort,
  RegisteredToolRef,
} from '../webmcp/model-context-port';
import type { CurrentToolSurface } from './types';

function runWithAbort<T>(
  signal: AbortSignal | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new Error('Operation was aborted'));
  }
  if (!signal) {
    return operation();
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(new Error('Operation was aborted'));
    };

    signal.addEventListener('abort', handleAbort, { once: true });

    operation().then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        if (signal.aborted) {
          reject(new Error('Operation was aborted'));
        } else {
          resolve(value);
        }
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalizeInputSchema(
  inputSchema: unknown,
): Record<string, unknown> | undefined {
  let parsedSchema: unknown = inputSchema;
  if (typeof inputSchema === 'string') {
    try {
      parsedSchema = JSON.parse(inputSchema);
    } catch {
      return undefined;
    }
  }
  return isRecord(parsedSchema) ? parsedSchema : undefined;
}

function sanitizeToolRef(
  tool: RegisteredToolRef,
): RegisteredToolRef | undefined {
  const inputSchema = canonicalizeInputSchema(tool.inputSchema);
  if (!inputSchema) return undefined;

  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema,
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
  };
}

export function createCurrentToolSurface(
  port: ModelContextPort,
): CurrentToolSurface {
  let pendingMutationCount = 0;
  let mutationQueue: Promise<unknown> = Promise.resolve();

  return {
    async snapshot(signal?: AbortSignal): Promise<RegisteredToolRef[]> {
      const tools = await runWithAbort(signal, () =>
        port.getTools(signal ? { signal } : undefined),
      );
      return tools.flatMap((tool) => {
        const sanitized = sanitizeToolRef(tool);
        return sanitized ? [sanitized] : [];
      });
    },

    subscribe(listener: () => void): () => void {
      return port.subscribeToolChange(listener);
    },

    async execute(
      name: string,
      argumentsJson: string,
      signal?: AbortSignal,
    ): Promise<string> {
      if (signal?.aborted) {
        throw new Error('Operation was aborted');
      }

      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(argumentsJson);
      } catch (error) {
        throw new Error(
          `Invalid JSON arguments for tool "${name}": ${(error as Error).message}`,
        );
      }

      const initialTools = await runWithAbort(signal, () =>
        port.getTools(signal ? { signal } : undefined),
      );
      if (signal?.aborted) {
        throw new Error('Operation was aborted');
      }

      const initialToolRef = initialTools.find((tool) => tool.name === name);
      if (!initialToolRef) {
        throw new Error(
          `Tool "${name}" is not currently registered or available`,
        );
      }

      const isReadOnly = Boolean(initialToolRef.annotations?.readOnlyHint);
      if (isReadOnly) {
        return runWithAbort(signal, () =>
          port.executeTool(
            initialToolRef,
            parsedArgs,
            signal ? { signal } : undefined,
          ),
        );
      }

      const runDirectMutation = async (
        toolRef: RegisteredToolRef,
      ): Promise<string> => {
        return runWithAbort(signal, () =>
          port.executeTool(
            toolRef,
            parsedArgs,
            signal ? { signal } : undefined,
          ),
        );
      };

      if (pendingMutationCount === 0) {
        pendingMutationCount += 1;
        const directPromise = runDirectMutation(initialToolRef);
        mutationQueue = directPromise.catch(() => {});
        try {
          return await directPromise;
        } finally {
          pendingMutationCount -= 1;
        }
      }

      pendingMutationCount += 1;
      const queuedExecution = mutationQueue.then(async () => {
        if (signal?.aborted) {
          throw new Error('Operation was aborted');
        }
        const freshTools = await runWithAbort(signal, () =>
          port.getTools(signal ? { signal } : undefined),
        );
        if (signal?.aborted) {
          throw new Error('Operation was aborted');
        }
        const freshToolRef = freshTools.find((tool) => tool.name === name);
        if (!freshToolRef) {
          throw new Error(
            `Tool "${name}" is not currently registered or available`,
          );
        }
        return runDirectMutation(freshToolRef);
      });

      mutationQueue = queuedExecution.catch(() => {});
      try {
        return await queuedExecution;
      } finally {
        pendingMutationCount -= 1;
      }
    },
  };
}
