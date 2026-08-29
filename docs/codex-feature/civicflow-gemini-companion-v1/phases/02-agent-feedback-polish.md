# Phase 1 — agent feedback, notification, and progress polish

## Status

`validated` after independent Codex review on 2026-08-28. The user separately
authorized Packets 1.1–1.3 against the accepted `main` baseline. This phase
reuses the already accepted collaboration UX contracts and does not authorize
a Gemini connection.

## Goal

Make human and Site Tool activity unmistakable in the exact visible tab before
adding a second model-driven caller. Users should see what is happening, what
changed, where it changed, and whether the action succeeded or failed.

## Problem Evidence

- Raw tool names and generic success copy are less useful than human-readable
  action summaries.
- Fast synchronous Site Tool calls can complete before a user sees an applying
  state unless a real browser paint boundary is used.
- Latest Activity and affected-card feedback must share one action ID and
  revision; prior review history identified correlation and create/update
  labeling risks that are now remediated but require regression coverage.
- Same-tab activity and state worked in the observed run; a different-tab test
  caused the earlier apparent no-update issue. Cross-tab sync is not required
  for this hackathon.

## Design

Reuse `OperationState`, `ActivityEntry`, `RecentEffect`, progress view models,
and the current WebMCP lifecycle wrapper. Add no duplicate command semantics.
Expose friendly labels, validating/applying/succeeded/failed status, a compact
toast, affected-section/card markers, accessible activity details, and
same-tab `sessionStorage` retention of sanitized activity only. A
`requestAnimationFrame` or equivalent presentation boundary may make applying
visible; arbitrary fake latency is prohibited.

## Likely Files

- `src/application/operation-feedback.ts`
- `src/application/store.ts`
- `src/application/persistence.ts` or a dedicated activity-retention module
- `src/webmcp/tool-lifecycle.ts`
- `src/webmcp/tool-handlers.ts` only if action attribution needs a seam
- `src/ui/feedback/`
- `src/ui/progress/`
- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/ui/layout/ApplicationShell.tsx`
- `src/app/App.tsx`
- `src/styles.css`
- focused unit/integration tests and a same-tab E2E test

The worker must narrow the allowlist before implementation and must not change
domain schemas, tool names/results, Gemini transport, or hosting.

## Tasks

### Packet 1.1 — friendly operation labels and lifecycle presentation

- Centralize labels for the current ten tools and human actions.
- Preserve raw names only in expandable technical details.
- Render real validating/applying/succeeded/failed states near progress and the
  affected section.
- Add an accessible, dismissible, non-blocking toast for an agent change in a
  different section.

### Packet 1.2 — activity, effect, and same-tab retention

- Keep one action ID across WebMCP result, operation state, activity, effect,
  and changed-card marker.
- Show source, status, section, timestamp, revision transition, and compact
  affected entities with progressive disclosure.
- Retain sanitized activity in `sessionStorage`, cap at 20, discard corrupt or
  oversized data safely, and clear it on reset.
- Never retain raw arguments, transcripts, audio, full application state, or
  secrets. Do not add cross-tab synchronization.

### Packet 1.3 — exact-visible-tab browser proof

- Execute a delayed/fake WebMCP mutation in one page instance.
- Observe applying status before the mocked tool resolves, then observe the
  visible card/progress/activity update without reload.
- Reload the same tab and assert sanitized activity retention.
- Add reduced-motion, keyboard, and accessibility assertions without relying
  on screenshots or artificial sleeps.

## RED tests

- Label/status tests fail if raw tool names are the primary copy.
- Lifecycle tests fail if applying is not observable before delayed resolution.
- Store/UI tests fail if activity/effect action IDs diverge, updates say
  `created`, or retention includes raw sensitive fields.
- Same-tab E2E fails before implementation when operation markers/activity/
  refresh retention are absent.

## GREEN implementation boundary

Only feedback/progress/activity presentation and sanitized same-tab retention
may change. Existing application revisions, WebMCP result schemas, tool count,
and command semantics remain unchanged. The animation reflects real lifecycle
events; it does not manufacture work.

## Verification commands

```bash
npm run test:unit -- src/application/operation-feedback.test.ts src/application/store.test.ts src/ui/feedback/OperationStatus.test.tsx src/ui/progress/progress-view-model.test.ts src/ui/agent-companion/AgentCompanion.test.tsx
npm run test:unit -- tests/integration/tool-operation-lifecycle.test.ts tests/integration/capability-activity-ui.test.tsx
npm run test:e2e -- tests/e2e/collaboration-feedback.spec.ts tests/e2e/reduced-motion.spec.ts
npm run typecheck
npm run format:check
npm run lint
npm run scan:secrets
npm run build
npm run verify
git diff --check
```

The exact test selectors and counts must be recorded from the actual run. A
worker cannot claim a live Site Tools result from a fake port.

## Acceptance Criteria

- Human and WebMCP mutations show a truthful lifecycle in the visible tab.
- Friendly copy, source/status/section/revision details, toast, and highlights
  are accessible and action-correlated.
- Same-tab activity survives refresh without persisting raw sensitive content.
- Reset clears retained activity; corrupt/oversized retention fails safely.
- Reduced motion removes movement without removing status information.
- Existing ten-tool, no-submit, persistence, keyboard, and aggregate suites
  remain green.

## Non-Goals

No Gemini API, text agent, microphone, voice UI, cross-tab synchronization,
undo, new WebMCP capability, server, hosting, database, commit, push, deploy,
or live call.

## Review Risks

- A fake delay or spinner would misrepresent synchronous local behavior.
- Activity serialization can leak application details if summaries are not
  explicitly allowlisted.
- A toast or sticky status can obscure small screens or steal focus.
- Shared store/handler changes can regress the established action-ID seam.

## External boundaries

No commit, push, deploy, Site save, live Site Tools audit, Gemini call, secret
access, or release claim is authorized by this phase. A separate Codex review
must accept this phase before Phase 2 begins.

## Evidence record

- **Baseline:** `main` at `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`; the
  pre-existing documentation-only dirty state was preserved and no staged
  changes were introduced.
- **Implementation route:** OMP `google-antigravity/gemini-3.7-flash` at
  `high` reasoning, explicitly selected by the user. The dispatch rationale
  was a bounded, testable presentation/retention implementation over accepted
  local contracts. Escalation was required for any baseline, scope, test
  identity, provider, or external-action mismatch; no model/account/provider
  fallback was used.
- **RED:** the initial exact six-file unit selection collected 97 tests with
  5 failures, and the two-file browser selection had 1 failure out of 5. After
  review corrections, the exact six-file correction selection collected 100
  tests with 3 intentional failures. These failures covered friendly copy,
  sanitized retention, progressive activity details, truthful failure notice,
  and same-tab applying visibility before the delayed fake tool resolved.
- **GREEN focused evidence:** the final six-file unit selection passed 101/101;
  the required collaboration/reduced-motion browser selection passed 5/5;
  integration lifecycle/activity tests passed 16/16; and persistence/status
  tests passed 58/58.
- **Aggregate evidence:** `npm run verify` passed formatting, lint, secret
  scan, typecheck, 279 unit tests across 33 files, 90 contract tests across 10
  files, production build, and 33 Playwright tests.
- **Review closure:** independent inspection removed the initial production
  test hook and artificial timing path, restored a real browser presentation
  boundary and the delayed browser assertion, kept raw details behind
  disclosure, completed entity-kind and UTF-8 retention allowlists, made null
  storage explicitly disabled, kept failed notifications truthful, and
  preserved existing compatibility assertions.
- **Scope proof:** no Gemini bridge/runtime, voice/text companion, live audit,
  hosting, release package, undo, cross-tab synchronization, new WebMCP tool,
  domain/schema/command contract, server, external action, commit, or push was
  added. The worktree remains intentionally uncommitted for user review.
- **OMP evidence directories:**
  `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-182848-96586`,
  `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-184539-99763`,
  `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-192244-5389`,
  and `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-192959-6609`.
