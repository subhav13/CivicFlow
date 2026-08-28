/**
 * Packet 1.3 — WebMCP lifecycle wrapper integration tests.
 *
 * Uses real createCivicFlowStore and createStaticToolHandlers. Deterministic
 * deferred promises gate the stale/abort cases; no artificial delays.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowState,
  type CivicFlowStore,
} from '../../src/application/store';
import {
  createStaticToolHandlers,
  type WebMcpToolHandlers,
} from '../../src/webmcp/tool-handlers';
import {
  CIVICFLOW_TOOL_NAMES,
  TOOL_CATALOG,
} from '../../src/webmcp/tool-catalog';
import { runWebMcpMutation } from '../../src/webmcp/tool-lifecycle';

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseResult(raw: string): Record<string, unknown> {
  const match = raw.match(/^\{[\s\S]*\}/);
  if (!match) throw new Error(`Not JSON: ${raw.slice(0, 200)}`);
  return JSON.parse(match[0]) as Record<string, unknown>;
}

function collectStates(
  store: CivicFlowStore,
  count: number,
): Promise<CivicFlowState[]> {
  const { promise, resolve } = Promise.withResolvers<CivicFlowState[]>();
  const snapshots: CivicFlowState[] = [];
  const unsub = store.subscribe((state) => {
    snapshots.push(state);
    if (snapshots.length >= count) {
      unsub();
      resolve(snapshots);
    }
  });
  return promise;
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('WebMCP tool operation lifecycle (Packet 1.3)', () => {
  let store: CivicFlowStore;
  let handlers: WebMcpToolHandlers;

  beforeEach(() => {
    store = createCivicFlowStore();
    handlers = createStaticToolHandlers(store);
  });

  // ── 1 ──────────────────────────────────────────────────────────────────────
  it('publishes applying then succeeded with the returned actionId, receipt revision, and changed entity IDs', async () => {
    const beforeRevision = store.getState().application.revision;

    // Collect state snapshots to assert applying was visible before success.
    const snapshotsP = collectStates(store, 3);

    const resultP = handlers.add_household_member({
      firstName: 'Alice',
      ageYears: 30,
      relationship: 'spouse',
      applyingForCoverage: true,
    });

    const [raw, snapshots] = await Promise.all([resultP, snapshotsP]);
    const parsed = parseResult(raw);

    expect(parsed.ok).toBe(true);

    const actionId = parsed.actionId as string;
    expect(typeof actionId).toBe('string');
    expect(actionId.length).toBeGreaterThan(0);

    // An applying state must have been observed before completion
    const applyingSnap = snapshots.find(
      (s) => s.ui.activeOperation?.phase === 'applying',
    );
    expect(applyingSnap).toBeDefined();
    expect(applyingSnap!.ui.activeOperation!.actionId).toBe(actionId);

    // Final store state
    const finalState = store.getState();
    const op = finalState.ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op!.phase).toBe('succeeded');
    expect(op!.actionId).toBe(actionId);

    // Revision parity
    expect(op!.beforeRevision).toBe(beforeRevision);
    const stateRevision = parsed.stateRevision as number;
    expect(op!.afterRevision).toBe(stateRevision);
    expect(finalState.application.revision).toBe(stateRevision);
    expect(stateRevision).toBeGreaterThan(beforeRevision);

    // Changed entity IDs in the operation
    expect(Array.isArray(op!.affectedEntityIds)).toBe(true);
    expect(op!.affectedEntityIds.length).toBeGreaterThan(0);

    // Recent effect and activity share the same actionId as the result
    expect(finalState.ui.recentEffect).not.toBeNull();
    expect(finalState.ui.recentEffect!.actionId).toBe(actionId);
    expect(finalState.ui.recentEffect!.kind).toBe('created');
    expect(finalState.ui.activity[0]?.id).toBe(actionId);
    expect(finalState.ui.activity[0]?.status).toBe('succeeded');
  });

  // ── 1b ─────────────────────────────────────────────────────────────────────
  it('publishes kind: updated for real updates and correlates actionId', async () => {
    // First add a member so one is selected
    const addRaw = await handlers.add_household_member({
      firstName: 'Alice',
      ageYears: 30,
      relationship: 'spouse',
      applyingForCoverage: true,
    });
    const addParsed = parseResult(addRaw);
    expect(addParsed.ok).toBe(true);
    expect(store.getState().ui.recentEffect?.kind).toBe('created');

    // Now update that selected member
    const updateRaw = await handlers.update_household_member({
      ageYears: 31,
    });
    const updateParsed = parseResult(updateRaw);
    expect(updateParsed.ok).toBe(true);
    const updateActionId = updateParsed.actionId as string;

    const stateAfterUpdate = store.getState();
    expect(stateAfterUpdate.ui.recentEffect).not.toBeNull();
    expect(stateAfterUpdate.ui.recentEffect!.actionId).toBe(updateActionId);
    expect(stateAfterUpdate.ui.recentEffect!.kind).toBe('updated');
    expect(stateAfterUpdate.ui.activeOperation?.actionId).toBe(updateActionId);
    expect(stateAfterUpdate.ui.activity[0]?.id).toBe(updateActionId);
    expect(stateAfterUpdate.ui.activity[0]?.status).toBe('succeeded');
  });

  // ── 2 ──────────────────────────────────────────────────────────────────────
  it('publishes failed for a real command failure without changing application revision', async () => {
    const beforeRevision = store.getState().application.revision;

    // update_household_member with no selection → CONTEXT_STALE before dispatch
    const raw = await handlers.update_household_member({
      firstName: 'Bob',
    });

    const parsed = parseResult(raw);
    expect(parsed.ok).toBe(false);

    const actionId = parsed.actionId as string;

    const finalState = store.getState();
    const op = finalState.ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op!.phase).toBe('failed');
    expect(op!.actionId).toBe(actionId);

    expect(finalState.application.revision).toBe(beforeRevision);
    expect(op!.beforeRevision).toBe(beforeRevision);
    expect(op!.afterRevision).toBeUndefined();
  });

  // ── 3 ──────────────────────────────────────────────────────────────────────
  it('publishes failed for validation failures without changing application revision', async () => {
    const beforeRevision = store.getState().application.revision;

    // Missing firstName — Ajv INVALID_ARGUMENTS
    const raw = await handlers.add_household_member({
      ageYears: 30,
      relationship: 'spouse',
      applyingForCoverage: true,
    });

    const parsed = parseResult(raw);
    expect(parsed.ok).toBe(false);

    const actionId = parsed.actionId as string;

    const finalState = store.getState();
    const op = finalState.ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op!.phase).toBe('failed');
    expect(op!.actionId).toBe(actionId);

    expect(finalState.application.revision).toBe(beforeRevision);
  });
  // ── 3c ─────────────────────────────────────────────────────────────────────
  it('creates exactly one failed activity entry for pre-dispatch PERSON_NOT_FOUND failure with recovery data', async () => {
    const beforeRevision = store.getState().application.revision;

    // Emma Carter has not been added yet → PERSON_NOT_FOUND pre-dispatch failure
    const raw = await handlers.add_income_source({
      ownerName: 'Emma Carter',
      employerName: 'Acme Corp',
      amount: 500,
      frequency: 'monthly',
    });

    const parsed = parseResult(raw);
    expect(parsed.ok).toBe(false);
    expect((parsed.error as { code: string }).code).toBe('PERSON_NOT_FOUND');
    const actionId = parsed.actionId as string;
    expect(actionId).toBeTruthy();

    const finalState = store.getState();
    expect(finalState.application.revision).toBe(beforeRevision);

    // Exactly one activity row for this actionId
    const matching = finalState.ui.activity.filter((a) => a.id === actionId);
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      id: actionId,
      status: 'failed',
      beforeRevision,
      afterRevision: beforeRevision,
    });
    expect(matching[0]?.recovery).toBeDefined();
    expect(matching[0]?.recovery?.section).toBe('household');
    expect(matching[0]?.recovery?.suggestedTool).toBe('add_household_member');
    expect(matching[0]?.recovery?.requiredFields).toContain('firstName');
  });
  // ── 3b ─────────────────────────────────────────────────────────────────────
  it('publishes lifecycle correctly for add_income_source, update_income_source, and set_current_coverage', async () => {
    const applicant = store.getState().application.applicant;
    const fullName = `${applicant.firstName} ${applicant.lastName}`;

    // 1. add_income_source success lifecycle
    const revBeforeIncome = store.getState().application.revision;
    const rawIncome = await handlers.add_income_source({
      ownerName: fullName,
      employerName: 'Acme Corp',
      amount: 3500.5,
      frequency: 'monthly',
    });
    const parsedIncome = parseResult(rawIncome);
    expect(parsedIncome.ok).toBe(true);
    const opIncome = store.getState().ui.activeOperation;
    expect(opIncome?.phase).toBe('succeeded');
    expect(opIncome?.actionId).toBe(parsedIncome.actionId);
    expect(opIncome?.toolName).toBe('add_income_source');
    expect(store.getState().application.revision).toBe(
      parsedIncome.stateRevision,
    );
    expect(store.getState().application.revision).toBeGreaterThan(
      revBeforeIncome,
    );

    // 2. update_income_source failure lifecycle (no selection)
    store.clearSelection();
    const revBeforeNoSel = store.getState().application.revision;
    const rawNoSel = await handlers.update_income_source({ amount: 4000 });
    const parsedNoSel = parseResult(rawNoSel);
    expect(parsedNoSel.ok).toBe(false);
    const opNoSel = store.getState().ui.activeOperation;
    expect(opNoSel?.phase).toBe('failed');
    expect(opNoSel?.actionId).toBe(parsedNoSel.actionId);
    expect(store.getState().application.revision).toBe(revBeforeNoSel);

    // 3. update_income_source success lifecycle (with selection)
    const incomeSources = store.getState().application.incomeSources;
    expect(incomeSources.length).toBeGreaterThan(0);
    store.selectRecord({ kind: 'income', id: incomeSources[0]!.id });
    const revBeforeUpdate = store.getState().application.revision;
    const rawUpdate = await handlers.update_income_source({ amount: 4200 });
    const parsedUpdate = parseResult(rawUpdate);
    expect(parsedUpdate.ok).toBe(true);
    const opUpdate = store.getState().ui.activeOperation;
    expect(opUpdate?.phase).toBe('succeeded');
    expect(opUpdate?.actionId).toBe(parsedUpdate.actionId);
    expect(opUpdate?.toolName).toBe('update_income_source');
    expect(store.getState().application.revision).toBe(
      parsedUpdate.stateRevision,
    );
    expect(store.getState().application.revision).toBeGreaterThan(
      revBeforeUpdate,
    );

    // 4. set_current_coverage failure lifecycle (invalid input / missing provider)
    const revBeforeCovFail = store.getState().application.revision;
    const rawCovFail = await handlers.set_current_coverage({
      memberNames: [fullName],
      status: 'covered',
      providerName: '',
    });
    const parsedCovFail = parseResult(rawCovFail);
    expect(parsedCovFail.ok).toBe(false);
    const opCovFail = store.getState().ui.activeOperation;
    expect(opCovFail?.phase).toBe('failed');
    expect(opCovFail?.actionId).toBe(parsedCovFail.actionId);
    expect(store.getState().application.revision).toBe(revBeforeCovFail);

    // 5. set_current_coverage success lifecycle
    const revBeforeCov = store.getState().application.revision;
    const rawCov = await handlers.set_current_coverage({
      memberNames: [fullName],
      status: 'covered',
      providerName: 'HealthNet Direct',
      planName: 'Gold 80',
    });
    const parsedCov = parseResult(rawCov);
    expect(parsedCov.ok).toBe(true);
    const opCov = store.getState().ui.activeOperation;
    expect(opCov?.phase).toBe('succeeded');
    expect(opCov?.actionId).toBe(parsedCov.actionId);
    expect(opCov?.toolName).toBe('set_current_coverage');
    expect(store.getState().application.revision).toBe(parsedCov.stateRevision);
    expect(store.getState().application.revision).toBeGreaterThan(revBeforeCov);
  });

  // ── 4 ──────────────────────────────────────────────────────────────────────
  it('does not enter mutation lifecycle for read-only or navigation handlers', async () => {
    const beforeRevision = store.getState().application.revision;

    const r1 = await handlers.get_application_progress({});
    expect(parseResult(r1).ok).toBe(true);
    expect(store.getState().ui.activeOperation).toBeNull();

    const r2 = await handlers.navigate_to_section({ section: 'household' });
    expect(parseResult(r2).ok).toBe(true);
    expect(store.getState().ui.activeOperation).toBeNull();

    const r3 = await handlers.list_uploaded_documents({});
    expect(parseResult(r3).ok).toBe(true);
    expect(store.getState().ui.activeOperation).toBeNull();

    const r4 = await handlers.navigate_to_section({ section: 'review' });
    expect(parseResult(r4).ok).toBe(true);
    expect(store.getState().ui.activeOperation).toBeNull();

    const r5 = await handlers.review_application({});
    expect(parseResult(r5).ok).toBe(true);
    expect(store.getState().ui.activeOperation).toBeNull();

    expect(store.getState().application.revision).toBe(beforeRevision);

    const summaries = store.getState().ui.activity.map((a) => a.summary);
    expect(summaries).toContain('Navigated to Household section');
    expect(summaries).toContain('Navigated to Review & Sign section');
    expect(summaries.some((s) => s.startsWith('Reviewed application'))).toBe(
      true,
    );
  });

  // ── 5 ──────────────────────────────────────────────────────────────────────
  it('ignores stale completion when a newer operation owns the store', async () => {
    const { promise: gateA, resolve: resolveA } = Promise.withResolvers<void>();

    const revisionBefore = store.getState().application.revision;

    const descriptorA = {
      actionId: 'act-A',
      source: 'webmcp' as const,
      label: 'Op A',
      section: 'household',
      toolName: 'add_household_member',
      startedAt: new Date().toISOString(),
      beforeRevision: revisionBefore,
    };

    // Operation A — held behind gateA
    const resultAP = runWebMcpMutation(
      store,
      descriptorA,
      async () => {
        await gateA;
        return {
          serialized: JSON.stringify({
            ok: true,
            actionId: 'act-A',
            changed: true,
            stateRevision: revisionBefore + 1,
          }),
          status: 'success' as const,
          stateRevision: revisionBefore + 1,
          changed: true,
          changedEntityIds: ['entity-a'],
        };
      },
      undefined,
    );

    // Operation B — starts immediately and completes before A resolves
    const descriptorB = {
      actionId: 'act-B',
      source: 'webmcp' as const,
      label: 'Op B',
      section: 'household',
      toolName: 'add_household_member',
      startedAt: new Date().toISOString(),
      beforeRevision: revisionBefore,
    };

    const resultBP = runWebMcpMutation(
      store,
      descriptorB,
      async () => ({
        serialized: JSON.stringify({
          ok: true,
          actionId: 'act-B',
          changed: false,
          stateRevision: revisionBefore,
        }),
        status: 'success' as const,
        stateRevision: revisionBefore,
        changed: false,
        changedEntityIds: [],
      }),
      undefined,
    );

    // B finishes first, then A resolves
    await resultBP;
    resolveA();
    await resultAP;

    // Store must show B's operation — A's stale completion is ignored
    const finalOp = store.getState().ui.activeOperation;
    expect(finalOp).not.toBeNull();
    expect(finalOp!.actionId).toBe('act-B');
  });

  // ── 6 ──────────────────────────────────────────────────────────────────────
  it('aborted mutation cannot publish success or increment application revision', async () => {
    const controller = new AbortController();
    const revisionBefore = store.getState().application.revision;
    const { promise: callbackGate, resolve: resolveCallback } =
      Promise.withResolvers<void>();

    const descriptor = {
      actionId: 'act-abort',
      source: 'webmcp' as const,
      label: 'Abort test',
      section: 'household',
      toolName: 'add_household_member',
      startedAt: new Date().toISOString(),
      beforeRevision: revisionBefore,
    };

    // Abort before the callback can be reached
    controller.abort();

    let threw = false;
    try {
      await runWebMcpMutation(
        store,
        descriptor,
        async () => {
          await callbackGate;
          return {
            serialized: JSON.stringify({
              ok: true,
              actionId: 'act-abort',
              changed: true,
              stateRevision: revisionBefore + 1,
            }),
            status: 'success' as const,
            stateRevision: revisionBefore + 1,
            changed: true,
            changedEntityIds: ['new-entity'],
          };
        },
        controller.signal,
      );
    } catch {
      threw = true;
    }

    // Unblock the callback to avoid dangling promises
    resolveCallback();

    // Application revision must not have incremented
    expect(store.getState().application.revision).toBe(revisionBefore);

    // No succeeded operation
    const op = store.getState().ui.activeOperation;
    const phase = op?.phase;
    expect(phase === 'succeeded').toBe(false);

    if (!threw) {
      // If no throw, operation must be failed or null
      expect(phase === 'failed' || op === null).toBe(true);
    }
  });

  // ── 7 ──────────────────────────────────────────────────────────────────────
  it('preserves byte-compatible mutation result envelopes and the ten-tool catalog', async () => {
    expect(CIVICFLOW_TOOL_NAMES).toHaveLength(10);

    const expectedNine = [
      'get_application_progress',
      'navigate_to_section',
      'add_household_member',
      'update_household_member',
      'add_income_source',
      'update_income_source',
      'set_current_coverage',
      'list_uploaded_documents',
      'review_application',
    ] as const;

    const expectedTen = [...expectedNine, 'get_next_actions'] as const;
    expect([...CIVICFLOW_TOOL_NAMES].sort()).toEqual([...expectedTen].sort());

    for (const name of expectedNine) {
      expect(TOOL_CATALOG[name]).toBeDefined();
    }
    expect(TOOL_CATALOG.get_next_actions).toBeDefined();
    // Success envelope fields preserved
    const raw = await handlers.add_household_member({
      firstName: 'Carol',
      ageYears: 25,
      relationship: 'child',
      applyingForCoverage: false,
    });
    const parsed = parseResult(raw);

    expect(typeof parsed.ok).toBe('boolean');
    expect(typeof parsed.tool).toBe('string');
    expect(typeof parsed.actionId).toBe('string');
    expect(typeof parsed.changed).toBe('boolean');
    expect(typeof parsed.stateRevision).toBe('number');

    // Failure envelope fields preserved
    const rawFail = await handlers.add_household_member({
      ageYears: 25,
      relationship: 'child',
      applyingForCoverage: false,
    });
    const parsedFail = parseResult(rawFail);
    expect(parsedFail.ok).toBe(false);
    expect(typeof (parsedFail.error as { code?: string })?.code).toBe('string');
    expect(typeof parsedFail.actionId).toBe('string');
  });
});
