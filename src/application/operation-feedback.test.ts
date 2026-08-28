import { describe, expect, it } from 'vitest';
import {
  reduceOperation,
  type OperationDescriptor,
  type OperationState,
} from './operation-feedback';

// ── fixtures ─────────────────────────────────────────────────────────────────

const BASE_DESC: OperationDescriptor = {
  actionId: 'action-1',
  source: 'human',
  label: 'Add member',
  section: 'household',
  startedAt: '2026-08-27T10:00:00.000Z',
  beforeRevision: 5,
};

const WEBMCP_DESC: OperationDescriptor = {
  actionId: 'action-2',
  source: 'webmcp',
  label: 'Update income',
  section: 'income',
  toolName: 'updateIncome',
  startedAt: '2026-08-27T11:00:00.000Z',
  beforeRevision: 7,
};

const AFFECTED_IDS = ['entity-a', 'entity-b'];

// ── helpers ──────────────────────────────────────────────────────────────────

function startOp(desc = BASE_DESC): OperationState {
  const result = reduceOperation(null, { type: 'start', operation: desc });
  if (result === null) throw new Error('start returned null');
  return result;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('reduceOperation', () => {
  // start
  describe('start', () => {
    it('creates a validating state with all descriptor metadata', () => {
      const state = startOp();

      expect(state.phase).toBe('validating');
      expect(state.actionId).toBe('action-1');
      expect(state.source).toBe('human');
      expect(state.label).toBe('Add member');
      expect(state.section).toBe('household');
      expect(state.toolName).toBeUndefined();
      expect(state.startedAt).toBe('2026-08-27T10:00:00.000Z');
      expect(state.beforeRevision).toBe(5);
      expect(state.completedAt).toBeUndefined();
      expect(state.afterRevision).toBeUndefined();
      expect(state.affectedEntityIds).toEqual([]);
      expect(state.recovery).toBeUndefined();
    });

    it('copies toolName when provided in descriptor', () => {
      const state = startOp(WEBMCP_DESC);
      expect(state.toolName).toBe('updateIncome');
      expect(state.source).toBe('webmcp');
    });

    it('supersedes an existing completed (succeeded) state', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      state = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:01:00.000Z',
        afterRevision: 6,
        affectedEntityIds: AFFECTED_IDS,
      });
      expect(state?.phase).toBe('succeeded');

      // new start supersedes
      const next = reduceOperation(state, {
        type: 'start',
        operation: WEBMCP_DESC,
      });
      expect(next?.phase).toBe('validating');
      expect(next?.actionId).toBe('action-2');
    });

    it('supersedes a failed state', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:01:00.000Z',
      });
      expect(state?.phase).toBe('failed');

      const next = reduceOperation(state, {
        type: 'start',
        operation: WEBMCP_DESC,
      });
      expect(next?.phase).toBe('validating');
      expect(next?.actionId).toBe('action-2');
    });
  });

  // advance
  describe('advance (validating → applying)', () => {
    it('transitions matching operation from validating to applying', () => {
      const before = startOp();
      const after = reduceOperation(before, {
        type: 'advance',
        actionId: 'action-1',
      });

      expect(after?.phase).toBe('applying');
      // all other fields preserved
      expect(after?.actionId).toBe('action-1');
      expect(after?.label).toBe('Add member');
    });

    it('returns current reference for mismatched action ID', () => {
      const before = startOp();
      const after = reduceOperation(before, {
        type: 'advance',
        actionId: 'stale-id',
      });
      expect(after).toBe(before);
    });

    it('returns null unchanged when current is null', () => {
      const after = reduceOperation(null, {
        type: 'advance',
        actionId: 'action-1',
      });
      expect(after).toBeNull();
    });

    it('returns current reference for an operation already in applying phase', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      const same = reduceOperation(state, {
        type: 'advance',
        actionId: 'action-1',
      });
      expect(same).toBe(state);
    });

    it('returns current reference when phase is terminal (succeeded)', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      state = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:01:00.000Z',
        afterRevision: 6,
        affectedEntityIds: [],
      });
      const same = reduceOperation(state, {
        type: 'advance',
        actionId: 'action-1',
      });
      expect(same).toBe(state);
    });

    it('returns current reference when phase is terminal (failed)', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:01:00.000Z',
      });
      const same = reduceOperation(state, {
        type: 'advance',
        actionId: 'action-1',
      });
      expect(same).toBe(state);
    });
  });

  // succeed
  describe('succeed (applying → succeeded)', () => {
    it('transitions matching operation from applying to succeeded with metadata', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      const after = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 9,
        affectedEntityIds: AFFECTED_IDS,
      });

      expect(after?.phase).toBe('succeeded');
      expect(after?.completedAt).toBe('2026-08-27T10:05:00.000Z');
      expect(after?.afterRevision).toBe(9);
      expect(after?.affectedEntityIds).toEqual(AFFECTED_IDS);
    });

    it('returns current reference for direct validating → succeed (invalid)', () => {
      const state = startOp();
      const same = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: [],
      });
      expect(same).toBe(state);
    });

    it('returns current reference for mismatched action ID on succeed', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      const same = reduceOperation(state, {
        type: 'succeed',
        actionId: 'stale-id',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: [],
      });
      expect(same).toBe(state);
    });

    it('returns current reference for double succeed (terminal → succeed)', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      state = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: [],
      });
      const same = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:06:00.000Z',
        afterRevision: 7,
        affectedEntityIds: [],
      });
      expect(same).toBe(state);
    });
  });

  // fail
  describe('fail (validating | applying → failed)', () => {
    it('transitions from validating to failed with completedAt', () => {
      const state = startOp();
      const after = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:03:00.000Z',
      });
      expect(after?.phase).toBe('failed');
      expect(after?.completedAt).toBe('2026-08-27T10:03:00.000Z');
    });

    it('transitions from applying to failed with recovery descriptor', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      const recovery = {
        section: 'household',
        message: 'First name is required',
        suggestedTool: 'addHouseholdMember',
        requiredFields: ['firstName'] as readonly string[],
        focusTargetId: 'field-firstName',
      };
      const after = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:03:30.000Z',
        recovery,
      });
      expect(after?.phase).toBe('failed');
      expect(after?.recovery).toEqual(recovery);
    });

    it('returns current reference for mismatched action ID on fail', () => {
      const state = startOp();
      const same = reduceOperation(state, {
        type: 'fail',
        actionId: 'wrong-id',
        completedAt: '2026-08-27T10:03:00.000Z',
      });
      expect(same).toBe(state);
    });

    it('returns current reference for terminal → fail (invalid)', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      state = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: [],
      });
      const same = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:06:00.000Z',
      });
      expect(same).toBe(state);
    });

    it('returns current reference for double fail (failed → fail invalid)', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:03:00.000Z',
      });
      const same = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:04:00.000Z',
      });
      expect(same).toBe(state);
    });
  });

  // clear
  describe('clear', () => {
    it('returns null when clearing current operation by matching ID', () => {
      const state = startOp();
      const after = reduceOperation(state, {
        type: 'clear',
        actionId: 'action-1',
      });
      expect(after).toBeNull();
    });

    it('returns null when clearing without an actionId (wildcard clear)', () => {
      const state = startOp();
      const after = reduceOperation(state, { type: 'clear' });
      expect(after).toBeNull();
    });

    it('returns current reference for mismatched actionId on clear', () => {
      const state = startOp();
      const same = reduceOperation(state, {
        type: 'clear',
        actionId: 'wrong-id',
      });
      expect(same).toBe(state);
    });

    it('returns null when clearing null (no-op on null)', () => {
      const after = reduceOperation(null, { type: 'clear' });
      expect(after).toBeNull();
    });

    it('returns null when clearing null with explicit (unmatched) actionId', () => {
      const after = reduceOperation(null, {
        type: 'clear',
        actionId: 'action-1',
      });
      expect(after).toBeNull();
    });
  });

  // immutability
  describe('immutability and reference stability', () => {
    it('every real transition returns a new object', () => {
      const s0 = startOp();
      const s1 = reduceOperation(s0, { type: 'advance', actionId: 'action-1' });
      expect(s1).not.toBe(s0);

      const s2 = reduceOperation(s1, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: AFFECTED_IDS,
      });
      expect(s2).not.toBe(s1);
    });

    it('does not mutate the input state object', () => {
      const s0 = startOp();
      const s1 = reduceOperation(s0, { type: 'advance', actionId: 'action-1' });
      expect(s0.phase).toBe('validating');
      expect(s1?.phase).toBe('applying');
    });

    it('does not mutate caller-owned affectedEntityIds array', () => {
      let state: OperationState | null = startOp();
      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      const callerIds = ['e1', 'e2'];
      const after = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:05:00.000Z',
        afterRevision: 6,
        affectedEntityIds: callerIds,
      });
      callerIds.push('e3');
      expect(after?.affectedEntityIds).toEqual(['e1', 'e2']);
      expect(after?.affectedEntityIds).not.toBe(callerIds);
    });

    it('does not mutate caller-owned recovery.requiredFields array', () => {
      const state = startOp();
      const callerFields = ['firstName'] as string[];
      const after = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:03:00.000Z',
        recovery: {
          section: 'household',
          message: 'Required',
          requiredFields: callerFields,
        },
      });
      callerFields.push('lastName');
      expect(after?.recovery?.requiredFields).toEqual(['firstName']);
      expect(after?.recovery?.requiredFields).not.toBe(callerFields);
    });

    it('no-op actions return exact same reference', () => {
      const state = startOp();
      const same = reduceOperation(state, {
        type: 'advance',
        actionId: 'wrong',
      });
      expect(same).toBe(state);
    });

    it('start defensively copies affectedEntityIds to empty array, not shared ref', () => {
      const s = startOp();
      expect(s.affectedEntityIds).toEqual([]);
      // ensure it's a distinct array each time
      const s2 = startOp(WEBMCP_DESC);
      expect(s2.affectedEntityIds).not.toBe(s.affectedEntityIds);
    });
  });

  // full lifecycle
  describe('full lifecycle path', () => {
    it('validating → applying → succeeded records all terminal metadata', () => {
      let state: OperationState | null = reduceOperation(null, {
        type: 'start',
        operation: BASE_DESC,
      });
      expect(state?.phase).toBe('validating');

      state = reduceOperation(state, { type: 'advance', actionId: 'action-1' });
      expect(state?.phase).toBe('applying');

      state = reduceOperation(state, {
        type: 'succeed',
        actionId: 'action-1',
        completedAt: '2026-08-27T10:10:00.000Z',
        afterRevision: 10,
        affectedEntityIds: ['ent-1'],
      });
      expect(state?.phase).toBe('succeeded');
      expect(state?.completedAt).toBe('2026-08-27T10:10:00.000Z');
      expect(state?.afterRevision).toBe(10);
      expect(state?.affectedEntityIds).toEqual(['ent-1']);
      expect(state?.actionId).toBe('action-1');
      expect(state?.beforeRevision).toBe(5);
    });

    it('validating → failed path preserves descriptor fields', () => {
      const state = startOp(WEBMCP_DESC);
      const after = reduceOperation(state, {
        type: 'fail',
        actionId: 'action-2',
        completedAt: '2026-08-27T11:01:00.000Z',
        recovery: { section: 'income', message: 'Value out of range' },
      });
      expect(after?.phase).toBe('failed');
      expect(after?.completedAt).toBe('2026-08-27T11:01:00.000Z');
      expect(after?.toolName).toBe('updateIncome');
      expect(after?.recovery?.section).toBe('income');
      expect(after?.recovery?.message).toBe('Value out of range');
    });
  });
});
