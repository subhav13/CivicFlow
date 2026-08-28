# Phase 2 — visible progress and motion

## Status

`validated` after M1 remediation and independent reverification. The visible UI
remains implemented, and CR-02 and CR-04 are closed with action-ID-consistent,
truthful affected-record feedback.

## Goal

Turn the new lifecycle state and existing progress selectors into a clear, responsive collaboration experience: a useful progress summary, visible operation/result feedback, affected-record highlighting, a prominent activity timeline, and restrained accessible motion.

## Problem evidence

- The current percentage bar animates width but provides only `Progress` and `% complete`.
- Section navigation says only `Complete` or `Needs attention`; users cannot see completed count, blockers, or the next best section at a glance.
- `ActionFeedback` displays only final `Saved` or `Needs attention` text within the current form.
- Agent Companion activity is below capability definitions and is secondary on narrow screens.
- There is no `aria-busy` state, visible active operation, changed-card highlight, result toast, or startup orientation motion.
- The existing CSS has a reduced-motion override, but new behavior requires explicit coverage.

## Design

- Add a pure UI view-model function that combines existing progress, active section, review issue count, next action fallback, and persistence state. It does not reimplement completion rules.
- Refactor the progress header into a sticky responsive component showing percentage, `N of 6`, blocker count, current section, and the next section/action.
- Add an operation strip near progress. Active mutation shows source, label, and truthful phase; terminal success/failure shows the final summary.
- Add a recent-effect data attribute/class to the affected card or section. Use opacity/background/border transforms only; no layout-shifting animation.
- Move the latest activity summary above the capability list. Keep full activity in progressive disclosure.
- Add one-time entry motion to the shell after first render, not a loading screen.
- UI owns success acknowledgement expiry with injected/testable duration. Failure persists. Reduced-motion removes movement and count-up while preserving immediate text/color/state changes.
- Avoid global disable. Set `aria-busy` only on the affected region/control.

## Likely files

### Production

- new `src/ui/progress/progress-view-model.ts`
- new `src/ui/progress/ApplicationProgressTracker.tsx`
- new `src/ui/feedback/OperationStatus.tsx`
- new `src/ui/feedback/RecentEffect.tsx` or a focused hook/helper
- `src/ui/components/SectionPrimitives.tsx`
- `src/ui/layout/ApplicationShell.tsx`
- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/app/App.tsx`
- `src/styles.css`

### Tests

- new `src/ui/progress/progress-view-model.test.ts`
- new `src/ui/feedback/OperationStatus.test.tsx`
- `src/ui/layout/ApplicationShell.test.tsx`
- `src/ui/agent-companion/AgentCompanion.test.tsx`
- `tests/integration/capability-activity-ui.test.tsx`
- new `tests/e2e/collaboration-feedback.spec.ts`
- new `tests/e2e/reduced-motion.spec.ts`

No catalog/result, domain rule, command, persistence schema, undo, document, voice, server, or hosting change is allowed.

## Tasks and atomic packets

### Packet 2.1 — progress view model and tracker

- **Depends on:** UX Gate A
- **RED:** tests require exact completed count, six total sections, blocker count, active section, next target, and save-state label across seed/partial/complete/submitted fixtures
- **GREEN:** derive a stable view model from accepted selectors and render desktop/tablet/narrow summaries without changing completion weights
- **Allowed production:** `src/ui/progress/*`, `src/ui/layout/ApplicationShell.tsx`, `src/app/App.tsx`
- **Allowed tests:** progress view-model test and `ApplicationShell.test.tsx`
- **Focused command:** `npm run test:unit -- src/ui/progress/progress-view-model.test.ts src/ui/layout/ApplicationShell.test.tsx`
- **Acceptance:** `N of 6`, percent, blocker count, and next target are consistent with domain selectors; no eligibility language
- **Stop condition:** view model needs a new domain completion rule rather than composition of existing selectors

### Packet 2.2 — operation strip, result, and affected-record feedback

- **Depends on:** accepted Packet 2.1
- **RED:** component/integration tests require human/WebMCP phase labels, action ID association, local `aria-busy`, success auto-dismiss, persistent failure, no-op/read-only suppression, and affected-section/card marker
- **GREEN:** render store lifecycle/effect state; add shared result surface and wire section/card markers by stable IDs
- **Allowed production:** `src/ui/feedback/*`, `SectionPrimitives.tsx`, `ApplicationShell.tsx`, `App.tsx`, affected section/card components only when marker plumbing requires them
- **Allowed tests:** operation component test, shell test, capability/activity integration test, affected section tests
- **Focused command:** `npm run test:unit -- src/ui/feedback/OperationStatus.test.tsx tests/integration/capability-activity-ui.test.tsx`
- **Acceptance:** the final visible message and tool result describe the same action/revision; unrelated controls stay enabled; failure focus is deterministic
- **Stop condition:** component needs to inspect WebMCP internals or duplicate command logic

### Packet 2.3 — timeline hierarchy, startup motion, and reduced motion

- **Depends on:** accepted Packet 2.2
- **RED:** UI/E2E tests require latest activity before capabilities, source/status/section/time semantics, entry-motion class, affected-effect class, and reduced-motion suppression
- **GREEN:** refine Agent Companion hierarchy and CSS motion tokens; keep activity runtime-derived and cap unchanged
- **Allowed production:** `AgentCompanion.tsx`, `ApplicationShell.tsx`, `src/styles.css`, minimal helper/component files under `src/ui/feedback/`
- **Allowed tests:** companion tests, collaboration feedback E2E, reduced-motion E2E
- **Focused commands:** `npm run test:unit -- src/ui/agent-companion/AgentCompanion.test.tsx tests/integration/capability-activity-ui.test.tsx`; `npm run test:e2e -- tests/e2e/collaboration-feedback.spec.ts tests/e2e/reduced-motion.spec.ts`
- **Acceptance:** motion is short, nonblocking, transform/opacity based, and disabled under reduced motion; status remains understandable without animation
- **Stop condition:** visual behavior requires fake command latency, uncontrolled timers, or screenshot-only assertions

## Phase verification

```bash
npm run test:unit -- src/ui/progress/progress-view-model.test.ts src/ui/feedback/OperationStatus.test.tsx src/ui/layout/ApplicationShell.test.tsx src/ui/agent-companion/AgentCompanion.test.tsx tests/integration/capability-activity-ui.test.tsx
npm run test:e2e -- tests/e2e/collaboration-feedback.spec.ts tests/e2e/reduced-motion.spec.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
git diff --check
git status --short
```

Independent review uses desktop and narrow viewport inspection in addition to automated gates, verifies no hidden sections or focus loss, and checks that no fake work claim appears.

## Acceptance criteria

- Progress communicates percentage, completed count, blockers, active step, and next target.
- Human and Site Tool mutations visibly enter and leave real lifecycle states.
- Success/failure and affected records remain attributable to the same action/revision.
- Latest human/agent activity is prominent without obscuring the form.
- Startup and change motion are restrained and fully reduced-motion compatible.
- Read-only queries/navigation never show mutation spinners.
- Existing keyboard, responsive, capability, no-submit, and aggregate tests remain green.

## Non-goals

No recovery mapping, tool catalog/result change, next-actions tool, undo, mobile rail redesign beyond tracker responsiveness, onboarding guide, document intelligence, voice, remote action, or release claim.

## Review risks

- Animation can hide incorrect state. Assertions use semantic status and revision first.
- `aria-live` regions can become noisy. Announce one concise transition per action and avoid capability-list churn.
- Broad `aria-busy` can trap users. Scope it to the active mutation region.
- New sticky surfaces can consume narrow-screen space. Gate actual 375 px layout before acceptance.

## Phase 2 validation evidence

- **Validated:** 2026-08-28 00:53 IST
- **Repository baseline:** branch `main`, HEAD
  `801a165ff8f115d6a4801b1f33d087508104ec04`; the pre-existing dirty Phase 1
  files and companion planning ledger were preserved. No commit, push, deploy,
  publish, reset, clean, merge, or rebase was performed.
- **Implementation route:** one bounded OMP Gemini run for Packets 2.1–2.3,
  `MODEL: google-antigravity/gemini-3.7-flash`, `REASONING: high`. Two narrow
  same-route corrections then wired human form dispatches into the existing
  operation lifecycle and removed a duplicate generic status landmark. The
  route rationale was truthful state attribution plus accessible 375 px and
  reduced-motion behavior; escalation was any dirty overlap, unallowlisted
  file, domain/command/persistence/catalog/result/undo/voice/server/hosting
  change, fake latency, global disable, focus regression, or remote mutation.
- **Phase 2 files attributed to this run:**
  `src/ui/progress/progress-view-model.ts`,
  `src/ui/progress/ApplicationProgressTracker.tsx`,
  `src/ui/progress/progress-view-model.test.ts`,
  `src/ui/feedback/OperationStatus.tsx`,
  `src/ui/feedback/OperationStatus.test.tsx`,
  `src/ui/feedback/RecentEffect.tsx`,
  `src/ui/layout/ApplicationShell.tsx`,
  `src/ui/layout/ApplicationShell.test.tsx`,
  `src/ui/agent-companion/AgentCompanion.tsx`,
  `src/ui/agent-companion/AgentCompanion.test.tsx`,
  `src/app/App.tsx`, `src/styles.css`,
  `src/ui/sections/HouseholdSection.tsx`,
  `src/ui/sections/IncomeSection.tsx`,
  `tests/integration/capability-activity-ui.test.tsx`,
  `tests/e2e/collaboration-feedback.spec.ts`, and
  `tests/e2e/reduced-motion.spec.ts`.
- **RED/GREEN evidence:** Packet 2.1 RED was the missing progress view-model
  module; GREEN was 2 files/9 tests. Packet 2.2 RED was the missing operation
  surface; GREEN was 2 files/12 tests. Packet 2.3 RED covered missing timeline
  order/revision/disclosure; GREEN was 2 files/14 tests plus 4 browser tests.
  The human-lifecycle correction RED was the absent
  `[data-testid="operation-status"]` after a human add; GREEN passed the
  integration selection (6 tests) and collaboration E2E (2 tests). The status
  landmark correction passed the focused OperationStatus/About selection (8
  tests).
- **Independent focused gates:** Phase 2 unit/integration selection passed 5
  files/29 tests; Phase 2 browser selection passed 4 tests.
- **Independent aggregate gates:** `npm run verify` passed format, lint,
  secret scan, typecheck, 25 unit files/196 tests, 9 contract files/81 tests,
  production build, and 26 Playwright tests. `git diff --check` passed.
- **Independent review:** progress derives from accepted domain selectors and
  reports percent, completed count, blockers, active section, next target, and
  local save state; human and Site Tool mutations now publish the same store
  lifecycle into the visible operation surface; activity is newest-first with
  source/status/section/time/revision semantics; affected sections/cards expose
  action-linked markers; navigation/read-only paths remain free of mutation
  status; the 375 px and reduced-motion browser gates pass without horizontal
  overflow or hidden essential controls.
- **Decision:** Phase 2 is `validated`; Phase 3 — guidance and recovery — is
  the next dependency-ordered phase. The minimum credible hackathon release
  remains Phases 1–3. Commit/push/deploy remains separately gated.

## 2026-08-28 review reopening (pre-remediation history)

The review observed a serialized WebMCP action ID different from the affected
card's `recentEffect.actionId`, and an existing-record update published with
`kind: created`. These failures invalidate the same-action/revision attribution
and truthful affected-record semantics even though the current component and
browser suites pass. Before M1, Gate B returned to `in-progress` pending CR-02
and CR-04 closure and independent verification. See the
[cross-phase review](../reviews/2026-08-28-phase-1-6-code-review.md).

## 2026-08-28 remediation closure

Packet M1 closed CR-02 and CR-04. Serialized result, lifecycle, activity, and
affected-record feedback now share the action identity and truthful create/update
effect semantics; Gate B is reaccepted.
