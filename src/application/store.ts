import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  type ApplicationState,
  type SectionId,
  validateApplicationState,
} from '../domain';
import type { CommandContext, CommandReceipt, CommandResult } from './commands';
import type { ChangedEntitySummary } from './command-types';
import {
  loadApplication,
  saveApplication,
  type PersistenceNotice,
  type StorageLike,
} from './persistence';
import {
  reduceOperation,
  type OperationDescriptor,
  type OperationState,
} from './operation-feedback';

export interface Selection {
  kind: 'household' | 'income';
  id: string;
}

export interface CapabilitySummary {
  id: string;
  summary: string;
}

export interface RecentEffect {
  actionId: string;
  section: string;
  entityIds: readonly string[];
  kind: 'created' | 'updated' | 'navigated' | 'undone';
  summary: string;
}

export interface ActivityEntry {
  id: string;
  summary: string;
  source?: CommandContext['source'];
  status?: 'succeeded' | 'failed' | 'undone';
  section?: string;
  occurredAt?: string;
  beforeRevision?: number;
  afterRevision?: number;
  affectedEntities?: readonly ChangedEntitySummary[];
  recovery?: OperationState['recovery'];
  undoId?: string;
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
  activeOperation: OperationState | null;
  recentEffect: RecentEffect | null;
}

export interface PersistenceUiState {
  status: 'seed' | 'loaded' | 'restored' | 'saved-this-session' | 'failed';
  savedAt?: string;
  message?: string;
}

export interface CivicFlowState {
  application: ApplicationState;
  ui: UiState;
  persistenceNotice: PersistenceNotice;
  persistenceUiState: PersistenceUiState;
}

export type CommandTransition = (
  state: ApplicationState,
  context: CommandContext,
) => CommandResult<ApplicationState>;

export interface DispatchOptions {
  actionId?: string;
  effectKind?: RecentEffect['kind'];
  source?: CommandContext['source'];
  activity?: Omit<ActivityEntry, 'source' | 'occurredAt'> &
    Partial<Pick<ActivityEntry, 'occurredAt'>>;
  operation?: OperationDescriptor;
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
  beginOperation(operation: OperationDescriptor): void;
  advanceOperation(actionId: string): void;
  completeOperation(
    actionId: string,
    details: {
      completedAt: string;
      afterRevision: number;
      affectedEntityIds: readonly string[];
    },
  ): void;
  failOperation(
    actionId: string,
    details: {
      completedAt: string;
      recovery?: OperationState['recovery'];
    },
  ): void;
  clearCompletedOperation(actionId?: string): void;
  setRecentEffect(effect: RecentEffect | null): void;
}

function createInitialUiState(): UiState {
  return {
    activeSection: 'about',
    selection: null,
    reviewHighlights: [],
    capabilities: [],
    activity: [],
    voice: { status: 'idle', transcript: '', error: null },
    activeOperation: null,
    recentEffect: null,
  };
}

function defaultNewId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is unavailable');
  }
  return `id-${globalThis.crypto.randomUUID()}`;
}

function makeUniqueActivityId(
  baseId: string,
  existingEntries: readonly ActivityEntry[],
): string {
  const existingIds = new Set(existingEntries.map((a) => a.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let count = 1;
  while (existingIds.has(`${baseId}-${count}`)) {
    count += 1;
  }
  return `${baseId}-${count}`;
}

function normalizeActivity(
  entry: ActivityEntry,
  source: CommandContext['source'],
  activeSection: SectionId,
  revision: number,
  now: () => Date,
): ActivityEntry {
  return {
    ...entry,
    source: entry.source ?? source,
    status: entry.status ?? 'succeeded',
    section: entry.section ?? activeSection,
    occurredAt: entry.occurredAt ?? now().toISOString(),
    beforeRevision: entry.beforeRevision ?? revision,
    afterRevision: entry.afterRevision ?? revision,
    affectedEntities: entry.affectedEntities
      ? entry.affectedEntities.slice()
      : [],
    ...(entry.recovery !== undefined
      ? {
          recovery: {
            ...entry.recovery,
            ...(entry.recovery.requiredFields !== undefined
              ? { requiredFields: entry.recovery.requiredFields.slice() }
              : {}),
          },
        }
      : {}),
    ...(entry.undoId !== undefined ? { undoId: entry.undoId } : {}),
  };
}

function addActivity(
  ui: UiState,
  activity: ActivityEntry,
  source: CommandContext['source'],
  revision: number,
  now: () => Date,
): UiState {
  const normalized = normalizeActivity(
    activity,
    source,
    ui.activeSection,
    revision,
    now,
  );
  const effectiveId = makeUniqueActivityId(normalized.id, ui.activity);
  return {
    ...ui,
    activity: [{ ...normalized, id: effectiveId }, ...ui.activity].slice(0, 20),
  };
}

/** A vanilla Zustand facade so browser and non-React callers share one state boundary. */
export function createCivicFlowStore(
  options: ApplicationStoreOptions = {},
): CivicFlowStore {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? defaultNewId;
  const hydrated = loadApplication(options.storage);
  const initialPersistenceUiState: PersistenceUiState =
    hydrated.storageUnavailable
      ? {
          status: 'failed',
          message: 'Save unavailable · Changes may not survive reload',
        }
      : hydrated.persistenceNotice === 'recovered'
        ? {
            status: 'restored',
            message: 'Started fresh after a browser save issue',
          }
        : hydrated.loadedFromStorage
          ? {
              status: 'loaded',
              message: 'Loaded from this browser',
            }
          : {
              status: 'seed',
              message: 'Demo data ready · Changes save in this browser',
            };

  const store = createStore<CivicFlowState>(() => ({
    application: hydrated.application,
    ui: createInitialUiState(),
    persistenceNotice: hydrated.persistenceNotice,
    persistenceUiState: initialPersistenceUiState,
  }));

  function persist(application: ApplicationState): {
    notice: PersistenceNotice;
    uiState: PersistenceUiState;
  } {
    const saveResult = saveApplication(options.storage, application);
    if (saveResult.status === 'failed' || saveResult.status === 'unavailable') {
      return {
        notice: 'save_failed',
        uiState: {
          status: 'failed',
          message: 'Save unavailable · Changes may not survive reload',
        },
      };
    }
    const date = now();
    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return {
      notice: null,
      uiState: {
        status: 'saved-this-session',
        savedAt: timeStr,
        message: `All changes saved · ${timeStr}`,
      },
    };
  }
  function dispatchTransition(
    transition: CommandTransition,
    dispatchOptions: DispatchOptions | undefined,
    doResetUi: boolean,
  ): CommandReceipt {
    const current = store.getState();
    const source = dispatchOptions?.source ?? 'human';
    const beforeRevision = current.application.revision;

    // Publish operation start → applying before invoking the transition
    const op = dispatchOptions?.operation;
    let activeOpBefore = current.ui.activeOperation;
    if (op !== undefined) {
      activeOpBefore = reduceOperation(activeOpBefore, {
        type: 'start',
        operation: op,
      });
      activeOpBefore = reduceOperation(activeOpBefore, {
        type: 'advance',
        actionId: op.actionId,
      });
    }

    // Publish the applying phase so the transition can observe it via store.getState()
    if (op !== undefined) {
      store.setState({
        ui: { ...current.ui, activeOperation: activeOpBefore },
      });
    }

    const explicitActionId =
      dispatchOptions?.actionId ??
      dispatchOptions?.operation?.actionId ??
      dispatchOptions?.activity?.id;
    const result = transition(current.application, { source, now, newId });
    const receipt = explicitActionId
      ? { ...result.receipt, actionId: explicitActionId }
      : result.receipt;
    if (receipt.kind !== 'success') {
      // Failed dispatch: may record activity with failed status and equal revisions
      let failUi = current.ui;
      if (op !== undefined) {
        const actionIdMatch = receipt.actionId === op.actionId;
        const opAfterFail = actionIdMatch
          ? reduceOperation(activeOpBefore, {
              type: 'fail',
              actionId: op.actionId,
              completedAt: now().toISOString(),
            })
          : reduceOperation(activeOpBefore, { type: 'clear' });
        failUi = { ...failUi, activeOperation: opAfterFail };
      }
      if (dispatchOptions?.activity) {
        const failActivity: ActivityEntry = {
          ...dispatchOptions.activity,
          status: dispatchOptions.activity.status ?? 'failed',
          beforeRevision:
            dispatchOptions.activity.beforeRevision ?? beforeRevision,
          afterRevision:
            dispatchOptions.activity.afterRevision ?? beforeRevision,
        };
        failUi = addActivity(failUi, failActivity, source, beforeRevision, now);
      }
      if (failUi !== current.ui) {
        store.setState({ ui: failUi });
      }
      return receipt;
    }

    const application = receipt.changed
      ? validateApplicationState(result.nextState)
      : current.application;
    const afterRevision = receipt.stateRevision;

    let ui = doResetUi ? createInitialUiState() : current.ui;

    // Resolve operation lifecycle into the post-reset/no-reset ui
    if (op !== undefined && !doResetUi) {
      const actionIdMatch = receipt.actionId === op.actionId;
      const opAfterDispatch = actionIdMatch
        ? reduceOperation(activeOpBefore, {
            type: 'succeed',
            actionId: op.actionId,
            completedAt: now().toISOString(),
            afterRevision,
            affectedEntityIds: receipt.changedEntities.map(({ id }) => id),
          })
        : reduceOperation(activeOpBefore, { type: 'clear' });
      ui = { ...ui, activeOperation: opAfterDispatch };
    }

    if (!doResetUi && dispatchOptions?.activity) {
      const activityEntry: ActivityEntry = {
        ...dispatchOptions.activity,
        status: dispatchOptions.activity.status ?? 'succeeded',
        beforeRevision:
          dispatchOptions.activity.beforeRevision ?? beforeRevision,
        afterRevision: dispatchOptions.activity.afterRevision ?? afterRevision,
        affectedEntities:
          dispatchOptions.activity.affectedEntities ??
          receipt.changedEntities.map((e) => ({ ...e })),
      };
      ui = addActivity(ui, activityEntry, source, beforeRevision, now);
    }

    // Publish recentEffect only for changed dispatches with activity
    let recentEffect = ui.recentEffect;
    if (!doResetUi && receipt.changed && dispatchOptions?.activity) {
      const entityIds = receipt.changedEntities.map((e) => e.id);
      let kind: RecentEffect['kind'] = dispatchOptions.effectKind ?? 'updated';
      if (!dispatchOptions.effectKind) {
        const wasCreated = receipt.changedEntities.some((entity) => {
          if (entity.kind === 'household_member') {
            return !current.application.householdMembers.some(
              (m) => m.id === entity.id,
            );
          }
          if (entity.kind === 'income_source') {
            return !current.application.incomeSources.some(
              (i) => i.id === entity.id,
            );
          }
          if (entity.kind === 'document') {
            return !current.application.documents.some(
              (d) => d.id === entity.id,
            );
          }
          return false;
        });
        kind = wasCreated ? 'created' : 'updated';
      }
      const activeSection =
        dispatchOptions.activity.section ?? ui.activeSection;
      recentEffect = {
        actionId: receipt.actionId,
        section: activeSection,
        entityIds,
        kind,
        summary: dispatchOptions.activity.summary,
      };
    }
    const persistenceResult = receipt.changed
      ? persist(application)
      : {
          notice: current.persistenceNotice,
          uiState: current.persistenceUiState,
        };

    if (
      receipt.changed ||
      doResetUi ||
      dispatchOptions?.activity ||
      dispatchOptions?.operation ||
      recentEffect !== ui.recentEffect
    ) {
      store.setState({
        application,
        ui: { ...ui, recentEffect },
        persistenceNotice: persistenceResult.notice,
        persistenceUiState: persistenceResult.uiState,
      });
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
      updateUi((ui) =>
        addActivity(
          ui,
          activity,
          activity.source ?? 'human',
          store.getState().application.revision,
          now,
        ),
      ),
    resetUi: () => updateUi(() => createInitialUiState()),
    beginOperation: (operation) =>
      updateUi((ui) => ({
        ...ui,
        activeOperation: reduceOperation(ui.activeOperation, {
          type: 'start',
          operation,
        }),
      })),
    advanceOperation: (actionId) =>
      updateUi((ui) => ({
        ...ui,
        activeOperation: reduceOperation(ui.activeOperation, {
          type: 'advance',
          actionId,
        }),
      })),
    completeOperation: (actionId, details) =>
      updateUi((ui) => ({
        ...ui,
        activeOperation: reduceOperation(ui.activeOperation, {
          type: 'succeed',
          actionId,
          completedAt: details.completedAt,
          afterRevision: details.afterRevision,
          affectedEntityIds: details.affectedEntityIds,
        }),
      })),
    failOperation: (actionId, details) =>
      updateUi((ui) => ({
        ...ui,
        activeOperation: reduceOperation(ui.activeOperation, {
          type: 'fail',
          actionId,
          completedAt: details.completedAt,
          recovery: details.recovery,
        }),
      })),
    clearCompletedOperation: (actionId) =>
      updateUi((ui) => {
        const op = ui.activeOperation;
        if (op === null) return ui;
        if (op.phase !== 'succeeded' && op.phase !== 'failed') return ui;
        const next = reduceOperation(op, { type: 'clear', actionId });
        return { ...ui, activeOperation: next };
      }),
    setRecentEffect: (effect) =>
      updateUi((ui) => ({
        ...ui,
        recentEffect: effect
          ? { ...effect, entityIds: effect.entityIds.slice() }
          : null,
      })),
  };
}
