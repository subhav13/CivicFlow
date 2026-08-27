import { useState, useSyncExternalStore } from 'react';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../application/store';

function createUiSafeId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is unavailable');
  }
  return `ui-${globalThis.crypto.randomUUID()}`;
}

export function useCivicFlowStore(): {
  store: CivicFlowStore;
  snapshot: ReturnType<CivicFlowStore['getState']>;
} {
  const [store] = useState(() =>
    createCivicFlowStore({ newId: createUiSafeId }),
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  return { store, snapshot };
}
