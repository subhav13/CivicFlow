# CivicFlow collaboration UX — Phase 1–6 code review

## Status

`validated` for the selected local hackathon cut. M1 and M2 close the five
judge-facing findings and Gates A, B, C, and E are independently reaccepted.
Local Gate F remains accepted. Phase 4 remains intentionally deferred, Packet
6.4 remains separately authorized, and CR-01/CR-07 remain documented
non-blocking limitations.

## Review scope and baseline

- **Date/timezone:** 2026-08-28, Asia/Kolkata (IST)
- **Repository:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`
- **Branch and HEAD:** `main`, `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Scope:** the complete dirty Phase 1–6 collaboration overlay, its tests, the
  companion ledger, and the affected parent-ledger integration boundary
- **Preservation boundary:** only the allowlisted M1/M2 source and test changes
  were permitted; no reset, clean, branch change, commit, push, deploy, Site
  save, live Site Tool call, or hosted mutation occurred
- **MODEL:** `gpt-5.6-sol` (current Codex task route)
- **REASONING:** `max`
- **ROUTING RATIONALE:** the review crosses shared store, lifecycle, WebMCP,
  persistence, UI-attribution, and document-result contracts, so it requires one
  high-rigor owner to reconcile behavior against all accepted phase ledgers.
- **ESCALATION CONDITION:** any normal-journey truthfulness violation admitted by
  the MSW contract reopens its owning gate; five violations were admitted.
- **Routing limitation:** the skill-referenced
  `.agents/workflows/codex-model-selecting.md` is absent in this repository. No
  replacement policy was invented.

## Verification evidence

The repository's aggregate gate remains green after remediation:

- `npm run verify`: PASS
- formatting, lint, secret scan, and typecheck: PASS
- unit: 33 files, 270 tests PASS
- contract: 10 files, 90 tests PASS
- production build: PASS
- Playwright: 32 tests PASS
- `git diff --check`: PASS before this ledger update

The independent temporary review suite at
`/private/tmp/civicflow-phase-review.test.ts` intentionally asserted the ledger
contracts missing from the checked-in suite. Result: 1 file, 7 tests, 7 expected
failures before remediation. After M1/M2 it passes 5 of 7 assertions; the two
remaining failures are the explicitly excluded CR-01 and CR-07 limitations. The
temporary probe is not a repository deliverable.

## MSW hackathon contract

The requested outcome is a coherent hackathon demo whose normal human and Site
Tool journey gives judges truthful, correlated feedback. The smallest proof is:

- a WebMCP mutation has one visible action identity from result to activity and
  affected-card feedback;
- a recoverable mutation failure appears once in the visible activity history;
- create and update actions use truthful effect labels;
- untouched seed and corrupt-storage recovery copy do not claim a save or
  restore that did not occur; and
- the focused regression tests and existing aggregate suite pass.

The MSW deletion test admits CR-02, CR-03, CR-04, CR-05, and CR-06. Removing any
one leaves a false or missing state visible on the normal judge path. CR-01 is
rejected for this cut because post-commit cancellation is not part of the
synchronous local demo journey. CR-07 is rejected for this cut because the
normal demo does not approach the valid 20-document maximum. Both remain
documented evidence, not implementation work or release blockers.

## Findings

### CR-01 — abort can report failure after committing the mutation

- **Severity:** P1
- **Owner:** Phase 1 Packet 1.3
- **Evidence:** `runWebMcpMutation` checks `signal.aborted` after awaiting the
  callback, but the real callbacks synchronously dispatch and persist before
  their promise resolves. A store subscriber that aborts when revision changes
  causes `add_household_member` to reject with `AbortError` while revision moves
  from 0 to 1 and the member remains added.
- **Impact:** the caller and UI see failure although application state changed;
  an agent may retry an already-applied action.
- **Closure gate:** cancellation may reject only before commit. Once a callback
  returns a committed outcome, lifecycle/result state must truthfully report it;
  add a real-handler regression test for abort during the commit notification.

### CR-02 — WebMCP recent-effect action ID differs from the tool result

- **Severity:** P1
- **Owner:** Phase 1 Packets 1.2–1.3 / Phase 2 attribution consumer
- **Evidence:** handlers generate an `act-*` ID for the result and lifecycle, but
  `store.dispatch` independently generates the command receipt ID. The review
  probe observed result `act-*` versus recent effect `id-1`.
- **Impact:** operation status, serialized result, activity, and affected-card
  markers cannot be correlated to one action as required by the master contract.
- **Closure gate:** one action ID must own the command receipt, lifecycle,
  activity, recent effect, visible DOM markers, and serialized result for every
  WebMCP mutation.

### CR-03 — pre-dispatch recoverable failures are absent from activity history

- **Severity:** P1
- **Owner:** Phase 1 lifecycle/activity seam and Phase 3 Packet 3.3
- **Evidence:** Emma-before-income returns a structured `PERSON_NOT_FOUND`
  failure and publishes a failed active operation, but `ui.activity` remains
  empty because no command dispatch occurs and the wrapper never appends a
  failure entry.
- **Impact:** the Agent Companion timeline omits the latest recoverable agent
  failure and cannot show its failed status/recovery context.
- **Closure gate:** every terminal mutation failure produces exactly one bounded,
  revision-stable activity entry with the same action ID and recovery descriptor;
  command-dispatch failures must not be duplicated.

### CR-04 — update effects are labeled as created

- **Severity:** P2
- **Owner:** Phase 1 Packet 1.2 / Phase 2 Packet 2.2
- **Evidence:** the store sets `kind = 'created'` whenever any changed entity is
  present. Updating Emma's age therefore publishes `created` rather than
  `updated`.
- **Impact:** affected-card semantics and DOM evidence misdescribe what happened.
- **Closure gate:** effect kind comes from explicit command/dispatch metadata or a
  deterministic before/after comparison; add create and update assertions for
  both human and WebMCP paths.

### CR-05 — untouched seed is labeled as already saved

- **Severity:** P2
- **Owner:** Phase 5 Packet 5.2
- **Evidence:** with available empty storage and zero `setItem` calls, the initial
  persistence message is `Saved in this browser`.
- **Impact:** the UI makes a persistence claim before any real write.
- **Closure gate:** untouched seed wording must not claim a save; only a successful
  `setItem` may produce saved/current-session wording.

### CR-06 — corrupt stored data is labeled as restored

- **Severity:** P1
- **Owner:** Phase 5 Packet 5.2
- **Evidence:** invalid JSON or schema-invalid storage falls back to the synthetic
  seed with notice `recovered`, which the store renders as
  `Restored from this browser`.
- **Impact:** a user can believe prior browser data was restored when it was
  discarded and replaced by the seed.
- **Closure gate:** distinguish valid load from invalid-data recovery and storage
  unavailability. Recovery wording must explicitly say the demo reset to its
  synthetic seed and must not claim restoration.

### CR-07 — document result compaction drops attachments before optional detail

- **Severity:** P1
- **Owner:** Phase 6 Packet 6.2
- **Evidence:** generic array compaction processes `documents` before
  `requirements`. For a valid 20-document state with bounded names, the review
  probe returned only 3 document entries while retaining optional requirements
  and still reported `count: 20`.
- **Impact:** the read-only Site Tool can return an internally inconsistent and
  incomplete attachment list without explicit truncation metadata.
- **Closure gate:** compact optional requirement reasons/detail first. If the
  bounded payload still cannot contain every attachment, preserve truthful total
  counts and add explicit truncation metadata; never silently imply the returned
  list is complete.

## Remediation implementation plan

### Required route record

- **MODEL:** `google-antigravity/gemini-3.7-flash` through OMP
- **REASONING:** `high`
- **ROUTING RATIONALE:** the work is a bounded two-packet TDD correction over
  existing store, WebMCP lifecycle, and persistence seams; it does not require a
  new architecture or a broader paid route.
- **ESCALATION CONDITION:** stop if closing an admitted finding requires a
  persisted schema/key change, a tool name/schema change, a new dependency,
  document-compaction work, abort-semantics work, or any commit/push/deploy/live
  action.

### Packet M1 — correlated feedback and truthful activity

- **Closes:** CR-02, CR-03, CR-04.
- **RED first:** extend
  `tests/integration/tool-operation-lifecycle.test.ts` so a successful add uses
  the result action ID in lifecycle, activity, receipt/effect correlation, and
  the affected-card marker; a pre-dispatch `PERSON_NOT_FOUND` failure appends
  exactly one failed activity entry with unchanged revision and recovery data;
  and an update publishes `kind: 'updated'` while an add remains `created`.
- **Allowed production:** `src/application/store.ts`,
  `src/webmcp/tool-lifecycle.ts`, and only the mutation dispatch wiring in
  `src/webmcp/tool-handlers.ts` that is necessary to pass the RED assertions.
- **Allowed tests:** the lifecycle integration test above,
  `src/application/store.test.ts`,
  `tests/integration/capability-activity-ui.test.tsx`, and
  `tests/e2e/collaboration-feedback.spec.ts` only when a focused assertion is
  necessary to prove visible correlation.
- **GREEN boundary:** carry one explicit WebMCP action ID into the command
  context/receipt and recent effect; record a wrapper-level failure only when
  dispatch did not already record that action; derive or declare created versus
  updated from actual operation semantics, not `changedEntities.length`.
- **Focused gate:**
  `npm run test:unit -- src/application/store.test.ts tests/integration/tool-operation-lifecycle.test.ts tests/integration/capability-activity-ui.test.tsx`.
- **Acceptance:** no duplicate activity; failed revision remains unchanged;
  serialized result, lifecycle, activity, and recent effect share one action ID;
  add/update labels are truthful; original ten-tool/no-submit contracts remain
  unchanged.

### Packet M2 — truthful browser-save copy

- **Closes:** CR-05 and CR-06.
- **RED first:** add store/view-model/component assertions for empty available
  storage with zero writes and for invalid JSON/schema fallback.
- **Allowed production:** `src/application/store.ts`,
  `src/ui/progress/progress-view-model.ts`, and
  `src/ui/persistence/PersistenceStatus.tsx`. Change
  `src/application/persistence.ts` only if the existing `recovered` notice cannot
  distinguish the required display states without ambiguity.
- **Allowed tests:** the directly corresponding `.test.ts`/`.test.tsx` files.
- **GREEN copy contract:** untouched seed says
  `Demo data ready · Changes save in this browser`; corrupt-data fallback says
  `Started fresh after a browser save issue`; valid load, successful
  current-session save, and unavailable/failed storage keep their existing
  truthful meanings.
- **Focused gate:**
  `npm run test:unit -- src/application/store.test.ts src/ui/progress/progress-view-model.test.ts src/ui/persistence/PersistenceStatus.test.tsx`.
- **Acceptance:** no saved claim before `setItem`; no restored claim after
  corrupt data is discarded; no persisted application schema or key change.

### Final verification and stop point

After M1 and M2 pass independently, run `npm run verify`, `git diff --check`,
and inspect exact status/diff attribution. A separate Codex review must confirm
the five focused regressions and no tool/schema/no-submit drift. Then restore UX
Gates A, B, C, and E to `validated` and halt. Do not implement CR-01, CR-07,
Phase 4 undo, voice, release packaging, or Packet 6.4 in this task.

## Remediation evidence and independent acceptance

- **OMP route:** `google-antigravity/gemini-3.7-flash`, CLI selector
  `gemini-3.7-flash-high`, high reasoning. The first attempt returned `401 Invalid
API key`; one same-route retry completed successfully with no model or paid
  fallback.
- **Run evidence:**
  `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-124356-74443`.
- **Allowed source changes:** `src/application/store.ts`,
  `src/webmcp/tool-lifecycle.ts`, `src/ui/progress/progress-view-model.ts`, and
  `src/ui/persistence/PersistenceStatus.tsx`.
- **Allowed test changes:** the M1/M2 focused store, lifecycle, UI, and shell
  tests named in the implementation task. No ledger file was changed by the
  worker.
- **Independent focused gate:** 6 files, 70 tests PASS.
- **Independent aggregate gate:** `npm run verify` PASS — format, lint, secret
  scan, typecheck, 33 unit files/270 tests, 10 contract files/90 tests, build,
  and 32 Playwright tests.
- **Independent review probe:** 5 admitted assertions PASS; CR-01 and CR-07
  remain the only two failing, intentionally excluded assertions.
- **Git evidence:** `git diff --check` PASS; branch `main` and HEAD
  `801a165ff8f115d6a4801b1f33d087508104ec04` unchanged; no commit, push, deploy,
  live call, or hosted mutation.

## Review decision

The selected local hackathon cut is accepted after M1/M2 and independent
reverification. The five MSW-admitted visible truthfulness issues are closed;
CR-01 and CR-07 remain known, non-blocking limitations for this scope. Live
Packet 6.4 and any commit/push/deploy remain separately authorized.
