# Phase 4 — progressive disclosure and compact onboarding

- **Status:** `validated`
- **Owner:** Codex self implementation (`gpt-5.6-terra`, `high`)
- **Review:** independent Codex Sol High
- **Depends on:** Phase 3 `validated`
- **Produces:** closed supporting information and lightweight learning

## Goal

Make conversation/application primary without deleting diagnostics. Activity,
tools, metadata, and long help begin closed. Replace the large page guide with a
coachmark, reviewed suggestion chips, and optional help.

## Design

### Activity and tools

Use one closed `Activity & tools` disclosure. Its summary may show no activity,
latest action, or a count. Inside, the latest action is compact; history,
capabilities, and per-item technical metadata each start closed. New activity
updates the summary but never auto-expands or steals focus.

### Learning

- Remove `FirstRunGuide` from main page flow.
- Reuse `FIRST_RUN_PROMPTS` as three short empty-chat suggestions.
- Selecting stages composer text for review; it never sends, connects voice,
  invokes a tool, copies automatically, or mutates application state. Before
  the first mode choice, a user may still draft; sending is treated as chat
  and never requests the microphone implicitly.
- Show a short current-session coachmark near the orb with keyboard dismissal.
- Move synthetic-only and same-page Site Tools explanation into closed
  `How CivicFlow works` help.

## Likely files

- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/ui/agent-companion/AssistantPanel.tsx`
- focused activity/help/suggestion components under that directory
- `src/ui/onboarding/FirstRunGuide.tsx`, refactored/replaced while preserving
  prompt constants
- `src/ui/layout/ApplicationShell.tsx`
- `src/app/App.tsx`, session guide flag only if still owned there
- `src/styles.css`

## Packets

### 4.1 — closed supporting information

- RED: activity/tools/technical sections are closed initially.
- RED: new activity updates summary without opening.
- Preserve empty/success/failure/applying/human/WebMCP labels.

### 4.2 — compact coachmark

- RED: main shell has no large guide region.
- Add short coachmark with keyboard dismissal and page-session-only state.

### 4.3 — suggestions and help

- RED: suggestions appear only for an empty conversation.
- RED: selection stages text but does not send.
- Add closed help with synthetic/same-page explanation.
- Preserve labels, Escape, and focus.

## RED/GREEN commands

```bash
npm run test:unit -- src/ui/onboarding/FirstRunGuide.test.tsx src/ui/agent-companion/AgentCompanion.test.tsx src/ui/agent-companion/AssistantPanel.test.tsx
npm run test:e2e -- tests/e2e/first-run-guide.spec.ts tests/e2e/assistant-text-voice.spec.ts tests/e2e/responsive-shell.spec.ts tests/e2e/adversarial-accessibility.spec.ts tests/e2e/reduced-motion.spec.ts
npm run typecheck
npm run build
git diff --check
```

If the old guide test is replaced, retain equivalent assertions in a focused
new test and record the exact path.

## Acceptance

- no large page guide;
- activity/tools/history/capability IDs/action metadata/help start closed;
- information stays discoverable and keyboard operable;
- new activity never expands automatically;
- suggestions stage but never send/execute;
- coachmark/help remain truthful about synthetic data and same-page tools;
- no tool/activity semantics, persistence, dependency, or external change.

## Non-goals and stops

No deleted evidence, tutorial carousel, persisted guide completion, auto-run
prompts, tool copy/schema changes, or global content redesign. Confirmation and
critical delivery failures must remain primary and reachable. Route activity
semantic changes back to its parent ledger.

## Implementation record

- **Attempt:** 2026-08-30, Asia/Kolkata.
- **MODEL:** `gpt-5.6-terra`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** The disclosure, coachmark, and suggestion changes were
  isolated presentation behavior with existing fake-driven coverage.
- **ESCALATION CONDITION:** Escalate to native Luna Max only if review finds a
  critical accessibility or activity-semantics regression outside the CSS/UI
  allowlist.
- **RED:** The new disclosure, suggestion, and coachmark tests failed with
  three expected missing/legacy behaviors.
- **GREEN:** Activity and tools share a closed native disclosure with latest
  summary; nested history/capability/technical/help details remain closed;
  `FirstRunGuide` is no longer in the main shell; the orb coachmark and empty
  chat suggestions are session-local, suggestions stage text without send, and
  the first-open composer remains draftable while send stays mic-free chat.
- **Focused evidence:** Phase 4 unit tests and updated first-run/responsive/
  collaboration/WebMCP browser contracts passed; full E2E passed 35 tests.
- **Review state:** `validated`; final Sol review accepted the closed support
  disclosures, compact coachmark, and non-executing prompt suggestions.
