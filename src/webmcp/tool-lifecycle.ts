/**
 * WebMCP mutation lifecycle wrapper — Packet 1.3.
 *
 * Owns lifecycle publication (begin/advance/complete/fail) around an existing
 * handler callback. Does not own validation, command dispatch, selection,
 * navigation, result serialization, DOM, timers, or persistence.
 */
import type { CivicFlowStore } from '../application/store';
import type {
  OperationDescriptor,
  OperationState,
} from '../application/operation-feedback';
/** Terminal outcome returned by the mutation callback to the wrapper. */
export interface MutationOutcome {
  /** The already-serialized tool result string — returned verbatim to the caller. */
  serialized: string;
  /** Whether the callback reached a terminal success. */
  status: 'success' | 'failure';
  /** The state revision after the mutation (= beforeRevision for failure/no-op). */
  stateRevision: number;
  /** Whether the underlying command changed application state. */
  changed: boolean;
  /** IDs of entities changed by the command, empty for failure or no-op. */
  changedEntityIds: readonly string[];
  /** Structured recovery metadata for failure operations. */
  recovery?: OperationState['recovery'];
}

/**
 * Callback type for the mutation callback passed to runWebMcpMutation.
 * Owns all existing validation, command dispatch, result construction, and
 * selection/navigation side effects. Returns a MutationOutcome.
 */
export type MutationCallback = () => Promise<MutationOutcome>;

async function waitForPresentationBoundary(): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  } else if (typeof requestAnimationFrame === 'function') {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  } else {
    await Promise.resolve();
  }
}

/**
 * Runs a WebMCP mutation lifecycle around an existing handler callback.
 *
 * Semantics:
 * 1. Rejects immediately (publishes failed) if signal is already aborted.
 * 2. Calls store.beginOperation → store.advanceOperation so 'applying' is
 *    observable before the callback runs.
 * 3. Awaits a real presentation boundary (requestAnimationFrame or microtask).
 * 4. Invokes the callback (which owns validation, dispatch, result, selection).
 * 5. On success outcome: publishes completeOperation.
 * 6. On failure outcome: publishes failOperation.
 * 7. On throw or abort: publishes failOperation for the current action if it
 *    is still current, then rethrows.
 * 8. Stale fencing: store coordinator methods are no-ops when a newer action
 *    has replaced the current one (action-ID mismatch ignored by reduceOperation).
 *
 * Returns the serialized result string from the callback unchanged.
 */
export async function runWebMcpMutation(
  store: CivicFlowStore,
  descriptor: OperationDescriptor,
  callback: MutationCallback,
  signal: AbortSignal | undefined,
): Promise<string> {
  const { actionId } = descriptor;
  const now = new Date().toISOString();

  // Guard: already-aborted signal — publish failed and return without invoking callback
  if (signal?.aborted) {
    store.beginOperation(descriptor);
    store.advanceOperation(actionId);
    store.failOperation(actionId, { completedAt: now });
    // Return a minimal failure sentinel; the caller (handler) never reaches this
    // path in normal handler code — handlers pre-validate before calling us.
    // Per spec: "do not fabricate a success result"; a failure string is fine.
    throw new DOMException('Mutation aborted before start', 'AbortError');
  }

  // Publish start → applying
  store.beginOperation(descriptor);
  store.advanceOperation(actionId);

  await waitForPresentationBoundary();

  // Guard: aborted during presentation boundary wait
  if (signal?.aborted) {
    store.failOperation(actionId, { completedAt: new Date().toISOString() });
    throw new DOMException('Mutation aborted before start', 'AbortError');
  }
  let outcome: MutationOutcome;
  try {
    outcome = await callback();
  } catch (err) {
    // Callback threw — publish failure for this action if it is still current
    store.failOperation(actionId, { completedAt: new Date().toISOString() });
    const currentActivity = store.getState().ui.activity;
    if (!currentActivity.some((a) => a.id === actionId)) {
      store.appendActivity({
        id: actionId,
        summary: descriptor.label,
        source: descriptor.source,
        status: 'failed',
        section: descriptor.section,
        beforeRevision: descriptor.beforeRevision,
        afterRevision: descriptor.beforeRevision,
        occurredAt: new Date().toISOString(),
      });
    }
    throw err;
  }

  // Check abort after callback (handles abort during async work)
  if (signal?.aborted) {
    store.failOperation(actionId, { completedAt: new Date().toISOString() });
    throw new DOMException('Mutation aborted after callback', 'AbortError');
  }

  if (outcome.status === 'success') {
    store.completeOperation(actionId, {
      completedAt: new Date().toISOString(),
      afterRevision: outcome.stateRevision,
      affectedEntityIds: outcome.changedEntityIds,
    });
  } else {
    store.failOperation(actionId, {
      completedAt: new Date().toISOString(),
      recovery: outcome.recovery,
    });
    const currentActivity = store.getState().ui.activity;
    if (!currentActivity.some((a) => a.id === actionId)) {
      store.appendActivity({
        id: actionId,
        summary: descriptor.label,
        source: descriptor.source,
        status: 'failed',
        section: descriptor.section,
        beforeRevision: descriptor.beforeRevision,
        afterRevision: descriptor.beforeRevision,
        recovery: outcome.recovery,
        occurredAt: new Date().toISOString(),
      });
    }
  }

  return outcome.serialized;
}
