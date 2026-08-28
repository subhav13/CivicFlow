# Phase 3 — guidance and recovery

## Status

`validated` after M1 remediation and independent reverification. Guidance and
serialized recovery remain implemented, and CR-03 is closed: pre-dispatch
recoverable failures now reach shared activity history exactly once.

## Goal

Make CivicFlow dependency-aware and actionable without adding eligibility logic: derive the next safe application actions, add one read-only Site Tool for those actions, enrich recoverable tool failures, and present direct recovery guidance in the shared UI.

## Problem evidence

- `get_application_progress` returns completion and review issues but not a prioritized, human-readable next action.
- The current exact-nine catalog has no dedicated guidance capability.
- `ToolFailure` supports code/message/recoverable/fieldErrors but no structured section, suggested tool, or required fields.
- The live request to add Emma's income failed safely with `PERSON_NOT_FOUND`; the user had to infer that Emma needed to be added first and then supply age, relationship, and coverage intent.
- `CONTEXT_STALE`, coverage provider validation, missing documents, attestation, and application lock are similarly recoverable but not uniformly expressed.
- Recovery must not mutate automatically or claim eligibility.

## Design

- Add a pure `getNextActions(application)` selector that composes accepted progress/review/person/document rules and returns at most three deterministic actions.
- Add a pure recovery map from known tool/command failure context to a bounded `RecoveryDescriptor`.
- Extend `ToolFailure.error` with optional recovery while preserving all required envelope fields and 1,500-character cap.
- Add static read-only `get_next_actions`; update accepted catalog count from nine to ten only in this phase.
- Preserve all nine existing names, schemas, annotations, contextual behavior, handlers, and no-submit scans.
- WebMCP mutation failure publishes the same recovery to the final result and shared operation/activity state.
- UI recovery banner presents the message, section, and optional navigation/focus action. It never invokes a mutation or another Site Tool.
- Enrich `get_application_progress` only if compact reusable action summary is needed; do not duplicate full `get_next_actions` output.

## Likely files

### Production

- new `src/domain/guidance.ts`
- new `src/webmcp/recovery.ts`
- `src/webmcp/tool-results.ts`
- `src/webmcp/tool-catalog.ts`
- `src/webmcp/tool-handlers.ts`
- `src/webmcp/registry-manager.ts` only if the accepted static catalog derives from a hardcoded count
- `src/webmcp/index.ts`
- `src/application/store.ts` only for recovery publication seam already designed in Phase 1
- new `src/ui/feedback/RecoveryBanner.tsx`
- `src/app/App.tsx`

### Tests

- new `src/domain/guidance.test.ts`
- new `src/webmcp/recovery.test.ts`
- `tests/contract/tool-catalog.test.ts`
- `tests/integration/static-read-navigation-tools.test.ts`
- `tests/integration/static-mutation-tools.test.ts`
- `tests/integration/dynamic-registry.test.ts`
- `tests/integration/tool-operation-lifecycle.test.ts`
- new `tests/integration/guidance-recovery-ui.test.tsx`
- `tests/contract/adversarial-security.test.ts`
- `tests/e2e/webmcp-integration.spec.ts`

No application schema, persistence schema, undo, document bytes, OCR, onboarding, voice, server, or hosting change is allowed.

## Tasks and atomic packets

### Packet 3.1 — pure next-action and recovery selectors

- **Depends on:** UX Gate B
- **RED:** fixtures require exact seed/partial/complete/submitted next actions, blocker priority, canonical section order, maximum three, no eligibility language, and exact known failure recovery mappings
- **GREEN:** add pure domain guidance and WebMCP recovery modules; reuse accepted selectors and constants
- **Allowed production:** `src/domain/guidance.ts`, `src/webmcp/recovery.ts`, export seams only when required
- **Allowed tests:** new guidance and recovery unit tests
- **Focused command:** `npm run test:unit -- src/domain/guidance.test.ts src/webmcp/recovery.test.ts`
- **Acceptance:** deterministic, clock-free, network-free, compact descriptors; unknown failure receives no invented recovery
- **Stop condition:** selector needs an eligibility rule, real-world policy, or UI/WebMCP dependency

### Packet 3.2 — result envelope and exact-ten catalog

- **Depends on:** accepted Packet 3.1
- **RED:** contract tests intentionally fail exact-nine, require original-nine preservation plus `get_next_actions`, strict empty input, read-only annotation, no submit terms, recovery schema, and compact serialization
- **GREEN:** add one tool union/catalog/schema/validator/handler; extend failure result compatibly and update static partition from six to seven
- **Allowed production:** `tool-results.ts`, `tool-catalog.ts`, `tool-handlers.ts`, `registry-manager.ts` only if required, `webmcp/index.ts`
- **Allowed tests:** tool catalog, static read/navigation, dynamic registry, adversarial security, recovery unit test
- **Focused commands:** `npm run test:contract -- tests/contract/tool-catalog.test.ts tests/contract/adversarial-security.test.ts`; `npm run test:unit -- tests/integration/static-read-navigation-tools.test.ts tests/integration/dynamic-registry.test.ts`
- **Acceptance:** exactly ten tools, exactly seven static, existing three contextual, additive read tool returns ≤1,500 characters and never changes revision/activity as a mutation
- **Stop condition:** existing tool must be renamed/removed, result compatibility breaks, or registration becomes unstable

### Packet 3.3 — mutation recovery publication and UI

- **Depends on:** accepted Packet 3.2
- **RED:** integration/UI tests reproduce income for unknown Emma, stale selection, missing coverage provider, missing proof, attestation, and locked application; each expected recovery appears in result and UI with unchanged failure revision
- **GREEN:** attach descriptors to known failures, publish them through lifecycle/activity, render recovery banner with section navigation/focus only
- **Allowed production:** `tool-handlers.ts`, `tool-lifecycle.ts`, `store.ts` only for accepted seam, `RecoveryBanner.tsx`, `App.tsx`, focused CSS
- **Allowed tests:** static mutation, lifecycle, guidance-recovery UI, affected component tests, WebMCP E2E
- **Focused commands:** `npm run test:unit -- tests/integration/static-mutation-tools.test.ts tests/integration/tool-operation-lifecycle.test.ts tests/integration/guidance-recovery-ui.test.tsx`; `npm run test:e2e -- tests/e2e/webmcp-integration.spec.ts`
- **Acceptance:** Emma flow returns Household + `add_household_member` + required details; banner offers navigation but performs no automatic mutation; error and UI share action ID
- **Stop condition:** browser confirmation is bypassed, recovery invokes a second tool, or failure mutates persisted application state

## Phase verification

```bash
npm run test:unit -- src/domain/guidance.test.ts src/webmcp/recovery.test.ts tests/integration/static-read-navigation-tools.test.ts tests/integration/static-mutation-tools.test.ts tests/integration/dynamic-registry.test.ts tests/integration/tool-operation-lifecycle.test.ts tests/integration/guidance-recovery-ui.test.tsx
npm run test:contract -- tests/contract/tool-catalog.test.ts tests/contract/adversarial-security.test.ts tests/contract/model-context-port.test.ts
npm run test:e2e -- tests/e2e/webmcp-integration.spec.ts tests/e2e/collaboration-feedback.spec.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
npm run verify
git diff --check
git status --short
```

Independent review compares every original tool definition and handler behavior, inspects all `submit` occurrences, checks compact recovery output, reruns the Emma scenario, and records the intentional exact-nine-to-ten contract change.

## Acceptance criteria

- `get_next_actions` is the sole additive capability and is strict/read-only.
- Existing nine tools remain behaviorally compatible and no-submit.
- Guidance is deterministic, bounded, and policy/eligibility-free.
- Known recoverable failures carry structured recovery in tool output and visible UI.
- Emma-before-income explains the dependency without mutation or hidden repair.
- Failure activity is truthful and revision-stable.
- Aggregate local verification is green. Gate C establishes the minimum release cut.

## Gate C evidence and implementation record

- **Attempt date and timezone:** 2026-08-28, Asia/Kolkata (IST).
- **Exact baseline branch and HEAD:** `main`,
  `801a165ff8f115d6a4801b1f33d087508104ec04`.
- **Baseline status and user-owned changes:** the worktree intentionally carried
  the accepted Phase 1/2 collaboration changes and their untracked ledger/test
  files. Those changes were preserved; no reset, clean, merge, rebase, or branch
  operation was used.
- **MODEL:** `google-antigravity/gemini-3.7-flash`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** one bounded Gemini run covered the public exact-ten
  WebMCP contract, deterministic guidance, compact recovery, and UI publication
  seams without splitting shared catalog/result/store files across writers.
- **ESCALATION CONDITION:** stop on dirty-overlap ambiguity, an unallowlisted
  file, existing-tool drift, automatic repair/chaining, revision or persistence
  mutation on read/failure paths, hidden submission, or any commit/push/deploy/
  remote mutation.
- **Packet and allowed files:** Packets 3.1, 3.2, and 3.3 were executed
  sequentially in one writer run. Production changes were limited to the
  guidance/recovery/result/catalog/handler/lifecycle/index seams, the accepted
  App and focused CSS seams, and the new recovery banner. Tests were limited to
  the packet and existing catalog/E2E selectors named above.
- **Actual changed files:** Phase 3 additions/semantic changes are present in
  `src/domain/guidance.ts`, `src/webmcp/recovery.ts`,
  `src/webmcp/index.ts`, `src/webmcp/tool-catalog.ts`,
  `src/webmcp/tool-results.ts`, `src/webmcp/tool-handlers.ts`,
  `src/webmcp/tool-lifecycle.ts`, `src/ui/feedback/RecoveryBanner.tsx`,
  `src/app/App.tsx`, and the focused recovery styles in `src/styles.css`, plus
  the allowlisted guidance/recovery, catalog, static-tool, lifecycle, UI, and
  WebMCP E2E tests. Some shared files were already dirty from Phases 1/2; no
  unrelated production file was added.
- **RED command, expected failure, and observed failure:** Packet 3.1 recorded
  two failed suites because `guidance.ts`/`recovery.ts` were absent. Packet 3.2
  recorded three exact-nine/partition/annotation failures. Packet 3.3 recorded
  two failures because the recovery UI module and exact-ten lifecycle assertions
  were absent. The independent compatibility correction also recorded one
  failing assertion (15-test selector) for missing mutation `fieldErrors`.
- **GREEN implementation summary:** added a pure capped `getNextActions`
  selector; pure known-failure recovery mapping; additive strict read-only
  `get_next_actions`; exact-ten/seven-static/three-contextual registration while
  preserving the original nine; compact serializable recovery without DOM focus
  IDs; lifecycle recovery publication; an accessible descriptive recovery
  banner; and a narrow correction preserving AJV `fieldErrors` for all five
  wrapped mutation validators.
- **Focused command results:** Packet 3.1 passed 2 files/17 tests; Packet 3.2
  passed 3 contract files/31 tests and 2 integration files/22 tests; Packet 3.3
  passed 3 unit/integration files/27 tests and 12 browser tests. The correction
  selector passed 3 files/27 tests.
- **Typecheck result:** `npm run typecheck` passed with zero diagnostics.
- **Aggregate gate result:** independent `npm run verify` passed formatting,
  lint, secret scan, typecheck, 28 unit files/219 tests, 10 contract files/87
  tests, production build, and 26 Playwright E2E tests. `git diff --check`
  passed.
- **Diff/status review:** the original nine catalog definitions remain intact;
  the only public capability addition is `get_next_actions`. The final status
  contains only the pre-existing collaboration/ledger files plus the Phase 3
  allowlist. HEAD and branch stayed unchanged, and no remote action occurred.
- **Independent reviewer and findings:** coordinator review reproduced the
  exact-ten/seven/three catalog, strict empty read schema, read-only revision and
  activity invariants, compact result budget, Emma-before-income recovery, stale
  selection/provider mappings, action-ID/revision parity, DOM-only focus stripping,
  and non-mutating banner navigation. Review found and routed one concrete
  backward-compatibility defect (dropped validation `fieldErrors`) through the
  same Gemini route; the correction and full aggregate rerun are green.
- **Status decision:** **Gate C accepted; Phase 3 `validated`.** The minimum
  credible collaboration release is locally accepted. No commit, push, deploy,
  Site save, live tool call, or hosted mutation is implied.
- **Risks, assumptions, and unresolved decisions:** recovery remains descriptive
  and never auto-invokes a suggested tool. The exact-ten catalog change is
  intentional and must be included in the next release commit. Phase 4 undo,
  Phase 5 mobile/onboarding/save clarity, Phase 6 document/release validation,
  and any voice work remain unstarted. Live WebMCP recognition still requires a
  separately authorized deployment/evidence pass.

### Worker evidence

- Main run: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-010241-44278`
- Compatibility correction: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-012024-47099`

## Non-goals

No generic plan/apply transaction, automatic chaining, hidden repair, undo, document OCR/upload, embedded agent, voice, remote mutation, or deployment.

## Review risks

- Tool-count change can weaken prior exact catalog guarantees. Preserve an explicit exact-ten assertion and original-nine equality assertion.
- Recovery can become prose-heavy. Keep structured fields canonical and messages concise.
- Suggested tools may be unavailable contextually. Only suggest static tools or clearly state required selection/navigation.
- `get_next_actions` could drift into advice. Restrict it to application completeness and synthetic document readiness.

## 2026-08-28 review reopening (pre-remediation history)

The Emma-before-income probe still returns the expected structured recovery and
does not mutate application state, but `ui.activity` remains empty. This
contradicts Packet 3.3's requirement to publish the same recovery through
lifecycle/activity and the phase acceptance criterion that failure activity is
truthful. Before M1, Gate C was reopened pending CR-03 closure with exactly one
revision-stable failed activity entry and no duplicate command-failure row. See the
[cross-phase review](../reviews/2026-08-28-phase-1-6-code-review.md).

## 2026-08-28 remediation closure

Packet M1 closed CR-03. Emma-before-income recovery records exactly one
revision-stable failed activity with recovery metadata and no duplicate row; Gate
C is reaccepted.
