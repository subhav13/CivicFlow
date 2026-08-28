# Phase 1 — feedback foundation

## Status

`validated` after M1 remediation and independent reverification. Packets 1.1–1.3
remain implemented; CR-02 through CR-04 are closed. CR-01 remains a documented
non-blocking post-commit-abort limitation for this hackathon cut.

## Goal

Create a deterministic ephemeral operation lifecycle, extend the store with narrowly scoped coordinator methods, and wrap WebMCP mutation execution so later UI can display real work without changing application command semantics or persisted state.

## Problem evidence

- `UiState` currently contains section, selection, review highlights, capabilities, activity, and voice, but no active operation, recent effect, or undo stack.
- `ActivityEntry` contains only `id`, `summary`, optional source, and optional time.
- `store.dispatch` returns a synchronous receipt and appends only successful configured activity. Failed WebMCP validation/command paths are not visible in the shared activity UI.
- Every WebMCP handler repeats action ID, validation, dispatch, result, selection/navigation, and activity concerns. A UI layer cannot reliably infer lifecycle from final receipts.
- Persisted `ApplicationState` and revision behavior are already accepted and must remain untouched.

## Design

- Add a pure operation-feedback module with accepted transitions and no browser/React/storage dependencies.
- Extend `UiState` with `activeOperation` and `recentEffect`; extend activity to the v2 contract in the master ledger.
- Add explicit store methods: `beginOperation`, `advanceOperation`, `completeOperation`, `failOperation`, `clearCompletedOperation`, and `setRecentEffect`.
- A stale completion/failure whose action ID is not current is ignored.
- Human dispatch accepts an optional operation descriptor but remains synchronous and returns the unchanged command receipt contract.
- A WebMCP lifecycle wrapper owns start/finish/failure publication around existing handlers. It does not own validation, command semantics, selection, navigation, or serialization.
- Navigation and read-only tools append final activity where already appropriate but do not enter a fake applying state.
- No timer belongs in the store or reducer. UI owns bounded visual dismissal.

## Likely files

### Production

- new `src/application/operation-feedback.ts`
- `src/application/store.ts`
- new `src/webmcp/tool-lifecycle.ts`
- `src/webmcp/tool-handlers.ts`
- `src/webmcp/index.ts` only if a new public type export is required

### Tests

- new `src/application/operation-feedback.test.ts`
- `src/application/store.test.ts`
- new `tests/integration/tool-operation-lifecycle.test.ts`
- existing integration tests only when an accepted contract assertion must be adapted

No domain schema, persistence schema, catalog, result envelope, component, CSS, voice, server, or hosting file is allowed in this phase.

## Tasks and atomic packets

### Packet 1.1 — pure lifecycle reducer

- **Depends on:** approved ledger and clean/attributed baseline
- **RED:** tests import the new module and require valid start/apply/succeed/fail transitions, stale action rejection, immutable output, and terminal metadata
- **GREEN:** add exact types, constructors, and pure reducer; reject or ignore invalid transitions deterministically
- **Allowed production:** `src/application/operation-feedback.ts`
- **Allowed tests:** `src/application/operation-feedback.test.ts`
- **Focused command:** `npm run test:unit -- src/application/operation-feedback.test.ts`
- **Acceptance:** no React/browser/storage/application snapshot dependency; action/source/section/revision metadata matches the master contract
- **Stop condition:** any required lifecycle state would need persistence or a change to `ApplicationState`

### Packet 1.2 — store coordinator and activity v2

- **Depends on:** accepted Packet 1.1
- **RED:** store tests require begin/advance/finish/fail behavior, newest-20 activity, stale completion protection, reset clearing, no application revision change for UI events, and successful human dispatch effect metadata
- **GREEN:** extend `UiState`, `CivicFlowStore`, `DispatchOptions`, and store methods using the pure reducer; preserve current dispatch receipts and persistence behavior
- **Allowed production:** `src/application/store.ts`, `src/application/operation-feedback.ts` only for review-approved corrections
- **Allowed tests:** `src/application/store.test.ts`, `src/application/operation-feedback.test.ts`
- **Focused command:** `npm run test:unit -- src/application/store.test.ts src/application/operation-feedback.test.ts`
- **Acceptance:** UI-only lifecycle never persists or increments revision; successful changed commands record exact before/after revision; failures/no-ops do not create a recent changed effect
- **Stop condition:** submitted/reset behavior or existing activity truthfulness regresses

## Packet 1.1 evidence

- **Attempt date and timezone:** 2026-08-27, Asia/Kolkata
- **Exact baseline branch and HEAD:** `main`, `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Baseline status and user-owned changes:** the three parent-ledger files were modified and the companion ledger was untracked before dispatch; no code paths were dirty. Those documentation changes were preserved exactly.
- **MODEL:** `google-antigravity/claude-sonnet-4-6`
- **REASONING:** `high`
- **ROUTING RATIONALE:** Packet 1.1 introduces a shared ephemeral lifecycle contract, so deterministic TDD and immutable transition review are the observable risk boundary.
- **ESCALATION CONDITION:** stop on allowlist overlap, unrelated baseline failures, model unavailability, or confirmed exhaustion of all three Antigravity credentials; no exhaustion or Gemini fallback signal occurred.
- **Packet and allowed files:** Packet 1.1 — pure lifecycle reducer; only new `src/application/operation-feedback.ts` and `src/application/operation-feedback.test.ts` were allowed.
- **Actual changed files:** exactly those two new files; no store, UI, WebMCP, configuration, dependency, or ledger files were changed by the worker.
- **RED command, expected failure, and observed failure:** `npm run test:unit -- src/application/operation-feedback.test.ts`; failed before implementation because `./operation-feedback` could not be resolved.
- **GREEN implementation summary:** added a dependency-free `reduceOperation` with deterministic `start`, `advance`, `succeed`, `fail`, and `clear` transitions, action-ID stale fencing, terminal metadata, and defensive copies.
- **Focused command results:** focused reducer suite passed with 1 file and 32 tests; independent full unit suite passed with 22 files and 157 tests.
- **Typecheck result:** `npm run typecheck` passed.
- **Aggregate gate result:** `npm run lint`, `npm run format:check`, `npm run scan:secrets`, and `git diff --check` passed.
- **Diff/status review:** HEAD and branch remained unchanged; the actual code diff contains only the two allowlisted files; no application revision, persistence, DOM, clock, timer, or browser behavior is present.
- **Independent reviewer and findings:** coordinating Codex review accepted the packet with no blocking findings. The pure seam intentionally keeps section/tool fields string-valued; later canonical consumers must narrow or validate them at their own boundaries if they expose `SectionId`/`CivicFlowToolName` contracts.
- **Status decision:** Packet 1.1 `validated`; Phase 1 remains `in-progress` until Packets 1.2 and 1.3 pass Gate A.
- **Risks, assumptions, and unresolved decisions:** OMP was invoked directly with the exact requested Sonnet selector because the installed wrapper's normal selector is fixed to Gemini; OMP exposed no account identifiers or quota exhaustion, and no fallback was needed. No remote action occurred.

## Packet 1.2 evidence

- **Attempt date and timezone:** 2026-08-27, Asia/Kolkata
- **Exact baseline branch and HEAD:** `main`, `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Baseline status and user-owned changes:** the parent-ledger edits, companion ledger, and accepted Packet 1.1 files were dirty before the first Packet 1.2 dispatch; no store files were dirty. Two bounded review fixers subsequently touched only the Packet 1.2 allowlist.
- **MODEL:** `google-antigravity/claude-sonnet-4-6`
- **REASONING:** `high`
- **ROUTING RATIONALE:** Packet 1.2 changes the shared Zustand store contract, so preserving command receipts, revision/persistence behavior, and ephemeral lifecycle state is the observable risk boundary.
- **ESCALATION CONDITION:** stop on allowlist overlap, unrelated baseline failures, reducer incompatibility, model unavailability, or confirmed exhaustion of all three Antigravity credentials; no exhaustion or Gemini fallback signal occurred across the implementation and two bounded fixers.
- **Packet and allowed files:** Packet 1.2 — store coordinator and activity v2; `src/application/store.ts` and `src/application/store.test.ts`, with `operation-feedback.ts` permitted only for a review-approved seam (not used).
- **Actual changed files:** exactly `src/application/store.ts` and `src/application/store.test.ts` relative to the Packet 1.1 checkpoint; no UI, WebMCP, domain, persistence, CSS, configuration, dependency, or ledger file was changed by the workers.
- **RED command, expected failure, and observed failure:** initial focused RED (`npm run test:unit -- src/application/store.test.ts src/application/operation-feedback.test.ts`) reported 10 failed and 43 passed because store methods/fields and v2 normalization were absent. The first fixer RED reported 2 failed and 53 passed for the unconsumed operation descriptor and recovery-array alias. The publication fixer RED reported 1 failed and 55 passed because `applying` was not observable inside the transition.
- **GREEN implementation summary:** added ephemeral `activeOperation`/`recentEffect`, six reducer-backed store coordinator methods, v2 activity normalization with defensive copies and newest-20 retention, revision-linked changed effects, optional dispatch lifecycle publication, and reset/stale-operation fences while retaining minimal activity callers.
- **Focused command results:** final focused suite passed with 2 files and 56 tests.
- **Typecheck result:** `npm run typecheck` passed.
- **Aggregate gate result:** independent full `npm run test:unit` passed with 22 files and 172 tests; `npm run lint`, `npm run format:check`, `npm run scan:secrets`, and `git diff --check` passed.
- **Diff/status review:** HEAD and branch remained unchanged; only the two allowlisted store files were modified beyond Packet 1.1; no application revision or persistence writes occur for coordinator/effect UI methods, and operation state is not persisted.
- **Independent reviewer and findings:** coordinating Codex inspected the actual diff, required two bounded Sonnet fixes for unused operation publication and pre-dispatch visibility, and found no remaining blocking issue. The current `created`/`updated` recent-effect classification is intentionally deterministic but heuristic.
- **Status decision:** Packet 1.2 `validated`; Phase 1 remains `in-progress` until Packet 1.3 passes Gate A.
- **Risks, assumptions, and unresolved decisions:** `ActivityEntry` keeps v2 fields optional at the type boundary so existing UI fixtures remain source-compatible; stored entries are normalized at runtime. The effect-kind heuristic can be made semantically precise when command metadata is expanded. OMP exposed no account identifiers or quota exhaustion, and no Gemini fallback was needed. No remote action occurred.

### Packet 1.3 — WebMCP lifecycle wrapper

- **Depends on:** accepted Packet 1.2
- **RED:** integration tests require real handler start/success/failure events with the same action ID/revision as the final JSON; read/navigation tools must not claim mutation work; abort/stale completion leaves no false success
- **GREEN:** introduce one wrapper and migrate existing mutation handlers without changing schemas, commands, selection behavior, compact results, or tool count
- **Allowed production:** `src/webmcp/tool-lifecycle.ts`, `src/webmcp/tool-handlers.ts`, `src/webmcp/index.ts` if required
- **Allowed tests:** `tests/integration/tool-operation-lifecycle.test.ts`, narrowly affected current integration tests
- **Focused commands:** `npm run test:unit -- tests/integration/tool-operation-lifecycle.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/static-read-navigation-tools.test.ts`
- **Acceptance:** all existing handler results are byte-compatible except activity/UI side effects; failure state is visible but application revision remains unchanged
- **Stop condition:** wrapper requires catalog/result changes, duplicate command logic, artificial delay, or DOM access

## Packet 1.3 evidence

- **Attempt date and timezone:** 2026-08-28, Asia/Kolkata
- **Exact baseline branch and HEAD:** `main`, `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Baseline status and user-owned changes:** the parent-ledger edits, companion ledger, and accepted Packet 1.1/1.2 application files were dirty before Packet 1.3. The first Sonnet run left a partial, allowlisted wrapper/test/handler state before authentication failed; that state was preserved and handed off unchanged to Gemini. No unrelated path was overwritten.
- **MODEL:** `google-antigravity/gemini-3.7-flash`
- **REASONING:** `high`
- **ROUTING RATIONALE:** the explicitly requested Sonnet route failed twice with `401 Invalid API key`; the user authorized the normal Antigravity Gemini 3.7 Flash High fallback, so the exact partial state and test evidence were handed off.
- **ESCALATION CONDITION:** stop on an unallowlisted overlap, unrelated baseline failure, catalog/result/command/persistence/DOM/timer expansion, or another model/auth failure; no new escalation condition occurred during the Gemini run.
- **Packet and allowed files:** Packet 1.3 — WebMCP lifecycle wrapper; `src/webmcp/tool-lifecycle.ts`, `src/webmcp/tool-handlers.ts`, and `tests/integration/tool-operation-lifecycle.test.ts`; `src/webmcp/index.ts` was permitted only if required and remained unchanged.
- **Actual changed files:** relative to the accepted Packet 1.2 checkpoint, exactly `src/webmcp/tool-lifecycle.ts` (new), `src/webmcp/tool-handlers.ts`, and `tests/integration/tool-operation-lifecycle.test.ts`. No catalog, result helper, command, domain, persistence, UI, CSS, configuration, dependency, voice, hosting, or ledger file was changed by the implementation worker.
- **RED command, expected failure, and observed failure:** `npm run test:unit -- tests/integration/tool-operation-lifecycle.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/static-read-navigation-tools.test.ts` at the Gemini handoff reported 2 files passing and the new file at 29 passed/1 failed. The failure was the new test's incorrect `parsedFail.code` lookup; the established envelope is `parsedFail.error.code`. The initial Sonnet process had already created a partial wrapper before its `401` failure, so a separate clean absent-wrapper RED count was not emitted; this limitation is recorded rather than inferred away.
- **GREEN implementation summary:** one DOM-free `runWebMcpMutation` wrapper now publishes begin/advance/complete/fail around callbacks and preserves serialized results. All five command-backed mutation handlers return terminal outcomes through that wrapper, including validation/person/selection/command failures, no-ops, changed entity IDs, and signal propagation. The four read/navigation handlers remain outside the mutation lifecycle. The lifecycle integration suite now covers action-ID/revision parity, failure/no-revision behavior, validation failure, read/navigation/review exclusion, stale fencing, abort safety, and the unchanged nine-tool catalog.
- **Focused command results:** independent `npm run test:unit -- tests/integration/tool-operation-lifecycle.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/static-read-navigation-tools.test.ts` passed 3 files and 31 tests; the required Phase 1 selection passed 5 files and 87 tests.
- **Typecheck result:** independent `npm run typecheck` passed.
- **Aggregate gate result:** independent `npm run test:unit` passed 23 files and 180 tests; `npm run lint`, `npm run format:check`, `npm run scan:secrets`, and `git diff --check` passed.
- **Diff/status review:** branch and HEAD remained `main`/`801a165ff8f115d6a4801b1f33d087508104ec04`; only the three Packet 1.3 paths changed beyond the already-attributed Packet 1.1/1.2 and ledger paths. The wrapper does not touch DOM, timers, persistence, application snapshots, catalog entries, result envelopes, or tool count. No commit, push, merge, deploy, live call, or secret action occurred.
- **Independent reviewer and findings:** coordinating Codex inspected the actual handler/wrapper/test diff and reran every focused, aggregate, type, lint, format, secret, and diff gate. No blocking finding remains. The wrapper intentionally rejects an already-aborted operation with `AbortError`; future UI cancellation wording remains a later-phase concern.
- **Status decision:** Packet 1.3 `validated`; Phase 1 `validated`; UX Gate A is accepted and Phase 2 is now eligible. The original nine WebMCP tools remain unchanged.
- **Risks, assumptions, and unresolved decisions:** the Sonnet route remains unavailable locally because OMP reports no configured credentials; the user-authorized Gemini fallback supplied the completion. The recorded RED was a partial-handoff test defect rather than a pristine baseline absence failure. No release cut, commit, push, deploy, live Site Tools evidence, or voice decision is implied by this validation.

## Phase verification

```bash
npm run test:unit -- src/application/operation-feedback.test.ts src/application/store.test.ts tests/integration/tool-operation-lifecycle.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/static-read-navigation-tools.test.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
git diff --check
git status --short
```

An independent reviewer inspects the actual diff for persisted-state leakage, revision changes, duplicated tool semantics, activity accuracy, and unallowed files. Gate A passes only after review acceptance.

## 2026-08-28 remediation closure

Packet M1 closed CR-02, CR-03, and CR-04. The focused lifecycle/store tests and
the aggregate verification pass; Gate A is reaccepted. CR-01 remains excluded
from this hackathon cut as documented in the cross-phase review.

## Acceptance criteria

- Operation lifecycle has one deterministic pure source of truth.
- Store exposes explicit coordinator methods and retains backward-compatible command receipts.
- Human and WebMCP changed mutations produce revision-linked ephemeral activity/effects.
- Failures are observable without application mutation.
- Navigation/read queries do not display mutation work.
- Reset clears all new ephemeral state.
- Existing application, WebMCP, persistence, no-submit, and tool-count tests remain green.

## Non-goals

No UI, progress redesign, CSS, motion, recovery descriptors, tenth tool, undo, documents, onboarding, voice, commit, push, deploy, live call, or secret access.

## Review risks

- Adding lifecycle directly inside every handler would create drift; require the shared wrapper.
- Store methods could accidentally retain stale operations; assert action-ID fencing.
- Activity v2 could expose entire input objects; permit compact changed-entity summaries only.
- React batching may make a fast operation visually brief, but this phase must not solve that with delays.

## 2026-08-28 review reopening (pre-remediation history)

The independent review reproduced post-commit abort reported as failure
(CR-01), WebMCP result/recent-effect action-ID divergence (CR-02), missing
pre-dispatch failure activity (CR-03), and update effects classified as created
(CR-04). The existing suite remains green, but these behaviors contradict this
phase's lifecycle, attribution, failure-observability, and effect contracts.
For the hackathon MSW contract, CR-01 is recorded as a non-blocking edge
limitation; CR-02 through CR-04 remain blocking because they are visible on the
normal judge path. Historical packet evidence is retained; before M1, the Gate A
decision was superseded pending the focused regressions in the
[cross-phase review](../reviews/2026-08-28-phase-1-6-code-review.md) pass.
