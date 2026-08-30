import { describe, expect, it, vi } from 'vitest';

import {
  createToolSurfaceFreshnessCoordinator,
  hashToolSurface,
} from '../../src/assistant/tool-surface-freshness';
import type { CurrentToolSurface } from '../../src/assistant/types';
import type { RegisteredToolRef } from '../../src/webmcp/model-context-port';

const staticTools: RegisteredToolRef[] = Array.from(
  { length: 7 },
  (_, index) => ({
    name: `static_tool_${index}`,
    title: `Static tool ${index}`,
    description: `Static description ${index}`,
    inputSchema: {
      type: 'object',
      properties: { index: { type: 'integer', const: index } },
      annotations: { readOnlyHint: true },
    },
    annotations: { readOnlyHint: true },
  }),
);

const contextualTool: RegisteredToolRef = {
  name: 'update_income_source',
  title: 'Update income source',
  description: 'Update the selected income source',
  inputSchema: {
    type: 'object',
    properties: { employerName: { type: 'string' } },
    annotations: { readOnlyHint: false },
  },
  annotations: { readOnlyHint: false },
};

function makeSurface(snapshot: RegisteredToolRef[]): {
  surface: CurrentToolSurface;
  notifyToolChange: () => void;
  setSnapshot: (next: RegisteredToolRef[]) => void;
} {
  const listeners = new Set<() => void>();
  let currentSnapshot = snapshot;
  return {
    surface: {
      snapshot: vi.fn(async () => currentSnapshot),
      execute: vi.fn(async () => '{}'),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    notifyToolChange: () => {
      for (const listener of listeners) listener();
    },
    setSnapshot: (next) => {
      currentSnapshot = next;
    },
  };
}

async function flushDebounce(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

describe('tool-surface freshness coordinator', () => {
  it('hashes exact declared fields and ignores object key insertion order', () => {
    expect(
      hashToolSurface([
        {
          ...staticTools[0],
          inputSchema: { properties: {}, type: 'object' },
        },
      ]),
    ).toBe(
      hashToolSurface([
        {
          ...staticTools[0],
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
    );
    expect(
      hashToolSurface([
        {
          ...staticTools[0],
          description: 'Changed description',
        },
      ]),
    ).not.toBe(hashToolSurface([staticTools[0]]));
  });

  it('keeps baseline startup alive when observation subscription is unavailable', async () => {
    const snapshot = vi.fn(async () => staticTools);
    const surface: CurrentToolSurface = {
      snapshot,
      execute: vi.fn(async () => '{}'),
      subscribe: vi.fn(() => {
        throw new TypeError('toolchange observation is unavailable');
      }),
    };
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface,
      reconnect: vi.fn(async () => {}),
      isSafeToRefresh: () => true,
    });

    await expect(coordinator.start()).resolves.toBeUndefined();
    expect(surface.subscribe).toHaveBeenCalledOnce();
    expect(snapshot).toHaveBeenCalledOnce();
    await expect(coordinator.beforeTurn()).resolves.toBe(true);
    coordinator.dispose();
  });

  it('coalesces duplicate changes and performs one replacement for a contextual appearance', async () => {
    const harness = makeSurface(staticTools);
    const reconnect = vi.fn(async () => {});
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface: harness.surface,
      reconnect,
      isSafeToRefresh: () => true,
    });

    await coordinator.start();
    harness.setSnapshot([...staticTools, contextualTool]);
    harness.notifyToolChange();
    harness.notifyToolChange();
    await flushDebounce();

    expect(reconnect).toHaveBeenCalledOnce();
    coordinator.dispose();
  });

  it('does not replace the connection for an irrelevant or identical revision', async () => {
    const harness = makeSurface(staticTools);
    const reconnect = vi.fn(async () => {});
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface: harness.surface,
      reconnect,
      isSafeToRefresh: () => true,
    });

    await coordinator.start();
    harness.setSnapshot(staticTools.map((tool) => ({ ...tool })));
    harness.notifyToolChange();
    await flushDebounce();

    expect(reconnect).not.toHaveBeenCalled();
    coordinator.dispose();
  });

  it('defers a meaningful revision through a critical section until a safe boundary', async () => {
    const harness = makeSurface(staticTools);
    const reconnect = vi.fn(async () => {});
    let safe = false;
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface: harness.surface,
      reconnect,
      isSafeToRefresh: () => safe,
    });

    await coordinator.start();
    harness.setSnapshot([...staticTools, contextualTool]);
    harness.notifyToolChange();
    await flushDebounce();
    expect(reconnect).not.toHaveBeenCalled();

    safe = true;
    coordinator.notifySafeBoundary();
    await flushDebounce();
    expect(reconnect).toHaveBeenCalledOnce();
    coordinator.dispose();
  });

  it('reports one recoverable refresh failure without retrying the same revision', async () => {
    const harness = makeSurface(staticTools);
    const reconnect = vi.fn(async () => {
      throw new Error('quota detail must not leak');
    });
    const onRefreshFailure = vi.fn();
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface: harness.surface,
      reconnect,
      isSafeToRefresh: () => true,
      onRefreshFailure,
    });

    await coordinator.start();
    harness.setSnapshot([...staticTools, contextualTool]);
    harness.notifyToolChange();
    await flushDebounce();
    harness.notifyToolChange();
    await flushDebounce();

    expect(reconnect).toHaveBeenCalledOnce();
    expect(onRefreshFailure).toHaveBeenCalledOnce();
    expect(onRefreshFailure).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('quota') }),
    );
    coordinator.dispose();
  });

  it('stops observing changes and clears pending refresh work on disposal', async () => {
    const harness = makeSurface(staticTools);
    const reconnect = vi.fn(async () => {});
    const coordinator = createToolSurfaceFreshnessCoordinator({
      surface: harness.surface,
      reconnect,
      isSafeToRefresh: () => true,
    });

    await coordinator.start();
    harness.setSnapshot([...staticTools, contextualTool]);
    harness.notifyToolChange();
    coordinator.dispose();
    await flushDebounce();

    expect(reconnect).not.toHaveBeenCalled();
  });
});
