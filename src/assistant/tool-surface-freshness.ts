import { classifyToolIntent } from './confirmation-policy';
import type { CurrentToolSurface } from './types';
import type { RegisteredToolRef } from '../webmcp/model-context-port';

export interface ToolSurfaceFreshnessCoordinatorOptions {
  surface: CurrentToolSurface;
  reconnect: () => Promise<void>;
  isSafeToRefresh: () => boolean;
  onRefreshStart?: () => void | Promise<void>;
  onRefreshComplete?: () => void | Promise<void>;
  onRefreshFailure?: (error: unknown) => void | Promise<void>;
  debounceMs?: number;
}

export interface ToolSurfaceFreshnessCoordinator {
  start(): Promise<void>;
  beforeTurn(): Promise<boolean>;
  notifySafeBoundary(): void;
  stop(): void;
  dispose(): void;
}

export class ToolSurfaceRefreshError extends Error {
  constructor() {
    super('Assistant tool surface could not be refreshed.');
    this.name = 'ToolSurfaceRefreshError';
  }
}

type CanonicalTool = Pick<
  RegisteredToolRef,
  'name' | 'description' | 'inputSchema'
> & {
  annotations?: RegisteredToolRef['annotations'];
};

function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return Number.isFinite(value) ? String(value) : JSON.stringify(null);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'bigint':
      return `bigint:${value.toString()}`;
    case 'function':
    case 'symbol':
      return `${typeof value}:unsupported`;
    case 'object':
      if (Array.isArray(value)) {
        return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
      }
      return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${stableSerialize(
              (value as Record<string, unknown>)[key],
            )}`,
        )
        .join(',')}}`;
  }
  return 'undefined';
}

function declaredTools(tools: readonly RegisteredToolRef[]): CanonicalTool[] {
  return tools
    .filter((tool) => classifyToolIntent(tool).kind !== 'deny')
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function canonicalizeToolSurface(
  tools: readonly RegisteredToolRef[],
): string {
  return stableSerialize(declaredTools(tools));
}

/**
 * This is a change-detection hash, not a security primitive. A deterministic
 * local hash avoids async Web Crypto work in the tool-change callback while
 * keeping the exact declared surface in the serialized input.
 */
export function hashToolSurface(tools: readonly RegisteredToolRef[]): string {
  const serialized = canonicalizeToolSurface(tools);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createToolSurfaceFreshnessCoordinator(
  options: ToolSurfaceFreshnessCoordinatorOptions,
): ToolSurfaceFreshnessCoordinator {
  const debounceMs = Math.max(0, options.debounceMs ?? 0);
  let started = false;
  let disposed = false;
  let initialized = false;
  let pendingRevision = false;
  let refreshInFlight = false;
  let refreshPromise: Promise<boolean> | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  let declaredHash: string | undefined;
  let observedHash: string | undefined;
  let failedHash: string | undefined;
  let generation = 0;
  const pendingTurnWaiters = new Set<(canProceed: boolean) => void>();

  const clearDebounceTimer = () => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  };

  const resolveTurnWaiters = (canProceed: boolean) => {
    if (pendingTurnWaiters.size === 0) return;
    const waiters = Array.from(pendingTurnWaiters);
    pendingTurnWaiters.clear();
    for (const resolve of waiters) resolve(canProceed);
  };

  const isActive = () => started && !disposed;

  const safelyIsRefreshSafe = (): boolean => {
    if (!isActive()) return false;
    try {
      return options.isSafeToRefresh();
    } catch {
      return false;
    }
  };

  const inspectRevision = async (): Promise<void> => {
    if (!isActive()) return;
    pendingRevision = false;

    let nextHash: string;
    try {
      nextHash = hashToolSurface(await options.surface.snapshot());
    } catch {
      // A transient snapshot failure is retried by the next real tool change
      // or safe-boundary notification. The bridge remains authoritative.
      return;
    }

    if (!isActive()) return;
    observedHash = nextHash;
    if (nextHash === declaredHash || nextHash === failedHash) return;
    void attemptRefresh();
  };

  const scheduleRevisionInspection = () => {
    if (!isActive() || !initialized) return;
    pendingRevision = true;
    if (debounceTimer !== undefined) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void inspectRevision();
    }, debounceMs);
  };

  const handleToolChange = () => {
    scheduleRevisionInspection();
  };

  const attemptRefresh = (): Promise<boolean> => {
    if (!isActive()) return Promise.resolve(false);
    if (refreshInFlight) return refreshPromise ?? Promise.resolve(false);
    if (!pendingRevision && observedHash === declaredHash) {
      resolveTurnWaiters(true);
      return Promise.resolve(true);
    }
    if (!safelyIsRefreshSafe()) return Promise.resolve(false);

    refreshInFlight = true;
    const refreshGeneration = generation;
    refreshPromise = (async () => {
      try {
        // Re-read immediately before reconnecting so a burst of registry
        // notifications results in one setup containing the latest snapshot.
        const latestHash = hashToolSurface(await options.surface.snapshot());
        if (!isActive() || refreshGeneration !== generation) return false;
        observedHash = latestHash;
        if (latestHash === declaredHash || latestHash === failedHash) {
          return latestHash === declaredHash;
        }
        await options.onRefreshStart?.();
        await options.reconnect();
        if (!isActive() || refreshGeneration !== generation) return false;

        const postRefreshHash = hashToolSurface(
          await options.surface.snapshot(),
        );
        observedHash = postRefreshHash;
        declaredHash = latestHash;
        if (postRefreshHash !== latestHash) {
          pendingRevision = true;
        } else {
          failedHash = undefined;
          pendingRevision = false;
        }
        await options.onRefreshComplete?.();
        return true;
      } catch (error) {
        if (isActive() && refreshGeneration === generation) {
          failedHash = observedHash;
          pendingRevision = false;
          // Keep provider/quota/network details out of the UI and any caller
          // that records the recoverable failure.
          void error;
          try {
            await options.onRefreshFailure?.(new ToolSurfaceRefreshError());
          } catch {
            // A reporting callback cannot make the coordinator reject or loop.
          }
          resolveTurnWaiters(false);
        }
        return false;
      }
    })().finally(() => {
      refreshInFlight = false;
      refreshPromise = undefined;
      if (!isActive()) {
        resolveTurnWaiters(false);
        return;
      }
      if (pendingRevision && safelyIsRefreshSafe()) {
        void inspectRevision();
      } else if (!refreshInFlight && observedHash === declaredHash) {
        resolveTurnWaiters(true);
      }
    });

    void refreshPromise.then((canProceed) => {
      if (!isActive()) {
        resolveTurnWaiters(false);
      } else if (canProceed && observedHash === declaredHash) {
        resolveTurnWaiters(true);
      } else if (!safelyIsRefreshSafe()) {
        // Keep waiters parked until the existing critical section reports its
        // next safe boundary.
      } else if (!refreshInFlight) {
        resolveTurnWaiters(false);
      }
    });
    return refreshPromise;
  };

  const drainAtSafeBoundary = () => {
    if (!isActive()) {
      resolveTurnWaiters(false);
      return;
    }
    if (debounceTimer !== undefined) {
      clearDebounceTimer();
      void inspectRevision().then(() => {
        if (observedHash !== declaredHash) void attemptRefresh();
      });
      return;
    }
    if (observedHash === declaredHash && !pendingRevision) {
      resolveTurnWaiters(true);
      return;
    }
    if (safelyIsRefreshSafe()) void attemptRefresh();
  };

  return {
    async start(): Promise<void> {
      if (disposed || started) return;
      started = true;
      initialized = false;
      pendingRevision = false;
      failedHash = undefined;
      unsubscribe = options.surface.subscribe(handleToolChange);
      try {
        const initialHash = hashToolSurface(await options.surface.snapshot());
        if (!isActive()) return;
        declaredHash = initialHash;
        observedHash = initialHash;
      } catch {
        // Keep the coordinator alive; a subsequent concrete tool change can
        // establish the baseline without affecting the portal.
      } finally {
        initialized = true;
      }
    },

    async beforeTurn(): Promise<boolean> {
      if (!isActive()) return true;
      if (debounceTimer !== undefined) {
        clearDebounceTimer();
        await inspectRevision();
      } else if (pendingRevision) {
        await inspectRevision();
      }
      if (!isActive()) return false;
      if (observedHash === declaredHash && !refreshInFlight) return true;
      if (refreshInFlight) return refreshPromise ?? false;
      if (!safelyIsRefreshSafe()) {
        return new Promise<boolean>((resolve) => {
          pendingTurnWaiters.add(resolve);
        });
      }
      return attemptRefresh();
    },

    notifySafeBoundary(): void {
      drainAtSafeBoundary();
    },

    stop(): void {
      if (!started) return;
      started = false;
      initialized = false;
      generation += 1;
      clearDebounceTimer();
      unsubscribe?.();
      unsubscribe = undefined;
      pendingRevision = false;
      observedHash = undefined;
      declaredHash = undefined;
      failedHash = undefined;
      resolveTurnWaiters(false);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      started = false;
      generation += 1;
      clearDebounceTimer();
      unsubscribe?.();
      unsubscribe = undefined;
      resolveTurnWaiters(false);
    },
  };
}
