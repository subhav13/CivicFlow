# Phase 5 — mobile navigation, onboarding, and persistence clarity

## Status

`validated` after M2 remediation and independent reverification. Navigation,
onboarding, reduced-motion, and persistence evidence are green; CR-05 and CR-06
are closed. Phase 4 undo remains explicitly cut. Commit, push, deploy, and
live-site evidence remain separately authorized work.

## Goal

Make every step and collaboration affordance discoverable on narrow screens, provide a concise first-run explanation of Site Tools, and communicate local save/restore/failure status accurately.

## Problem evidence

- The current desktop rail becomes a horizontal narrow-screen layout; a visual pass showed only the first portion of the six steps without an explicit `step N of 6` summary.
- The shared shell has a Next control but no Back control.
- Agent Companion becomes a bottom-of-page open button on narrow screens, so current action and recent activity are not prominent while filling long forms.
- The interface does not teach a first-time user what to ask an agent or how the human and Site Tools share state.
- “Saved in this browser” does not distinguish current-session save, restored application, unavailable storage, or failed write.
- LocalStorage hydration/save are synchronous; a loader would be misleading.

## Design

- At ≤768 px, show `Step N of 6`, current section label, percent, and a compact all-sections control. Opening it presents all six sections in order with completion state.
- Keep Back and Next controls at the end of every section; disable Back on About and Next on Review. Do not block navigation to incomplete sections.
- Keep the operation strip near the sticky progress summary. Agent Companion becomes a secondary drawer for full timeline/capability detail.
- Ensure the active step is scrolled into view when the horizontal stepper variant is used; no section is reachable only by an undiscoverable gesture.
- Add `PersistenceUiState` with `restored`, `saved-this-session`, or `failed`, plus current-session `savedAt` when known. It is UI state and not written into `ApplicationState`.
- After hydration with valid stored state, show `Loaded from this browser`. After a changed successful save, show `All changes saved · <time>`. On write failure, show a persistent non-sensitive warning that current memory state may not survive reload.
- Add a non-modal first-run card with three copyable prompts and a short explanation that Site Tools update the same visible synthetic application. Dismissal is session-only.
- Copy action may use the page clipboard only after a user click. It never navigates, opens ChatGPT, invokes Site Tools, or includes current application values.

## Likely files

### Production

- `src/application/store.ts`
- `src/application/persistence.ts` only if hydration status lacks a required non-sensitive distinction
- `src/ui/progress/ApplicationProgressTracker.tsx`
- `src/ui/layout/ApplicationShell.tsx`
- new `src/ui/navigation/SectionStepper.tsx`
- new `src/ui/onboarding/FirstRunGuide.tsx`
- new `src/ui/persistence/PersistenceStatus.tsx`
- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/app/App.tsx`
- `src/styles.css`

### Tests

- `src/application/store.test.ts`
- `src/application/persistence.test.ts`
- `src/ui/layout/ApplicationShell.test.tsx`
- new `src/ui/navigation/SectionStepper.test.tsx`
- new `src/ui/onboarding/FirstRunGuide.test.tsx`
- new `src/ui/persistence/PersistenceStatus.test.tsx`
- new `tests/e2e/mobile-six-step-flow.spec.ts`
- new `tests/e2e/first-run-guide.spec.ts`
- `tests/e2e/responsive-shell.spec.ts`
- `tests/e2e/adversarial-accessibility.spec.ts`

No domain completion rule, WebMCP catalog/result, undo contract, document rule, voice, server, or hosting change is allowed.

## Tasks and atomic packets

### Packet 5.1 — six-step responsive navigation and Back/Next

- **Depends on:** UX Gate C
- **RED:** component/E2E tests require every section visible or exposed through an explicit all-sections control at 375/768/1440 px, exact step count, active-state focus, Back/Next boundaries, and keyboard-only traversal
- **GREEN:** extract responsive stepper and add Back control using existing `SECTION_META` and navigation callback
- **Allowed production:** progress tracker, shell, new navigation component, App if prop wiring is required, focused CSS
- **Allowed tests:** shell/stepper, mobile flow, responsive shell, accessibility E2E
- **Focused commands:** `npm run test:unit -- src/ui/navigation/SectionStepper.test.tsx src/ui/layout/ApplicationShell.test.tsx`; `npm run test:e2e -- tests/e2e/mobile-six-step-flow.spec.ts tests/e2e/responsive-shell.spec.ts tests/e2e/adversarial-accessibility.spec.ts`
- **Acceptance:** all six steps discoverable without horizontal guesswork; active heading receives focus; mobile content has no horizontal page overflow
- **Stop condition:** navigation requires a new section state model or hides incomplete steps

### Packet 5.2 — truthful save/restore/failure status

- **Depends on:** accepted Packet 5.1
- **RED:** store/component tests require restored wording, current-session saved time, failed-write warning, no timestamp claim after reload, unchanged application revision for status updates, and reset status behavior
- **GREEN:** add ephemeral persistence status and component using existing load/save result; update only on real hydration/save events
- **Allowed production:** store, persistence only for accepted status seam, new persistence component, shell/App wiring
- **Allowed tests:** store, persistence, persistence status component
- **Focused command:** `npm run test:unit -- src/application/store.test.ts src/application/persistence.test.ts src/ui/persistence/PersistenceStatus.test.tsx`
- **Acceptance:** successful save and failure claims match actual persistence result; no profile fields or state snapshots are added to status
- **Stop condition:** exact timestamp would require changing the persisted application schema or creating an unapproved second storage record

### Packet 5.3 — first-run guide and prompt copying

- **Depends on:** accepted Packet 5.2
- **RED:** component/E2E tests require non-modal guide, exact synthetic disclosure, three stable prompts, copy only after click, session dismissal, keyboard/focus semantics, reduced motion, and no automatic navigation/tool call
- **GREEN:** add the guide with static prompt constants and optional entry animation from Phase 2 tokens
- **Allowed production:** onboarding component, App/shell wiring, focused CSS
- **Allowed tests:** guide unit and E2E, reduced-motion E2E
- **Focused commands:** `npm run test:unit -- src/ui/onboarding/FirstRunGuide.test.tsx`; `npm run test:e2e -- tests/e2e/first-run-guide.spec.ts tests/e2e/reduced-motion.spec.ts`
- **Acceptance:** a first-time judge understands the shared-page Site Tools story without blocking the form; copied prompts contain no current application data
- **Stop condition:** guide needs ChatGPT deep linking, permissions, a model/API call, or persistent account state

## Phase verification

```bash
npm run test:unit -- src/application/store.test.ts src/application/persistence.test.ts src/ui/navigation/SectionStepper.test.tsx src/ui/layout/ApplicationShell.test.tsx src/ui/persistence/PersistenceStatus.test.tsx src/ui/onboarding/FirstRunGuide.test.tsx
npm run test:e2e -- tests/e2e/mobile-six-step-flow.spec.ts tests/e2e/first-run-guide.spec.ts tests/e2e/responsive-shell.spec.ts tests/e2e/adversarial-accessibility.spec.ts tests/e2e/reduced-motion.spec.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
npm run verify
git diff --check
git status --short
```

Independent review inspects 375, 768, and 1440 px; keyboard-only traversal; zoom/reflow; restored and failed storage fixtures; and copy behavior. It verifies the guide does not send or derive user data.

## Acceptance criteria

- All six sections are immediately discoverable at every required width.
- Back/Next and direct section navigation remain accessible and preserve current application state.
- Active operation/progress remain visible without obscuring the form.
- Persistence wording is tied to real outcomes and avoids false timestamp claims.
- First-run guide is concise, dismissible, synthetic-only, and non-automating.
- Reduced motion and aggregate verification remain green.

## Non-goals

No mobile-native app, account sync, second persistence key, scenario loader, ChatGPT deep link, embedded chat, analytics, document feature, voice, commit, push, deploy, or live call.

## Review risks

- Sticky header and stepper can consume too much viewport. Gate with real 375 px inspection.
- Clipboard calls are browser side effects. Require a direct user click and static text.
- Save wording can overclaim. Derive it only from load/save results and current-session clock.
- A modal tour can trap focus and slow judges. Keep onboarding non-modal.

## Gate E evidence and implementation record

- **Attempt date and timezone:** 2026-08-28, Asia/Kolkata (IST).
- **Exact baseline branch and HEAD:** `main`,
  `801a165ff8f115d6a4801b1f33d087508104ec04`.
- **Baseline status and user-owned changes:** the worktree intentionally
  carried the accepted Phase 1–3 collaboration changes, their tests, and the
  companion ledgers. Those changes were preserved; no reset, clean, merge,
  rebase, branch switch, or destructive operation was used.
- **MODEL:** `google-antigravity/gemini-3.7-flash`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** one bounded OMP Gemini run covered Packets 5.1–5.3
  across the shared responsive shell, persistence state, and onboarding seams;
  two narrow same-route corrections then closed concrete contract findings
  without introducing a second writer on unrelated modules.
- **ESCALATION CONDITION:** stop on dirty-overlap ambiguity, an unallowlisted
  file, domain/WebMCP/command/schema drift, fake latency, hidden navigation or
  tool invocation, a false persistence claim, reduced-motion regression, or any
  commit/push/deploy/live/remote mutation.
- **Packet and allowed files:** Packets 5.1, 5.2, and 5.3 were executed in one
  writer run under their documented allowlists. The first correction was limited
  to onboarding/stepper source and focused tests; the second was limited to the
  persistence/store source and focused tests. Phase 4 remained deferred and no
  undo-specific files or controls were added.
- **Actual changed files attributed to Phase 5:**
  `src/application/persistence.ts`, `src/application/persistence.test.ts`,
  `src/application/store.ts`, `src/application/store.test.ts`,
  `src/ui/progress/progress-view-model.ts`,
  `src/ui/layout/ApplicationShell.tsx`, `src/ui/layout/ApplicationShell.test.tsx`,
  `src/ui/navigation/SectionStepper.tsx`,
  `src/ui/navigation/SectionStepper.test.tsx`,
  `src/ui/onboarding/FirstRunGuide.tsx`,
  `src/ui/onboarding/FirstRunGuide.test.tsx`,
  `src/ui/persistence/PersistenceStatus.tsx`,
  `src/ui/persistence/PersistenceStatus.test.tsx`, `src/app/App.tsx`,
  `src/styles.css`, `tests/e2e/mobile-six-step-flow.spec.ts`,
  `tests/e2e/first-run-guide.spec.ts`, and
  `tests/e2e/reduced-motion.spec.ts`. Existing Phase 1–3 shared-file changes
  remain attributed to their earlier gates; no unallowlisted Phase 5 production
  module was added.
- **RED command, expected failure, and observed failure:** Packet 5.1 RED
  recorded the missing stepper unit suite and four missing mobile E2E assertions;
  Packet 5.2 RED recorded three missing persistence-state/component suites;
  Packet 5.3 RED recorded the absent guide unit/E2E behavior. The first
  correction reproduced concrete prompt names/amounts and smooth scrolling under
  reduced motion. The second correction reproduced `storage: null` being
  labeled `seed`/`Saved in this browser` instead of unavailable.
- **GREEN implementation summary:** added the six-step compact navigator with
  completion state and Back/Next boundaries; kept incomplete sections directly
  reachable; exposed real operation/progress and save status in the existing
  shell; distinguished loaded, restored, current-session saved, failed, and
  unavailable persistence without changing the application schema/key; added a
  non-modal session-only synthetic guide with exactly three click-to-copy static
  prompts; and made active-step scrolling respect `prefers-reduced-motion`.
- **Focused command results:** the worker’s focused Phase 5 selections passed
  6 unit files/55 tests and 17 browser tests. The prompt/reduced-motion
  correction passed 2 unit files/11 tests and 3 browser tests. The final
  persistence correction passed 2 unit files/42 tests; the independent rerun
  also passed the same 2-file/42-test selection.
- **Typecheck result:** independent `npm run verify` passed typecheck with zero
  diagnostics.
- **Aggregate gate result:** independent `npm run verify` passed formatting,
  lint, secret scan, typecheck, 31 unit files/246 tests, 10 contract files/87
  tests, production build, and 31 Playwright E2E tests. `git diff --check`
  passed.
- **Diff/status review:** branch and HEAD remained `main`/
  `801a165ff8f115d6a4801b1f33d087508104ec04`; the worktree still contains only
  the pre-existing Phase 1–3/ledger changes plus the Phase 5 allowlist. The
  rendered save-state pill is derived from ephemeral `PersistenceUiState`; UI
  status never enters persisted `ApplicationState`. No commit, push, deploy,
  Site save, live call, or hosted mutation occurred.
- **Independent reviewer and findings:** coordinator review verified 375 px,
  768 px, and desktop shell behavior through the responsive/mobile suites;
  keyboard Back/Next and direct incomplete-section navigation; exact six-step
  ordering/completion state; non-modal guide and click-only copy behavior;
  reduced-motion auto scrolling; loaded/save/failure/reset persistence semantics;
  and preservation of the WebMCP/no-submit gates. Review found and routed two
  narrow corrections (prompt sanitization/reduced motion and unavailable-storage
  truthfulness); both RED/GREEN reruns and the final aggregate suite are green.
- **Status decision:** **Gate E accepted; Phase 5 `validated`.** The selected
  collaboration hackathon path is now Phases 1–3 plus Phase 5. Phase 4 remains
  deferred with no Gate D or undo claim.
- **Risks, assumptions, and unresolved decisions:** persistence remains local
  and synchronous; unavailable storage warns while in-memory edits remain
  usable but may not survive reload. The onboarding guide uses synthetic
  placeholders only and deliberately does not invoke ChatGPT or Site Tools.
  Phase 6 document readiness/release validation and any separately selected
  voice work remain outstanding. Live WebMCP recognition and deployment still
  require explicit authorization and exact-version evidence.

### Worker evidence

- Main Phase 5 run: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-013354-48599`
- Prompt/reduced-motion correction: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-014719-51032`
- Persistence availability correction: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-015542-52908`

## 2026-08-28 review reopening (pre-remediation history)

With available empty storage and no write, the store reports `Saved in this
browser`; with corrupt stored JSON discarded in favor of the seed, it reports
`Restored from this browser`. Both claims fail Packet 5.2's rule that wording be
tied to real persistence outcomes. Before M2, Gate E was reopened pending CR-05
and CR-06 closure and a distinction between untouched seed, valid load,
invalid-data recovery, successful save,
and unavailable/failed storage, followed by focused and aggregate reverification.
See the [cross-phase review](../reviews/2026-08-28-phase-1-6-code-review.md).

## 2026-08-28 remediation closure

Packet M2 closed CR-05 and CR-06. Untouched seed and corrupt-storage fallback
copy now describe the actual browser-save outcome, while valid loads, saves, and
unavailable storage retain truthful meanings; Gate E is reaccepted.
