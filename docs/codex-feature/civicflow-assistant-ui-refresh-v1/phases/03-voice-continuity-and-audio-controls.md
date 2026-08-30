# Phase 3 — minimized voice continuity and truthful audio controls

- **Status:** `validated`
- **Owner:** Codex self implementation (`gpt-5.6-terra`, `high`)
- **Review:** independent Codex Sol High
- **Depends on:** Phase 2 `validated`
- **Produces:** chat/voice choice, minimized mic continuity, true speaker mute

## Goal and evidence

Voice starts only explicitly, keeps listening when the visual surface minimizes,
can stop from the minimized orb, and has independent microphone and real
speaker controls.

Today `AssistantPanel` owns listening and controller mic calls. Controller
already cleans mic/output on disconnect, error, dispose, and `pagehide`.
`AudioOutput` has only `play/stop`; the speech checkbox controls browser speech,
not provider PCM.

## Design

- Add session-only `unselected | chat | voice` mode. Typing remains available.
- Opening requests nothing. Chat connects without mic. Voice connects then
  requests mic from explicit activation.
- Experience owner controls listening; minimize changes display only.
- Minimized launcher has an accessible stop-mic action.
- Extend/wrap `AudioOutput` with truthful mute: mute stops sources, clears
  schedule, cancels speech, discards new audio; unmute permits future audio only.
- Controller exposes a narrow mute operation, never provider client access.
- Mic and speaker remain independent.

## Likely files

- `src/assistant/assistant-controller.ts`
- `src/assistant/browser-media.ts`
- `src/assistant/assistant-runtime.ts`, wiring only
- `src/ui/agent-companion/AssistantPanel.tsx`
- `src/ui/agent-companion/VoiceControls.tsx`
- Phase 1/2 experience and launcher files
- `src/ui/agent-companion/speech-output.ts`, unified suppression only
- `src/styles.css`, bounded voice styling

## Packets

### 3.1 — first-open choice

- RED: open does not connect/request mic.
- RED: chat connects/sends without mic.
- RED: voice connects then explicitly requests mic.
- Choice remains reversible and composer available.

### 3.2 — minimized mic

- RED: minimize while listening does not stop/disconnect.
- RED: minimized stop calls `stopMicrophone` once.
- RED: disconnect/error/dispose/pagehide still stop tracks.
- Launcher derives truthful listening/status state.

### 3.3 — real output mute

- RED in browser audio: mute stops scheduled sources/resets queue; play muted
  creates no source; unmute replays no backlog.
- RED in controller/UI: mute does not stop mic/disconnect.
- Cancel/suppress browser speech under same speaker preference.
- Replace ambiguous read-aloud checkbox with explicit speaker control.

## RED/GREEN commands

```bash
npm run test:unit -- tests/unit/browser-media.test.ts tests/unit/assistant-controller.test.ts tests/unit/assistant-controller-confirmation.test.ts
npm run test:unit -- src/ui/agent-companion/AssistantPanel.test.tsx src/ui/agent-companion/AgentCompanion.test.tsx
npm run test:unit -- tests/unit/gemini-live-runtime.test.ts
npm run test:e2e -- tests/e2e/assistant-text-voice.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/adversarial-accessibility.spec.ts
npm run typecheck
npm run build
git diff --check
```

## Acceptance

- no mic request on load/open/chat;
- voice starts through explicit click and existing controller;
- minimize preserves capture in same page with reachable truthful stop;
- mute affects provider PCM/browser speech immediately, discards muted audio,
  and never changes mic/session;
- terminal cleanup and existing transport/tool/privacy contracts stay green.

## Non-goals and stops

No always-on/background/cross-tab voice, wake word, recording persistence,
provider/model change, raw-audio visualization, or live mic/provider test. Stop
if truthful mute requires Gemini protocol change or late mic permission cannot
be fenced after disconnect.

## Implementation record

- **Attempt:** 2026-08-30, Asia/Kolkata.
- **MODEL:** `gpt-5.6-terra`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** The voice entry and output seam were local, typed
  controller/media changes with deterministic fakes; no rough or critical
  evidence required a subagent.
- **ESCALATION CONDITION:** Escalate to native Luna Max only if review finds
  provider-protocol, capture-lifecycle, or confirmation regressions that cannot
  be fixed within the media/UI allowlist.
- **RED:** First-open voice/chat tests failed before the choice UI; the browser
  mute test failed with `output.setMuted is not a function`.
- **GREEN:** Explicit chat/voice choice connects without implicit capture; the
  mounted panel keeps listening while minimized and exposes a stop badge; the
  controller delegates a narrow speaker-mute operation to `AudioOutput`, which
  stops active PCM sources and rejects muted/future audio until unmuted.
- **Focused evidence:** Browser media, controller lifecycle, AgentCompanion, and
  AssistantPanel tests passed; full unit and contract suites passed.
- **Review state:** `validated`; final Sol review confirmed explicit mic start,
  minimized stop, independent mute, and terminal media cleanup coverage.
