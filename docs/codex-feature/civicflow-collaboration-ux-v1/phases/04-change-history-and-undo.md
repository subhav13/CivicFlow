# Phase 4 — change history and human-only undo

## Status

`deferred` by explicit user decision. Undo is intentionally skipped for the
current hackathon path; no Phase 4 implementation or Gate D claim is made.

## Goal

Let the human reverse the newest eligible successful application mutation once, with exact revision fencing, validation, persistence, and an attributable timeline entry. Keep undo absent from WebMCP and prevent arbitrary history travel.

## Problem evidence

- Current activity proves that an action occurred but cannot restore the prior application.
- Agent-assisted data entry increases the need for a visible correction path.
- The command layer already uses immutable validated state and exact revisions, making bounded snapshot restoration feasible.
- A general multi-level history, persisted snapshot log, or agent undo would expand complexity and safety risk beyond the release need.

## Design

- Add memory-only `UndoEntry` capped at one active newest entry; retain a bounded timeline but not multiple restorable snapshots.
- `DispatchOptions` gains optional `undo: { label: string }`. No entry is created unless the caller explicitly opts in.
- Eligible calls include applicant/member/income/coverage/document/household/no-income changed mutations from human or WebMCP sources.
- Attestation, submission, reset, navigation, reads, failures, and no-ops are not eligible.
- The entry stores the validated pre-change application, action ID, label, after-revision, and time. It is never rendered or serialized.
- `undoLastChange(id)` checks newest ID, exact current revision, same application/schema identity, unsubmitted state, and valid snapshot.
- Restoration copies the old business fields, sets revision to current + 1, validates, persists, clears selection/highlights/recent effect, appends `undone` activity, and removes the undo entry.
- Any later changed mutation supersedes the previous entry. Reload loses undo by design. Save failure retains restored state in memory and reports persistence failure consistently with existing store behavior.
- Undo is a visible human button in the newest eligible timeline/toast. It is not registered as a Site Tool and not callable from Agent Companion capability controls.

## Likely files

### Production

- new `src/application/undo.ts`
- `src/application/store.ts`
- human section dispatch sites that require explicit undo labels
- `src/webmcp/tool-lifecycle.ts` or mutation handlers for explicit undo labels
- `src/ui/agent-companion/AgentCompanion.tsx` or new focused `ActivityTimeline.tsx`
- `src/ui/feedback/OperationStatus.tsx`
- `src/app/App.tsx`
- `src/styles.css`

### Tests

- new `src/application/undo.test.ts`
- `src/application/store.test.ts`
- affected human section tests
- `tests/integration/static-mutation-tools.test.ts`
- `tests/integration/dynamic-registry.test.ts`
- new `tests/integration/undo-ui.test.tsx`
- `tests/contract/tool-catalog.test.ts`
- new `tests/e2e/undo-latest-change.spec.ts`

No application schema, persistence format, result envelope, new tool, voice, server, or hosting change is allowed.

## Tasks and atomic packets

### Packet 4.1 — pure undo eligibility and restoration transition

- **Depends on:** UX Gate C and undo inclusion decision
- **RED:** unit tests require exact identity/revision/submission fences, revision +1 restoration, schema validation, and rejection of stale/mismatched snapshots
- **GREEN:** add pure eligibility/restoration functions returning a command-shaped success/failure result
- **Allowed production:** `src/application/undo.ts`
- **Allowed tests:** `src/application/undo.test.ts`
- **Focused command:** `npm run test:unit -- src/application/undo.test.ts`
- **Acceptance:** no I/O, DOM, WebMCP, UI, or arbitrary revision rollback; previous snapshot never escapes result data
- **Stop condition:** safe restoration requires changing persisted schema or bypassing command validation

### Packet 4.2 — store capture, supersession, persistence, reset

- **Depends on:** accepted Packet 4.1
- **RED:** store tests require explicit opt-in, newest-only supersession, failure/no-op exclusion, reload absence, reset/submission exclusion, undo persistence, save-failure notice, activity attribution, and ephemeral snapshot secrecy
- **GREEN:** extend store/dispatch options and `undoLastChange`; wire explicit labels for accepted human/WebMCP mutations
- **Allowed production:** `store.ts`, `undo.ts`, mutation dispatch call sites only
- **Allowed tests:** store, undo, focused section and mutation integration tests
- **Focused command:** `npm run test:unit -- src/application/undo.test.ts src/application/store.test.ts tests/integration/static-mutation-tools.test.ts`
- **Acceptance:** changed mutation produces one entry; a later change invalidates the previous; undo increments revision once and persists
- **Stop condition:** submission/reset can become reversible, full snapshot appears in activity/result, or automatic default capture is required

### Packet 4.3 — visible newest-change undo

- **Depends on:** accepted Packet 4.2
- **RED:** UI/E2E tests require Undo only on newest eligible success, human click, restored visible fields/progress, `undone` timeline row, disabled/absent stale control, keyboard focus, and no tool catalog entry
- **GREEN:** add a concise Undo affordance to operation result/timeline and wire `store.undoLastChange`
- **Allowed production:** activity/operation components, `App.tsx`, focused CSS
- **Allowed tests:** undo UI integration, E2E, companion tests, catalog no-submit/no-undo assertion
- **Focused commands:** `npm run test:unit -- tests/integration/undo-ui.test.tsx src/ui/agent-companion/AgentCompanion.test.tsx`; `npm run test:e2e -- tests/e2e/undo-latest-change.spec.ts`
- **Acceptance:** no confirmation is hidden, the control is human-visible/clickable only, focus lands on restored section or result, and Site Tools list remains exact ten
- **Stop condition:** undo requires an agent call, an invisible control, or restoration after another mutation

## Phase verification

```bash
npm run test:unit -- src/application/undo.test.ts src/application/store.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/dynamic-registry.test.ts tests/integration/undo-ui.test.tsx src/ui/agent-companion/AgentCompanion.test.tsx
npm run test:contract -- tests/contract/tool-catalog.test.ts tests/contract/adversarial-security.test.ts
npm run test:e2e -- tests/e2e/undo-latest-change.spec.ts tests/e2e/collaboration-feedback.spec.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
npm run verify
git diff --check
git status --short
```

Independent review attempts stale revision, post-submit, reset, no-op, failure, reload, and two-success sequences. It scans catalog/handlers for any undo capability and inspects activity/results for snapshot leakage.

## Acceptance criteria

- Only the newest explicitly eligible mutation is reversible.
- Undo is human-only and absent from WebMCP.
- Restoration validates, increments revision once, persists, and updates visible progress/records.
- Later mutations, reload, reset, and submission invalidate undo safely.
- Timeline records success and undo without storing/rendering the application snapshot.
- Existing no-submit, tool, persistence, and aggregate gates remain green.

## Non-goals

No redo, arbitrary/multi-level history, persisted undo stack, WebMCP undo, submission/reset reversal, collaborative conflict resolution, remote persistence, voice, or deployment.

## Review risks

- Generic snapshots can leak data. Keep the snapshot memory-only and exclude it from dev-visible result/activity serialization.
- Revision rollback would break tool fencing. Restoration always advances revision.
- Automatic undo capture could include submission. Require explicit opt-in plus command/entity exclusions.
- A stale button can corrupt newer state. Enforce both entry ID and exact after-revision.
