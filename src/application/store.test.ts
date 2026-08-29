import { addHouseholdMember, resetDemo } from './commands';
import { createDemoApplicationSeed } from '../domain';
import { APPLICATION_STORAGE_KEY, type StorageLike } from './persistence';
import { createCivicFlowStore, type ActivityEntry } from './store';
import type { OperationDescriptor, OperationState } from './operation-feedback';
import type { ChangedEntitySummary } from './command-types';

class FakeStorage implements StorageLike {
  readonly values = new Map<string, string>();
  setCalls = 0;
  writeError: Error | null = null;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
  }
}

const fixedNow = () => new Date('2026-08-27T12:00:00.000Z');

function createTestStore(storage = new FakeStorage()) {
  let id = 0;
  return {
    storage,
    store: createCivicFlowStore({
      storage,
      now: fixedNow,
      newId: () => `generated-${++id}`,
    }),
  };
}

const addMember = (
  state: Parameters<typeof addHouseholdMember>[0],
  ctx: Parameters<typeof addHouseholdMember>[2],
) =>
  addHouseholdMember(
    state,
    {
      firstName: 'Alex',
      lastName: 'Rivera',
      ageYears: 12,
      relationship: 'child',
      applyingForCoverage: true,
    },
    ctx,
  );

// ── helpers ───────────────────────────────────────────────────────────────────

function makeDescriptor(
  overrides: Partial<OperationDescriptor> = {},
): OperationDescriptor {
  return {
    actionId: 'op-1',
    source: 'human',
    label: 'Add member',
    section: 'household',
    startedAt: fixedNow().toISOString(),
    beforeRevision: 0,
    ...overrides,
  };
}

// ── existing tests ────────────────────────────────────────────────────────────

describe('CivicFlow application store', () => {
  it('dispatches a command with deterministic default context and persists only changed state', () => {
    const { storage, store } = createTestStore();

    const receipt = store.dispatch(addMember);

    expect(receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 1,
    });
    expect(store.getState().application.revision).toBe(1);
    expect(store.getState().application.householdMembers[0]?.id).toBe(
      'generated-2',
    );
    expect(
      JSON.parse(storage.values.get(APPLICATION_STORAGE_KEY) ?? '').revision,
    ).toBe(1);
  });

  it('injects explicit WebMCP source and configured command services', () => {
    const { store } = createTestStore();
    let observedSource: string | undefined;
    let observedNow = '';
    let observedId = '';

    const receipt = store.dispatch(
      (state, ctx) => {
        observedSource = ctx.source;
        observedNow = ctx.now().toISOString();
        observedId = ctx.newId();
        return {
          nextState: state,
          receipt: {
            kind: 'success',
            code: 'OK',
            actionId: 'observed',
            changed: false,
            stateRevision: state.revision,
            message: 'No changes were needed.',
            changedEntities: [],
          },
        };
      },
      { source: 'webmcp' },
    );

    expect(receipt.changed).toBe(false);
    expect(observedSource).toBe('webmcp');
    expect(observedNow).toBe('2026-08-27T12:00:00.000Z');
    expect(observedId).toBe('generated-1');
  });

  it('keeps the current application when a no-op receipt supplies a different next state', () => {
    const { store } = createTestStore();

    const receipt = store.dispatch(
      (state) => ({
        nextState: { ...state, revision: state.revision + 1 },
        receipt: {
          kind: 'success',
          code: 'OK',
          actionId: 'unexpected-next-state',
          changed: false,
          stateRevision: state.revision,
          message: 'No changes were needed.',
          changedEntities: [],
        },
      }),
      { activity: { id: 'no-op', summary: 'No-op activity' } },
    );

    expect(receipt.changed).toBe(false);
    expect(store.getState().application.revision).toBe(0);
    expect(store.getState().ui.activity[0]?.id).toBe('no-op');
  });

  it('keeps UI-only actions ephemeral and outside the application revision', () => {
    const { storage, store } = createTestStore();
    const revision = store.getState().application.revision;
    const writes = storage.setCalls;

    store.navigateToSection('income');
    store.selectRecord({ kind: 'household', id: 'person-maya-carter' });
    store.setReviewHighlights(['INCOME_MISSING']);
    store.setCapabilities([{ id: 'demo.status', summary: 'Synthetic status' }]);
    store.clearSelection();

    expect(store.getState().application.revision).toBe(revision);
    expect(storage.setCalls).toBe(writes);
    expect(store.getState().ui).toMatchObject({
      activeSection: 'income',
      selection: null,
      reviewHighlights: ['INCOME_MISSING'],
      capabilities: [{ id: 'demo.status', summary: 'Synthetic status' }],
    });
  });

  it('caps activity at twenty newest-first entries', () => {
    const { store } = createTestStore();

    for (let index = 1; index <= 21; index += 1) {
      store.appendActivity({
        id: `activity-${index}`,
        summary: `Activity ${index}`,
      });
    }

    expect(store.getState().ui.activity).toHaveLength(20);
    expect(store.getState().ui.activity[0]?.id).toBe('activity-21');
    expect(store.getState().ui.activity.at(-1)?.id).toBe('activity-2');
  });

  it('ensures collision-safe unique activity IDs when repeating an ID', () => {
    const { store } = createTestStore();

    // Append same ID multiple times
    store.appendActivity({
      id: 'human-household-edit',
      summary: 'First edit',
    });
    store.appendActivity({
      id: 'human-household-edit',
      summary: 'Second edit',
    });
    store.appendActivity({
      id: 'human-household-edit',
      summary: 'Third edit',
    });

    const activity = store.getState().ui.activity;
    expect(activity).toHaveLength(3);

    // Newest first
    expect(activity[0]).toMatchObject({
      id: 'human-household-edit-2',
      summary: 'Third edit',
    });
    expect(activity[1]).toMatchObject({
      id: 'human-household-edit-1',
      summary: 'Second edit',
    });
    // First occurrence preserved unchanged
    expect(activity[2]).toMatchObject({
      id: 'human-household-edit',
      summary: 'First edit',
    });

    // All IDs are strictly unique
    const ids = activity.map((a) => a.id);
    expect(new Set(ids).size).toBe(activity.length);
  });

  it('retains changed state in memory when persistence writes fail', () => {
    const storage = new FakeStorage();
    storage.writeError = new Error('quota exceeded');
    const { store } = createTestStore(storage);

    const receipt = store.dispatch(addMember);

    expect(receipt.changed).toBe(true);
    expect(store.getState().application.revision).toBe(1);
    expect(store.getState().persistenceNotice).toBe('save_failed');
  });

  it('keeps submitted applications locked until the reset command runs', () => {
    const storage = new FakeStorage();
    storage.values.set(
      APPLICATION_STORAGE_KEY,
      JSON.stringify({
        ...createDemoApplicationSeed(),
        submission: {
          status: 'submitted_demo',
          submittedAt: '2026-08-27T12:00:00.000Z',
        },
      }),
    );
    const { store } = createTestStore(storage);

    expect(store.dispatch(addMember)).toMatchObject({
      kind: 'failure',
      code: 'APPLICATION_LOCKED',
      changed: false,
    });
    expect(store.reset(resetDemo)).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 0,
    });
    expect(store.getState().application.submission.status).toBe(
      'not_submitted',
    );
  });

  it('resets through the accepted command and clears all ephemeral UI state atomically', () => {
    const { store } = createTestStore();
    const snapshots: Array<{ revision: number; activityCount: number }> = [];
    const unsubscribe = store.subscribe((state) => {
      snapshots.push({
        revision: state.application.revision,
        activityCount: state.ui.activity.length,
      });
    });
    store.dispatch(addMember, {
      activity: { id: 'add-member', summary: 'Added Alex Rivera' },
    });
    store.navigateToSection('review');
    store.selectRecord({ kind: 'household', id: 'generated-2' });
    store.setReviewHighlights(['HOUSEHOLD_UNCONFIRMED']);

    const receipt = store.reset(resetDemo);
    unsubscribe();

    expect(receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 0,
    });
    expect(store.getState()).toMatchObject({
      application: { revision: 0, householdMembers: [] },
      ui: {
        activeSection: 'about',
        selection: null,
        reviewHighlights: [],
        capabilities: [],
        activity: [],
      },
    });
    expect(snapshots.at(-1)).toEqual({ revision: 0, activityCount: 0 });
  });

  // ── Packet 1.2 tests ──────────────────────────────────────────────────────

  it('begin/advance/complete transition the active operation and retain terminal metadata', () => {
    const { store } = createTestStore();
    const desc = makeDescriptor({ actionId: 'op-abc', beforeRevision: 0 });

    expect(store.getState().ui.activeOperation).toBeNull();

    store.beginOperation(desc);
    expect(store.getState().ui.activeOperation).toMatchObject({
      actionId: 'op-abc',
      phase: 'validating',
      affectedEntityIds: [],
    });

    store.advanceOperation('op-abc');
    expect(store.getState().ui.activeOperation).toMatchObject({
      actionId: 'op-abc',
      phase: 'applying',
    });

    store.completeOperation('op-abc', {
      completedAt: fixedNow().toISOString(),
      afterRevision: 1,
      affectedEntityIds: ['entity-1', 'entity-2'],
    });
    const op = store.getState().ui.activeOperation;
    expect(op).toMatchObject({
      actionId: 'op-abc',
      phase: 'succeeded',
      completedAt: fixedNow().toISOString(),
      afterRevision: 1,
      affectedEntityIds: ['entity-1', 'entity-2'],
    });
  });

  it('fail transitions from validating or applying and retains recovery', () => {
    const { store } = createTestStore();
    const desc = makeDescriptor({ actionId: 'op-fail', beforeRevision: 0 });

    store.beginOperation(desc);
    store.failOperation('op-fail', {
      completedAt: fixedNow().toISOString(),
      recovery: {
        section: 'household',
        message: 'Fix the name field',
        suggestedTool: 'addHouseholdMember',
        requiredFields: ['firstName'],
      },
    });

    const op = store.getState().ui.activeOperation;
    expect(op).toMatchObject({
      actionId: 'op-fail',
      phase: 'failed',
      completedAt: fixedNow().toISOString(),
      recovery: {
        section: 'household',
        message: 'Fix the name field',
        suggestedTool: 'addHouseholdMember',
        requiredFields: ['firstName'],
      },
    });
  });

  it('stale completion/failure/clear cannot replace a newer operation', () => {
    const { store } = createTestStore();

    // Start op-1, then immediately start op-2 (replaces op-1)
    store.beginOperation(
      makeDescriptor({ actionId: 'op-1', beforeRevision: 0 }),
    );
    store.beginOperation(
      makeDescriptor({ actionId: 'op-2', beforeRevision: 0 }),
    );

    // Stale complete for op-1 is ignored
    store.completeOperation('op-1', {
      completedAt: fixedNow().toISOString(),
      afterRevision: 1,
      affectedEntityIds: [],
    });
    expect(store.getState().ui.activeOperation?.actionId).toBe('op-2');
    expect(store.getState().ui.activeOperation?.phase).toBe('validating');

    // Stale fail for op-1 is also ignored
    store.failOperation('op-1', { completedAt: fixedNow().toISOString() });
    expect(store.getState().ui.activeOperation?.actionId).toBe('op-2');
  });

  it('clearCompletedOperation refuses active operations and clears matching terminal state', () => {
    const { store } = createTestStore();

    // Active (validating) operation — clear must not remove it
    store.beginOperation(makeDescriptor({ actionId: 'op-active' }));
    store.clearCompletedOperation('op-active');
    expect(store.getState().ui.activeOperation?.actionId).toBe('op-active');

    // Advance to applying — still active
    store.advanceOperation('op-active');
    store.clearCompletedOperation('op-active');
    expect(store.getState().ui.activeOperation?.actionId).toBe('op-active');

    // Complete it
    store.completeOperation('op-active', {
      completedAt: fixedNow().toISOString(),
      afterRevision: 1,
      affectedEntityIds: [],
    });
    // Wrong ID doesn't clear
    store.clearCompletedOperation('op-other');
    expect(store.getState().ui.activeOperation?.actionId).toBe('op-active');
    // Correct ID clears
    store.clearCompletedOperation('op-active');
    expect(store.getState().ui.activeOperation).toBeNull();
  });

  it('operation/effect UI methods are ephemeral and do not increment revision or write storage', () => {
    const { storage, store } = createTestStore();
    const revisionBefore = store.getState().application.revision;
    const writesBefore = storage.setCalls;

    store.beginOperation(makeDescriptor({ actionId: 'op-eph' }));
    store.advanceOperation('op-eph');
    store.completeOperation('op-eph', {
      completedAt: fixedNow().toISOString(),
      afterRevision: 1,
      affectedEntityIds: ['entity-x'],
    });
    store.setRecentEffect({
      actionId: 'op-eph',
      section: 'household',
      entityIds: ['entity-x'],
      kind: 'created',
      summary: 'Added member',
    });
    store.clearCompletedOperation('op-eph');
    store.setRecentEffect(null);

    expect(store.getState().application.revision).toBe(revisionBefore);
    expect(storage.setCalls).toBe(writesBefore);
  });

  it('resetUi and accepted reset clear operation/effect/activity state', () => {
    const { store } = createTestStore();

    store.beginOperation(makeDescriptor({ actionId: 'op-reset' }));
    store.setRecentEffect({
      actionId: 'op-reset',
      section: 'household',
      entityIds: ['entity-1'],
      kind: 'created',
      summary: 'Created entity',
    });
    store.appendActivity({ id: 'act-1', summary: 'Some activity' });

    store.resetUi();

    expect(store.getState().ui.activeOperation).toBeNull();
    expect(store.getState().ui.recentEffect).toBeNull();
    expect(store.getState().ui.activity).toHaveLength(0);

    // Also verify reset() (store reset) clears operation state
    store.beginOperation(makeDescriptor({ actionId: 'op-after-reset' }));
    store.setRecentEffect({
      actionId: 'op-after-reset',
      section: 'income',
      entityIds: [],
      kind: 'updated',
      summary: 'Updated income',
    });

    store.reset(resetDemo);

    expect(store.getState().ui.activeOperation).toBeNull();
    expect(store.getState().ui.recentEffect).toBeNull();
    expect(store.getState().ui.activity).toHaveLength(0);
  });

  it('normalizes minimal activity to v2 defaults and defensively copies entities', () => {
    const { store } = createTestStore();

    // Minimal activity with only required fields
    store.appendActivity({ id: 'min-act', summary: 'Minimal activity' });

    const entry = store.getState().ui.activity[0];
    expect(entry).toBeDefined();
    expect(entry!.source).toBe('human');
    expect(entry!.status).toBe('succeeded');
    expect(entry!.occurredAt).toBe('2026-08-27T12:00:00.000Z');
    expect(entry!.section).toBeDefined();
    expect(entry!.beforeRevision).toBeDefined();
    expect(entry!.afterRevision).toBeDefined();
    expect(entry!.affectedEntities).toEqual([]);

    // Defensive copy of affectedEntities
    const entities: ChangedEntitySummary[] = [
      { kind: 'household_member', id: 'e1', label: 'Person A' },
    ];
    store.appendActivity({
      id: 'ent-act',
      summary: 'Entity activity',
      affectedEntities: entities,
    });
    entities.push({ kind: 'applicant' as const, id: 'e2', label: 'Person B' });
    const stored = store.getState().ui.activity[0];
    expect(stored!.affectedEntities).toHaveLength(1);
  });

  it('defensive copy of ActivityEntry.recovery.requiredFields when normalized', () => {
    const { store } = createTestStore();

    // Defensive copy of recovery.requiredFields when appended
    const recoveryEntry: ActivityEntry = {
      id: 'recovery-act',
      summary: 'Recovery activity',
      recovery: {
        section: 'household',
        message: 'Fix the name field',
        requiredFields: ['firstName', 'lastName'],
      },
    };
    store.appendActivity(recoveryEntry);
    // Mutating the original requiredFields array must not affect the stored entry
    (recoveryEntry.recovery!.requiredFields as string[]).push('ageYears');
    const recoveryStored = store.getState().ui.activity[0];
    expect(recoveryStored!.recovery!.requiredFields).toHaveLength(2);
  });
  it('keeps activity newest-first, collision-safe, and capped at twenty after normalization', () => {
    const { store } = createTestStore();

    for (let i = 1; i <= 22; i++) {
      store.appendActivity({ id: `v2-act-${i}`, summary: `Activity ${i}` });
    }

    const activity = store.getState().ui.activity;
    expect(activity).toHaveLength(20);
    expect(activity[0]?.id).toBe('v2-act-22');
    expect(activity.at(-1)?.id).toBe('v2-act-3');

    // All normalized with v2 fields
    for (const entry of activity) {
      expect(entry.status).toBeDefined();
      expect(entry.source).toBeDefined();
      expect(entry.occurredAt).toBeDefined();
    }
  });

  it('successful changed human dispatch records exact before/after revisions, entities, and recent effect', () => {
    const { store } = createTestStore();
    const beforeRevision = store.getState().application.revision; // 0

    const receipt = store.dispatch(addMember, {
      activity: { id: 'add-member-act', summary: 'Added Alex Rivera' },
    });

    expect(receipt.kind).toBe('success');
    expect(receipt.changed).toBe(true);

    const entry = store.getState().ui.activity[0];
    expect(entry).toBeDefined();
    expect(entry!.beforeRevision).toBe(beforeRevision);
    expect(entry!.afterRevision).toBe(receipt.stateRevision);
    expect(entry!.status).toBe('succeeded');
    // affectedEntities sourced from receipt changedEntities
    expect(Array.isArray(entry!.affectedEntities)).toBe(true);

    // recentEffect published for changed dispatch
    const effect = store.getState().ui.recentEffect;
    expect(effect).not.toBeNull();
    expect(effect!.actionId).toBe(receipt.actionId);
    expect(effect!.kind === 'created' || effect!.kind === 'updated').toBe(true);
    expect(effect!.summary).toBe('Added Alex Rivera');
    expect(Array.isArray(effect!.entityIds)).toBe(true);
  });

  it('no-op and failed dispatch preserve revision and do not create a changed recent effect', () => {
    const { store } = createTestStore();

    // No-op dispatch with activity
    store.dispatch(
      (state) => ({
        nextState: state,
        receipt: {
          kind: 'success',
          code: 'OK',
          actionId: 'no-op-act',
          changed: false,
          stateRevision: state.revision,
          message: 'No changes.',
          changedEntities: [],
        },
      }),
      { activity: { id: 'no-op-act', summary: 'No-op' } },
    );

    expect(store.getState().ui.recentEffect).toBeNull();
    expect(store.getState().application.revision).toBe(0);

    // Failed dispatch — should not create recentEffect
    const failedReceipt = store.dispatch(
      (state) => ({
        nextState: state,
        receipt: {
          kind: 'failure',
          code: 'VALIDATION_ERROR',
          actionId: 'fail-act',
          changed: false,
          stateRevision: state.revision,
          message: 'Validation failed.',
          changedEntities: [],
        },
      }),
      {
        activity: {
          id: 'fail-activity',
          summary: 'Failed op',
          status: 'failed',
        },
      },
    );

    expect(failedReceipt.kind).toBe('failure');
    expect(store.getState().ui.recentEffect).toBeNull();
    expect(store.getState().application.revision).toBe(0);

    // If failure recorded activity, its revisions must be equal
    const failEntry = store
      .getState()
      .ui.activity.find((a) => a.id === 'fail-activity');
    if (failEntry) {
      expect(failEntry.status).toBe('failed');
      expect(failEntry.beforeRevision).toBe(failEntry.afterRevision);
    }
  });

  it('existing dispatch receipt, persistence, lock, and no-op compatibility remains unchanged', () => {
    const storage = new FakeStorage();
    const { store } = createTestStore(storage);

    // Changed dispatch → revision bumped, persisted
    const r1 = store.dispatch(addMember);
    expect(r1.kind).toBe('success');
    expect(r1.changed).toBe(true);
    expect(r1.stateRevision).toBe(1);
    expect(store.getState().application.revision).toBe(1);
    expect(storage.setCalls).toBeGreaterThan(0);

    // No-op dispatch → revision unchanged, not persisted
    const writesBefore = storage.setCalls;
    const r2 = store.dispatch((state) => ({
      nextState: state,
      receipt: {
        kind: 'success',
        code: 'OK',
        actionId: 'noop',
        changed: false,
        stateRevision: state.revision,
        message: 'No changes.',
        changedEntities: [],
      },
    }));
    expect(r2.changed).toBe(false);
    expect(store.getState().application.revision).toBe(1);
    expect(storage.setCalls).toBe(writesBefore);

    // Validation failure → not changed
    const r3 = store.dispatch((state) => ({
      nextState: state,
      receipt: {
        kind: 'failure',
        code: 'VALIDATION_ERROR',
        actionId: 'fail',
        changed: false,
        stateRevision: state.revision,
        message: 'Bad input.',
        changedEntities: [],
      },
    }));
    expect(r3.kind).toBe('failure');
    expect(r3.changed).toBe(false);
  });

  it('activity status/source/section/revision overrides are preserved when explicitly supplied', () => {
    const { store } = createTestStore();

    const explicitEntry: ActivityEntry = {
      id: 'override-act',
      summary: 'Explicit overrides',
      source: 'webmcp',
      status: 'undone',
      section: 'income',
      occurredAt: '2026-01-01T00:00:00.000Z',
      beforeRevision: 42,
      afterRevision: 43,
      affectedEntities: [{ kind: 'income_source', id: 'inc-1', label: 'Job' }],
    };

    store.appendActivity(explicitEntry);

    const entry = store.getState().ui.activity[0];
    expect(entry!.source).toBe('webmcp');
    expect(entry!.status).toBe('undone');
    expect(entry!.section).toBe('income');
    expect(entry!.occurredAt).toBe('2026-01-01T00:00:00.000Z');
    expect(entry!.beforeRevision).toBe(42);
    expect(entry!.afterRevision).toBe(43);
    expect(entry!.affectedEntities).toEqual([
      { kind: 'income_source', id: 'inc-1', label: 'Job' },
    ]);
  });

  it('dispatch with an operation descriptor publishes a succeeded lifecycle using the receipt action ID, revision, and affected entity IDs', () => {
    const { storage, store } = createTestStore();
    const writesBefore = storage.setCalls;

    const receipt = store.dispatch(addMember, {
      activity: { id: 'add-member-op', summary: 'Add member' },
      operation: makeDescriptor({
        actionId: 'generated-1',
        beforeRevision: 0,
        section: 'household',
        label: 'Add member',
      }),
    });

    // Receipt is a changed success with action ID 'generated-1' and stateRevision 1
    expect(receipt.kind).toBe('success');
    expect(receipt.changed).toBe(true);
    expect(receipt.actionId).toBe('generated-1');
    expect(receipt.stateRevision).toBe(1);

    // Active operation is succeeded with correct descriptor and revision metadata
    const op = store.getState().ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op!.phase).toBe('succeeded');
    expect(op!.actionId).toBe('generated-1');
    expect(op!.beforeRevision).toBe(0);
    expect(op!.afterRevision).toBe(1);
    // Generated member ID is 'generated-2' (generated-1 is used for the action ID)
    expect(op!.affectedEntityIds).toContain('generated-2');

    // Application revision and persistence are unchanged from normal dispatch
    expect(store.getState().application.revision).toBe(1);
    expect(storage.setCalls).toBeGreaterThan(writesBefore);
  });

  it('publishes applying operation state before the synchronous transition and terminal state after it', () => {
    const { storage, store } = createTestStore();
    const writesBefore = storage.setCalls;

    const operation = makeDescriptor({
      actionId: 'operation-observed',
      section: 'household',
      beforeRevision: 0,
    });

    let observedInsideTransition: OperationState | null = null;

    store.dispatch(
      (state) => {
        // Capture what the store has published for activeOperation at this point
        observedInsideTransition = store.getState().ui.activeOperation;
        // Return a successful no-op receipt (revision unchanged)
        return {
          receipt: {
            kind: 'success',
            code: 'OK',
            changed: false,
            actionId: 'operation-observed',
            stateRevision: state.revision,
            message: 'No changes were needed.',
            changedEntities: [] as ChangedEntitySummary[],
          },
          nextState: state,
        };
      },
      { operation },
    );

    // Inside the transition the store must have published the applying phase
    expect(observedInsideTransition).not.toBeNull();
    expect(observedInsideTransition!.phase).toBe('applying');
    expect(observedInsideTransition!.actionId).toBe('operation-observed');
    expect(observedInsideTransition!.section).toBe('household');
    expect(observedInsideTransition!.beforeRevision).toBe(0);
    expect(observedInsideTransition!.label).toBe('Add member');

    // After dispatch the terminal state is succeeded with the same action ID
    const op = store.getState().ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op!.phase).toBe('succeeded');
    expect(op!.actionId).toBe('operation-observed');

    // Application revision and storage writes must not change for a no-op dispatch
    expect(store.getState().application.revision).toBe(0);
    expect(storage.setCalls).toBe(writesBefore);
  });

  describe('truthful persistence UI state (Packet 5.2)', () => {
    it('initializes persistenceUiState as seed with untouched seed copy when storage is empty', () => {
      const storage = new FakeStorage();
      const { store } = createTestStore(storage);
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('seed');
      expect(state.persistenceUiState?.message).toBe(
        'Demo data ready · Changes save in this browser',
      );
      expect(storage.setCalls).toBe(0);
    });

    it('initializes persistenceUiState as fresh start when storage contains corrupt data', () => {
      const storage = new FakeStorage();
      storage.setItem(APPLICATION_STORAGE_KEY, '{invalid json');
      const { store } = createTestStore(storage);
      const state = store.getState();
      expect(state.persistenceNotice).toBe('recovered');
      expect(state.persistenceUiState?.message).toBe(
        'Started fresh after a browser save issue',
      );
    });
    it('initializes persistenceUiState as loaded when valid application is in storage, without timestamp', () => {
      const storage = new FakeStorage();
      const seeded = createDemoApplicationSeed();
      storage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(seeded));

      const { store } = createTestStore(storage);
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('loaded');
      expect(state.persistenceUiState?.message).toBe(
        'Loaded from this browser',
      );
      expect(state.persistenceUiState?.savedAt).toBeUndefined();
    });

    it('updates persistenceUiState to saved-this-session with clock time on real save', () => {
      const storage = new FakeStorage();
      const fixedDate = new Date('2026-08-28T14:30:00.000Z');
      const store = createCivicFlowStore({
        storage,
        now: () => fixedDate,
      });

      expect(store.getState().persistenceUiState?.status).toBe('seed');

      store.dispatch(addMember);
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('saved-this-session');
      expect(state.persistenceUiState?.savedAt).toBeDefined();
      expect(state.persistenceUiState?.message).toContain('All changes saved');
      expect(state.application.revision).toBe(1);
    });

    it('sets persistenceUiState to failed without changing application revision on write error', () => {
      const storage = new FakeStorage();
      const store = createCivicFlowStore({ storage });
      storage.writeError = new Error('Quota exceeded');

      store.dispatch(addMember);
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('failed');
      expect(state.persistenceNotice).toBe('save_failed');
      expect(state.application.revision).toBe(1); // Revision is incremented by command transition, but failed persistence does not modify it further
    });

    it('preserves persistenceUiState and revision across UI-only navigation or selection', () => {
      const storage = new FakeStorage();
      const store = createCivicFlowStore({ storage });
      store.dispatch(addMember);

      const savedState = store.getState().persistenceUiState;
      store.navigateToSection('household');
      expect(store.getState().persistenceUiState).toEqual(savedState);
      expect(store.getState().application.revision).toBe(1);
    });

    it('updates persistenceUiState truthfully on reset', () => {
      const storage = new FakeStorage();
      const store = createCivicFlowStore({ storage });
      store.dispatch(addMember);

      store.reset((state, context) => resetDemo(state, context));
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('saved-this-session');
      expect(state.application.revision).toBe(0);
    });

    it('initializes persistenceUiState as failed when storage is unavailable', () => {
      const store = createCivicFlowStore({ storage: null });
      const state = store.getState();
      expect(state.persistenceUiState?.status).toBe('failed');
      expect(state.persistenceUiState?.message).toBe(
        'Save unavailable · Changes may not survive reload',
      );
      expect(state.persistenceNotice).toBeNull();
      expect(state.application.revision).toBe(0);
    });

    it('retains in-memory state and marks save_failed on dispatch when storage is unavailable', () => {
      const store = createCivicFlowStore({ storage: null });
      const receipt = store.dispatch(addMember);

      expect(receipt.kind).toBe('success');
      const state = store.getState();
      expect(state.application.revision).toBe(1);
      expect(state.persistenceNotice).toBe('save_failed');
      expect(state.persistenceUiState?.status).toBe('failed');
      expect(state.persistenceUiState?.message).toBe(
        'Save unavailable · Changes may not survive reload',
      );
    });

    it('retains failed persistenceUiState on reset when storage is unavailable', () => {
      const store = createCivicFlowStore({ storage: null });
      store.dispatch(addMember);
      expect(store.getState().application.revision).toBe(1);

      store.reset((state, context) => resetDemo(state, context));
      const state = store.getState();
      expect(state.application.revision).toBe(0);
      expect(state.persistenceNotice).toBe('save_failed');
      expect(state.persistenceUiState?.status).toBe('failed');
      expect(state.persistenceUiState?.message).toBe(
        'Save unavailable · Changes may not survive reload',
      );
    });
  });
  describe('correlated feedback and effect kind (Packet M1)', () => {
    it('carries explicit actionId into command receipt, activity, and recent effect', () => {
      const { store } = createTestStore();

      const receipt = store.dispatch(addMember, {
        actionId: 'act-custom-123',
        source: 'webmcp',
        activity: {
          id: 'act-custom-123',
          summary: 'Added member',
        },
      });

      expect(receipt.actionId).toBe('act-custom-123');
      const state = store.getState();
      expect(state.ui.recentEffect?.actionId).toBe('act-custom-123');
      expect(state.ui.activity[0]?.id).toBe('act-custom-123');
    });

    it('distinguishes kind: created from kind: updated based on whether entity was created', () => {
      const { store } = createTestStore();

      // 1. Add household member -> kind: created
      store.dispatch(addMember, {
        actionId: 'act-add',
        activity: { id: 'act-add', summary: 'Added Alex' },
      });
      expect(store.getState().ui.recentEffect?.kind).toBe('created');

      // 2. Update existing household member -> kind: updated
      const memberId = store.getState().application.householdMembers[0].id;
      store.dispatch(
        (state, ctx) => ({
          nextState: {
            ...state,
            revision: state.revision + 1,
            householdMembers: state.householdMembers.map((m) =>
              m.id === memberId ? { ...m, ageYears: 13 } : m,
            ),
          },
          receipt: {
            kind: 'success',
            code: 'OK',
            actionId: ctx.newId(),
            changed: true,
            stateRevision: state.revision + 1,
            message: 'Updated Alex',
            changedEntities: [
              { kind: 'household_member', id: memberId, label: 'Alex Rivera' },
            ],
          },
        }),
        {
          actionId: 'act-update',
          activity: { id: 'act-update', summary: 'Updated Alex' },
        },
      );
      expect(store.getState().ui.recentEffect?.kind).toBe('updated');
      expect(store.getState().ui.recentEffect?.actionId).toBe('act-update');
    });
  });

  it('hydrates sanitized same-tab activity and clears it on reset', () => {
    sessionStorage.clear();
    sessionStorage.setItem(
      'civicflow.activity.v1',
      JSON.stringify([
        {
          id: 'retained-action',
          summary: 'Added a synthetic household member',
          source: 'webmcp',
          status: 'succeeded',
          section: 'household',
          occurredAt: fixedNow().toISOString(),
          beforeRevision: 0,
          afterRevision: 1,
          affectedEntities: [
            {
              kind: 'household_member',
              id: 'person-retained',
              label: 'Synthetic member',
            },
          ],
        },
      ]),
    );

    const { store } = createTestStore();
    expect(store.getState().ui.activity).toHaveLength(1);
    expect(store.getState().ui.activity[0]).toMatchObject({
      id: 'retained-action',
      status: 'succeeded',
    });

    store.reset((state, context) => resetDemo(state, context));

    expect(store.getState().ui.activity).toHaveLength(0);
    expect(sessionStorage.getItem('civicflow.activity.v1')).toBeNull();
  });

  it('persists only the allowlisted activity fields in same-tab storage', () => {
    sessionStorage.clear();
    const { store } = createTestStore();
    const unsafeEntry = {
      id: 'sanitized-action',
      summary: 'Updated synthetic household data',
      source: 'webmcp',
      status: 'succeeded',
      section: 'household',
      occurredAt: fixedNow().toISOString(),
      beforeRevision: 0,
      afterRevision: 1,
      affectedEntities: [],
      rawArguments: { firstName: 'Maya', ageYears: 27 },
      transcript: 'private transcript must not persist',
      audio: 'base64 audio must not persist',
      fullApplicationState: { applicant: { firstName: 'Maya' } },
      secret: 'not-a-secret',
    } as unknown as ActivityEntry;

    store.appendActivity(unsafeEntry);

    const serialized = sessionStorage.getItem('civicflow.activity.v1');
    expect(serialized).toContain('sanitized-action');
    expect(serialized).not.toContain('rawArguments');
    expect(serialized).not.toContain('transcript');
    expect(serialized).not.toContain('audio');
    expect(serialized).not.toContain('fullApplicationState');
    expect(serialized).not.toContain('not-a-secret');
  });

  it('preserves all eight ChangedEntityKind kinds through the retention sanitizer allowlist', () => {
    sessionStorage.clear();
    const { store } = createTestStore();

    const allKinds: ChangedEntitySummary[] = [
      { kind: 'application', id: 'app-1', label: 'Application' },
      { kind: 'applicant', id: 'person-maya', label: 'Maya Carter' },
      { kind: 'household_member', id: 'person-emma', label: 'Emma Carter' },
      { kind: 'income_source', id: 'inc-1', label: 'Acme Dental' },
      { kind: 'coverage_record', id: 'cov-1', label: 'Health Plan' },
      { kind: 'document', id: 'doc-1', label: 'Paystub' },
      { kind: 'attestation', id: 'attest-1', label: 'Attestation' },
      { kind: 'submission', id: 'sub-1', label: 'Submission' },
    ];

    store.appendActivity({
      id: 'all-kinds-action',
      summary: 'Action with all entity kinds',
      source: 'webmcp',
      status: 'succeeded',
      section: 'household',
      occurredAt: fixedNow().toISOString(),
      beforeRevision: 0,
      afterRevision: 1,
      affectedEntities: allKinds,
    });

    const serialized = sessionStorage.getItem('civicflow.activity.v1');
    expect(serialized).not.toBeNull();
    const parsed = JSON.parse(serialized!);
    expect(parsed[0].affectedEntities).toHaveLength(8);
    const retainedKinds = parsed[0].affectedEntities.map(
      (e: ChangedEntitySummary) => e.kind,
    );
    expect(retainedKinds).toEqual([
      'application',
      'applicant',
      'household_member',
      'income_source',
      'coverage_record',
      'document',
      'attestation',
      'submission',
    ]);
  });

  it('does not fall back to global session storage when retention is explicitly disabled', () => {
    sessionStorage.clear();
    const storage = new FakeStorage();
    const store = createCivicFlowStore({
      storage,
      sessionStorage: null,
      now: fixedNow,
      newId: () => 'disabled-storage-id',
    });

    store.appendActivity({
      id: 'disabled-retention',
      summary: 'Activity should remain in memory only',
    });

    expect(store.getState().ui.activity).toHaveLength(1);
    expect(sessionStorage.getItem('civicflow.activity.v1')).toBeNull();
  });
});
