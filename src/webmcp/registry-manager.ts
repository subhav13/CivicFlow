import type { CivicFlowState, CivicFlowStore } from '../application/store';
import type { ModelContextPort, RegisteredToolRef } from './model-context-port';
import {
  CONTEXTUAL_TOOL_NAMES,
  STATIC_TOOL_NAMES,
  TOOL_CATALOG,
  type CivicFlowToolName,
} from './tool-catalog';
import {
  createStaticToolHandlers,
  type WebMcpToolHandlers,
} from './tool-handlers';

export interface RegistryManagerOptions {
  port: ModelContextPort;
  store: CivicFlowStore;
}

/**
 * Manages the lifecycle of static and dynamic WebMCP tool registrations.
 *
 * Enforces:
 * - Static tools registered once on startup.
 * - Dynamic contextual tools registered and unregistered with dedicated AbortControllers.
 * - Contextual handlers resolve current selection at execution time.
 * - Serialized asynchronous registration queue with monotonic generation tracking.
 * - Publish accepted tool snapshot to the application store capabilities facade.
 * - Clean disposal on unmount or HMR.
 */
export class WebMcpRegistryManager {
  private readonly port: ModelContextPort;
  private readonly store: CivicFlowStore;
  private readonly handlers: WebMcpToolHandlers;

  private generation = 0;
  private staticAbortController: AbortController | null = null;
  private readonly contextualControllers = new Map<
    CivicFlowToolName,
    AbortController
  >();
  private unsubscribeStore: (() => void) | null = null;
  private refreshPromise: Promise<void> = Promise.resolve();
  private lastContextKey = '';
  private lastPublishedJson = '';
  private disposed = false;

  constructor({ port, store }: RegistryManagerOptions) {
    this.port = port;
    this.store = store;
    this.handlers = createStaticToolHandlers(store);
  }

  async start(): Promise<void> {
    if (this.disposed) return;

    if (!this.port.isAvailable()) {
      this.store.setCapabilities([]);
      return;
    }

    this.generation += 1;
    const currentGen = this.generation;

    try {
      // Register static tools
      this.staticAbortController = new AbortController();
      const staticSignal = this.staticAbortController.signal;

      for (const toolName of STATIC_TOOL_NAMES) {
        if (this.disposed || currentGen !== this.generation) {
          return;
        }
        const def = TOOL_CATALOG[toolName];
        const handler = this.handlers[toolName];
        await this.port.registerTool(
          {
            ...def,
            handler,
          },
          { signal: staticSignal },
        );
      }

      if (this.disposed || currentGen !== this.generation) {
        return;
      }

      const state = this.store.getState();
      this.lastContextKey = this.computeContextKey(state);

      // Initial contextual sync
      await this.syncContextualTools(currentGen);

      if (this.disposed || currentGen !== this.generation) {
        return;
      }

      // Subscribe to store updates for dynamic changes
      this.unsubscribeStore = this.store.subscribe(() => {
        this.scheduleRefresh();
      });
    } catch {
      // Startup registration failure clean up safely without unhandled rejection
      if (this.staticAbortController) {
        this.staticAbortController.abort();
        this.staticAbortController = null;
      }
      for (const controller of this.contextualControllers.values()) {
        controller.abort();
      }
      this.contextualControllers.clear();
      if (this.unsubscribeStore) {
        this.unsubscribeStore();
        this.unsubscribeStore = null;
      }
      if (this.port.isAvailable()) {
        this.store.setCapabilities([]);
      }
    }
  }

  private computeContextKey(state: CivicFlowState): string {
    return `${state.ui.activeSection}:${state.ui.selection?.kind ?? 'none'}:${state.ui.selection?.id ?? 'none'}`;
  }

  private scheduleRefresh(): void {
    if (this.disposed || !this.port.isAvailable()) return;
    const state = this.store.getState();
    const contextKey = this.computeContextKey(state);

    if (contextKey === this.lastContextKey) {
      return;
    }
    this.lastContextKey = contextKey;

    this.generation += 1;
    const currentGen = this.generation;

    this.refreshPromise = this.refreshPromise
      .then(async () => {
        if (this.disposed || currentGen !== this.generation) return;
        await this.syncContextualTools(currentGen);
      })
      .catch(() => {
        // Safe swallow to avoid breaking refresh chain
      });
  }

  private async syncContextualTools(currentGen: number): Promise<void> {
    if (
      this.disposed ||
      currentGen !== this.generation ||
      !this.port.isAvailable()
    ) {
      return;
    }

    const state = this.store.getState();
    const desiredContextualTools = new Set<CivicFlowToolName>();

    // Determine desired contextual tools
    if (state.ui.selection?.kind === 'household') {
      desiredContextualTools.add('update_household_member');
    }
    if (state.ui.selection?.kind === 'income') {
      desiredContextualTools.add('update_income_source');
    }
    if (state.ui.activeSection === 'review') {
      desiredContextualTools.add('review_application');
    }

    // Unregister tools that are no longer desired
    for (const toolName of CONTEXTUAL_TOOL_NAMES) {
      if (
        !desiredContextualTools.has(toolName) &&
        this.contextualControllers.has(toolName)
      ) {
        const controller = this.contextualControllers.get(toolName);
        this.contextualControllers.delete(toolName);
        controller?.abort();
      }
    }

    if (this.disposed || currentGen !== this.generation) {
      return;
    }

    // Register desired tools that are not yet registered
    for (const toolName of desiredContextualTools) {
      if (this.disposed || currentGen !== this.generation) {
        return;
      }
      if (!this.contextualControllers.has(toolName)) {
        const controller = new AbortController();
        this.contextualControllers.set(toolName, controller);
        const def = TOOL_CATALOG[toolName];
        const handler = this.handlers[toolName];

        try {
          await this.port.registerTool(
            {
              ...def,
              handler,
            },
            { signal: controller.signal },
          );
        } catch (err) {
          this.contextualControllers.delete(toolName);
          if (
            controller.signal.aborted ||
            this.disposed ||
            currentGen !== this.generation
          ) {
            return;
          }
          throw err;
        }
      }
    }

    if (this.disposed || currentGen !== this.generation) {
      return;
    }

    // Update accepted capabilities in store facade
    try {
      const activeTools = await this.port.getTools();
      if (this.disposed || currentGen !== this.generation) {
        return;
      }
      this.publishCapabilities(activeTools, currentGen);
    } catch {
      // Ignore abort errors during snapshot read
    }
  }

  private publishCapabilities(
    tools: RegisteredToolRef[],
    currentGen: number,
  ): void {
    if (this.disposed || currentGen !== this.generation) {
      return;
    }
    const capabilities = tools.map((tool) => ({
      id: tool.name,
      summary: tool.description,
    }));
    const json = JSON.stringify(capabilities);
    if (json === this.lastPublishedJson) {
      return;
    }
    this.lastPublishedJson = json;
    this.store.setCapabilities(capabilities);
  }

  async waitForSync(): Promise<void> {
    await this.refreshPromise;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;

    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    if (this.staticAbortController) {
      this.staticAbortController.abort();
      this.staticAbortController = null;
    }

    for (const controller of this.contextualControllers.values()) {
      controller.abort();
    }
    this.contextualControllers.clear();

    if (this.port.isAvailable()) {
      this.store.setCapabilities([]);
    }
  }
}
