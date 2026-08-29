import { useEffect, useRef } from 'react';

import type { CivicFlowStore } from '../application/store';
import { BrowserModelContextPort } from './browser-model-context-port';
import type { ModelContextPort } from './model-context-port';
import { WebMcpRegistryManager } from './registry-manager';

/**
 * Connects the WebMCP registry manager lifecycle to the React application.
 *
 * Automatically instantiates the browser adapter (which feature-detects
 * browser model context safely), starts static and contextual tool registration,
 * and cleans up registrations on unmount or HMR reload.
 */
export function useWebMcpRegistry(
  store: CivicFlowStore,
  portOverride?: ModelContextPort,
  managerOverride?: WebMcpRegistryManager | null,
): void {
  const managerRef = useRef<WebMcpRegistryManager | null>(null);

  useEffect(() => {
    if (managerOverride) {
      void managerOverride.start();
      return () => {
        // managerOverride lifecycle is managed by its creator
      };
    }

    const port = portOverride ?? new BrowserModelContextPort();
    const manager = new WebMcpRegistryManager({ port, store });
    managerRef.current = manager;

    void manager.start();

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [store, portOverride, managerOverride]);
}
