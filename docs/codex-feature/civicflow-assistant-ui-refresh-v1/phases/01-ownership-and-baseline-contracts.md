# Phase 1 — single assistant ownership and baseline contracts

- **Status:** `validated`
- **Owner:** Codex self implementation (`gpt-5.6-terra`, `high`)
- **Review:** independent Codex Sol High
- **Depends on:** Phase 0
- **Produces:** stable experience-state seam, not visual redesign

## Goal and evidence

Replace dual presentation ownership with one long-lived assistant experience
subscribed once to the controller. Open/minimized becomes a view concern so
later phases cannot reset conversation, mic, speaker, status, or confirmation.

Current source renders `AssistantPanel` in the always-mounted aside and another
inside the compact dialog. Panel state owns session/messages/mic/status/speech/
confirmation locally, while `AgentCompanion` separately subscribes for global
confirmation and focus. `App` already owns the runtime/controller lifetime.

## Design

Create one focused owner under `src/ui/agent-companion/` for current event
reduction and interactions. Render one panel from it. The owner stays mounted;
`isOpen` controls only presentation. Keep the global confirmation modal in this
single tree. Preserve focus to the application heading after success and to the
launcher after ordinary close. Add no Zustand state or persistence.

## Likely files

- `src/app/App.tsx`, only if owner placement needs runtime alignment
- `src/ui/layout/ApplicationShell.tsx`, ownership props only
- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/ui/agent-companion/AssistantPanel.tsx`
- one new focused hook/provider/view-model and optional colocated test

## Packets

### 1.1 — characterize ownership

- Add a controller fake with subscribe/unsubscribe counters.
- RED: compact open/close expects one subscription.
- RED: state before close remains after reopen.
- RED: hide alone does not stop microphone or disconnect.

### 1.2 — extract the owner

- Move event-derived state/actions without controller semantic changes.
- Keep one subscription, cleaned only when owner/controller unmounts/changes.
- Make panel primarily presentational and remove duplicate render path.

### 1.3 — confirmation and focus preservation

- RED: confirmation received while minimized remains globally actionable.
- Preserve Confirm, Need correction, Cancel, applying, failure, delivery
  failure, success-close, heading focus, null controller, disabled assistant,
  and StrictMode cleanup.

## RED/GREEN commands

```bash
npm run test:unit -- src/ui/agent-companion/AgentCompanion.test.tsx src/ui/agent-companion/AssistantPanel.test.tsx
npm run typecheck
npm run test:unit -- tests/unit/assistant-controller-confirmation.test.ts tests/unit/assistant-controller.test.ts
git diff --check
```

The focused command must first fail on new ownership assertions and later pass
with those same assertions retained.

## Acceptance

- one controller has one active assistant subscription tree;
- open/close preserves messages and derived state;
- hide does not stop mic/disconnect;
- closed confirmation remains visible through existing explicit modal flow;
- no store/command import, persistence, provider/WebMCP/submission/dependency or
  visual redesign.

## Non-goals and stops

No orb, responsive surface, audio mute, guide/activity redesign, provider
change, or live verification. Stop if this needs controller/provider/WebMCP
semantic change, an out-of-allowlist rewrite, or cannot preserve behavior with
characterization tests.

## Implementation record

- **Attempt:** 2026-08-30, Asia/Kolkata.
- **MODEL:** `gpt-5.6-terra`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** The ownership refactor was a bounded local UI change
  with deterministic tests and no provider or application-state redesign.
- **ESCALATION CONDITION:** Escalate to native Luna Max only if an independent
  review finds a rough or critical regression in ownership, confirmation, or
  cleanup that cannot be resolved as a focused correction.
- **RED:** The new subscription/panel tests first failed with two subscriptions
  and two rendered panels; 48 of 50 tests passed before the production seam.
- **GREEN:** `AssistantPanel` owns the single controller subscription and
  `AgentCompanion` receives controller events through a callback; one mounted
  panel preserves conversation and confirmation state across presentation
  toggles.
- **Focused evidence:** AgentCompanion and AssistantPanel focused tests passed;
  the full unit suite passed 47 files and 473 tests.
- **Review state:** `validated`; final Sol review confirmed one mounted panel,
  one controller subscription, preserved confirmation/focus behavior, and no
  ownership drift.
