import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  type ApplicationState,
  type SectionId,
  validateApplicationState,
} from '../domain';
import type { CommandContext, CommandReceipt, CommandResult } from './commands';
import {
  loadApplication,
  saveApplication,
  type PersistenceNotice,
  type StorageLike,
} from './persistence';

export interface Selection {
  kind: 'household' | 'income';
  id: string;
}

export interface CapabilitySummary {
  id: string;
  summary: string;
}

export interface ActivityEntry {
  id: string;
  summary: string;
  source?: CommandContext['source'];
  occurredAt?: string;
}

export interface VoiceUiState {
  status: 'idle' | 'listening' | 'speaking' | 'error';
  transcript: string;
  error: string | null;
}

export interface UiState {
  activeSection: SectionId;
  selection: Selection | null;
  reviewHighlights: readonly string[];
  capabilities: readonly CapabilitySummary[];
  activity: readonly ActivityEntry[];
  voice: VoiceUiState;
}

export interface CivicFlowState {
  application: ApplicationState;
  ui: UiState;
  persistenceNotice: PersistenceNotice;
}

export type CommandTransition = (
  state: ApplicationState,
  context: CommandContext,
) => CommandResult<ApplicationState>;

export interface DispatchOptions {
  source?: CommandContext['source'];
  activity?: Omit<ActivityEntry, 'source' | 'occurredAt'> &
    Partial<Pick<ActivityEntry, 'occurredAt'>>;
}

export interface ApplicationStoreOptions {
  storage?: StorageLike | null;
  now?: () => Date;
  newId?: () => string;
}

export interface CivicFlowStore {
  getState: StoreApi<CivicFlowState>['getState'];
  subscribe: StoreApi<CivicFlowState>['subscribe'];
  dispatch(
    transition: CommandTransition,
    options?: DispatchOptions,
  ): CommandReceipt;
  reset(
    transition: CommandTransition,
    options?: DispatchOptions,
  ): CommandReceipt;
  navigateToSection(section: SectionId): void;
  selectRecord(selection: Selection): void;
  clearSelection(): void;
  setReviewHighlights(highlights: readonly string[]): void;
  setCapabilities(capabilities: readonly CapabilitySummary[]): void;
  appendActivity(activity: ActivityEntry): void;
  resetUi(): void;
}

function createInitialUiState(): UiState {
  return {
    activeSection: 'about',
    selection: null,
    reviewHighlights: [],
    capabilities: [],
    activity: [],
    voice: { status: 'idle', transcript: '', error: null },
  };
}

function defaultNewId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is unavailable');
  }
  return globalThis.crypto.randomUUID();
}

function addActivity(
  ui: UiState,
  activity: ActivityEntry,
  source: CommandContext['source'],
  now: () => Date,
): UiState {
  return {
    ...ui,
    activity: [
      {
        ...activity,
        source: activity.source ?? source,
        occurredAt: activity.occurredAt ?? now().toISOString(),
      },
      ...ui.activity,
    ].slice(0, 20),
  };
}

/** A vanilla Zustand facade so browser and non-React callers share one state boundary. */
export function createCivicFlowStore(
  options: ApplicationStoreOptions = {},
): CivicFlowStore {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? defaultNewId;
  const hydrated = loadApplication(options.storage);
  const store = createStore<CivicFlowState>(() => ({
    application: hydrated.application,
    ui: createInitialUiState(),
    persistenceNotice: hydrated.persistenceNotice,
  }));

  function persist(application: ApplicationState): PersistenceNotice {
    return saveApplication(options.storage, application).status === 'failed'
      ? 'save_failed'
      : null;
  }

  function dispatchTransition(
    transition: CommandTransition,
    dispatchOptions: DispatchOptions | undefined,
    resetUi: boolean,
  ): CommandReceipt {
    const current = store.getState();
    const source = dispatchOptions?.source ?? 'human';
    const result = transition(current.application, { source, now, newId });
    const { receipt } = result;
    if (receipt.kind !== 'success') return receipt;

    const application = receipt.changed
      ? validateApplicationState(result.nextState)
      : current.application;
    const ui = resetUi
      ? createInitialUiState()
      : dispatchOptions?.activity
        ? addActivity(current.ui, dispatchOptions.activity, source, now)
        : current.ui;
    const persistenceNotice = receipt.changed
      ? persist(application)
      : current.persistenceNotice;

    if (receipt.changed || resetUi || dispatchOptions?.activity) {
      store.setState({ application, ui, persistenceNotice });
    }
    return receipt;
  }

  function updateUi(update: (ui: UiState) => UiState): void {
    store.setState({ ui: update(store.getState().ui) });
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    dispatch: (transition, dispatchOptions) =>
      dispatchTransition(transition, dispatchOptions, false),
    reset: (transition, dispatchOptions) =>
      dispatchTransition(transition, dispatchOptions, true),
    navigateToSection: (section) =>
      updateUi((ui) => ({ ...ui, activeSection: section })),
    selectRecord: (selection) => updateUi((ui) => ({ ...ui, selection })),
    clearSelection: () => updateUi((ui) => ({ ...ui, selection: null })),
    setReviewHighlights: (reviewHighlights) =>
      updateUi((ui) => ({ ...ui, reviewHighlights: [...reviewHighlights] })),
    setCapabilities: (capabilities) =>
      updateUi((ui) => ({ ...ui, capabilities: [...capabilities] })),
    appendActivity: (activity) =>
      updateUi((ui) => addActivity(ui, activity, 'human', now)),
    resetUi: () => updateUi(() => createInitialUiState()),
  };
}
