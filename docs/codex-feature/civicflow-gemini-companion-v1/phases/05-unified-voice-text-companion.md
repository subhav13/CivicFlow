# Phase 4 — unified accessible voice and text companion

## Status

`validated` for the mocked Runtime Gate C companion UI/controller boundary.
Entry required the mocked secure runtime Gate C. The companion is optional and
remains removable without changing the human portal or WebMCP contracts.

## Goal

Present one assistant panel where a user can type or speak, see the transcript
and written response, optionally hear the response, confirm mutations, and
inspect truthful operation/activity feedback.

## Problem Evidence

- Text and voice are intended to help different users, but separate products
  would fork state and action semantics.
- Low-vision users benefit from spoken guidance, while keyboard, captions,
  screen-reader semantics, large text, and text-only operation remain essential.
- A voice transcript or silence cannot be treated as consent to mutate or
  submit an application.
- Existing Agent Companion/activity surfaces should be extended, not replaced,
  so ChatGPT and Gemini actions remain recognizable in one timeline.

## Design

Add an accessible panel around the Phase 3 session/controller. It provides
typed input, Speak/Stop, transcript/captions, written output, optional spoken
output, status, confirmation cards, conversation/action history, Repeat,
Speak slower, Read current section, and Clear conversation. All mutation cards
show a plain-language summary and explicit Confirm/Cancel. The panel never
directly calls commands or reads hidden state. `Read current section` is a
deterministic read-only extraction of visible text.

## Likely Files

- `src/ui/agent-companion/AssistantPanel.tsx`
- `src/ui/agent-companion/AssistantComposer.tsx`
- `src/ui/agent-companion/VoiceControls.tsx`
- `src/ui/agent-companion/ConversationTimeline.tsx`
- `src/ui/agent-companion/ToolConfirmationCard.tsx`
- `src/ui/agent-companion/AssistantStatus.tsx`
- `src/ui/agent-companion/AgentCompanion.tsx` where integration is required
- `src/assistant/assistant-controller.ts`
- `src/styles.css`
- focused component/integration tests and accessibility E2E tests

The worker must not change the current WebMCP catalog, application schema,
submission control, or provider/session security boundary.

## Tasks

### Packet 4.1 — shared conversation and panel shell

- Render text and voice turns in one conversation timeline.
- Display connection/listening/thinking/confirming/applying/speaking/error
  states and operation feedback from the shared store.
- Keep the portal usable if the panel closes or the assistant is disabled.

### Packet 4.2 — input/output and explicit mutation confirmation

- Add text Send and Speak/Stop controls.
- Render interim/final transcript and assistant text; provide optional speech
  output with Repeat and slower speech preference.
- Show confirmation before every mutation and call the Phase 2 bridge only
  after an explicit Confirm click.
- Refuse submit/attest requests in both text and voice with no tool call.

### Packet 4.3 — accessibility and read-only guidance

- Keyboard-complete all controls and restore focus on close/error.
- Add accessible labels/live regions, captions, large targets, high contrast,
  200% zoom/reflow, and reduced-motion behavior.
- Implement Read current section as a pure visible-text action; no mutation or
  hidden application data transmission.
- Provide text-only fallback for microphone denial, unsupported browsers, or
  audio failure.

## RED tests

- Component tests fail before the unified panel, status states, transcript,
  controls, and confirmation cards exist.
- Integration tests fail if voice and text use different session/action paths,
  if confirmation is bypassed, or if submit/attest is callable.
- Accessibility tests fail for missing labels, focus loss, missing captions,
  keyboard traps, poor zoom/reflow, or reduced-motion regressions.

## GREEN implementation boundary

GREEN is UI/controller integration over the already verified mocked runtime.
No production fake latency, direct command/store access, provider-specific
tool duplication, automatic mutation, or submission/attestation path may be
introduced.

## Verification commands

```bash
npm run test:unit -- --run src/ui/agent-companion/AssistantPanel.test.tsx src/ui/agent-companion/AssistantComposer.test.tsx src/ui/agent-companion/VoiceControls.test.tsx src/ui/agent-companion/ConversationTimeline.test.tsx src/ui/agent-companion/ToolConfirmationCard.test.tsx
npm run test:unit -- --run tests/integration/assistant-companion.test.tsx tests/integration/manual-submission.test.tsx
npm run test:e2e -- tests/e2e/assistant-text-voice.spec.ts tests/e2e/adversarial-accessibility.spec.ts tests/e2e/reduced-motion.spec.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
npm run verify
git diff --check
```

## Acceptance Criteria

- Text and voice share one session, conversation, tool bridge, application
  state, operation status, and activity timeline.
- Mutations require a visible explicit confirmation; reads/navigation may run.
- Submit and attestation remain human-only and absent from function calls.
- Visible transcript/captions, optional speech, keyboard/screen-reader,
  contrast, zoom, reduced-motion, and text-only fallback all work.
- Closing or disabling the companion never blocks the portal.

## Non-Goals

No always-listening microphone, voice-only workflow, direct command call,
hidden application data read, new Site Tool, account/telemetry, cross-tab sync,
undo, deployment, live Gemini call, commit, or push.

## Review Risks

- A voice-only affordance can exclude users; every task remains text/keyboard
  reachable.
- Assistant state can obscure the human review/submission boundary; keep it
  visibly separate and explicit.
- Speech synthesis/recording may continue after errors; delegate cleanup to the
  runtime lifecycle and test unmount/page-hide/stop.
- Read-current-section can accidentally read hidden or sensitive data; select
  visible, user-facing text only.

## External boundaries

No real Gemini call, secret, deployment, public enablement, commit, push, or
Devpost action is authorized by this phase.

## Evidence record

On 2026-08-28, Phase 4 Packets 4.1–4.3 were implemented against `main` at
`3fff4b7c75c726b21803a2a3e10fabd8c560cdd8` through OMP Antigravity
`google-antigravity/gemini-3.7-flash` with `high` reasoning. The user explicitly
requested this route. The worktree was already dirty from earlier CivicFlow
phase work; unrelated changes were preserved. No commit, push, deployment,
credential access, real Gemini call, live audit, or external action occurred.

The RED → GREEN sequence included the initial missing-panel/controller tests,
independent adversarial tests for transcript/status/confirmation/cleanup/
serialization boundaries, an applying-state regression, and a final
clear-conversation regression. The accepted implementation provides one
keyboard-accessible, responsive, CivicFlow-themed panel over the shared mocked
controller: typed and voice turns share one timeline, model/user captions are
visible, optional speech has repeat/slower controls, explicit confirmation is
preserved, read-current-section remains read-only, pending microphone state is
cleaned up, and unavailable sessions remain text-only without blocking the
portal. Clear conversation removes local history and cancels local speech while
leaving the controller/session and pending confirmations intact.

Independent focused GREEN evidence:

- `npm run test:unit -- --run src/ui/agent-companion/AssistantPanel.test.tsx tests/unit/assistant-controller-confirmation.test.ts` — 2 files, 22 tests passed.
- `npm run test:contract -- --run tests/integration/assistant-companion.test.tsx` — 1 file, 2 tests passed.
- `npm run test:e2e -- tests/e2e/assistant-text-voice.spec.ts` — 2 tests passed.

The final aggregate gate was run independently after the last correction:
format check, lint, secret scan, both TypeScript project checks, 42 unit files
with 362 tests, 15 contract files with 126 tests, production build, and all 35
Playwright tests passed. A separate `git diff --check`, direct type check for
the server seams, and scoped assistant security/import scan were clean. Local
Playwright desktop/mobile visual inspection confirmed the existing CivicFlow
soft light/teal theme, responsive wrapping, and no narrow-layout overflow. The
aggregate result is evidence for this phase's local Companion Gate D only;
Phase 5 still owns broader integration, accessibility, and separately
authorized live-provider decisions.

OMP run evidence:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-221855-24148`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-223210-26372`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-224949-28377`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-225923-29852`
