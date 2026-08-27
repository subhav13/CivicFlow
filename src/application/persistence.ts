import {
  createDemoApplicationSeed,
  type ApplicationState,
  validateApplicationState,
} from '../domain';

export const APPLICATION_STORAGE_KEY = 'civicflow.application.v1';
const MAX_SERIALIZED_APPLICATION_BYTES = 100 * 1024;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type PersistenceNotice = 'recovered' | 'save_failed' | null;

export interface HydratedApplication {
  application: ApplicationState;
  persistenceNotice: PersistenceNotice;
}

export type SaveApplicationResult =
  { status: 'saved' } | { status: 'unavailable' } | { status: 'failed' };

function getDefaultBrowserStorage(): StorageLike | null {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function resolveStorage(
  storage: StorageLike | null | undefined,
): StorageLike | null {
  return storage === undefined ? getDefaultBrowserStorage() : storage;
}

function serializedSizeExceedsLimit(serialized: string): boolean {
  return (
    new TextEncoder().encode(serialized).byteLength >
    MAX_SERIALIZED_APPLICATION_BYTES
  );
}

function recoveredApplication(): HydratedApplication {
  return {
    application: createDemoApplicationSeed(),
    persistenceNotice: 'recovered',
  };
}

/** Loads only an ApplicationState and falls back to the deterministic synthetic seed. */
export function loadApplication(
  storage: StorageLike | null | undefined = undefined,
): HydratedApplication {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) {
    return {
      application: createDemoApplicationSeed(),
      persistenceNotice: null,
    };
  }

  try {
    const serialized = resolvedStorage.getItem(APPLICATION_STORAGE_KEY);
    if (serialized === null) {
      return {
        application: createDemoApplicationSeed(),
        persistenceNotice: null,
      };
    }
    if (serializedSizeExceedsLimit(serialized)) return recoveredApplication();
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed) ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !== 1
    ) {
      return recoveredApplication();
    }
    return {
      application: validateApplicationState(parsed),
      persistenceNotice: null,
    };
  } catch {
    return recoveredApplication();
  }
}

/** Saves validated application data only; callers retain their in-memory state on failure. */
export function saveApplication(
  storage: StorageLike | null | undefined,
  application: ApplicationState,
): SaveApplicationResult {
  const resolvedStorage = resolveStorage(storage);
  if (resolvedStorage === null) return { status: 'unavailable' };

  try {
    const validated = validateApplicationState(application);
    const serialized = JSON.stringify(validated);
    if (serializedSizeExceedsLimit(serialized)) return { status: 'failed' };
    resolvedStorage.setItem(APPLICATION_STORAGE_KEY, serialized);
    return { status: 'saved' };
  } catch {
    return { status: 'failed' };
  }
}
