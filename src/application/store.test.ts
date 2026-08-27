import { addHouseholdMember, resetDemo } from './commands';
import { createDemoApplicationSeed } from '../domain';
import { APPLICATION_STORAGE_KEY, type StorageLike } from './persistence';
import { createCivicFlowStore } from './store';

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
});
