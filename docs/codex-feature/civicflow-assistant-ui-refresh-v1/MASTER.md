# CivicFlow assistant UI refresh v1

## Ledger metadata

- **Feature:** minimal floating assistant, minimized voice continuity, progressive disclosure, and compact onboarding
- **Version:** v1
- **Status:** `validated`
- **Plan owner:** Codex `gpt-5.6-sol`, `high`
- **Implementation route:** Codex self implementation using `gpt-5.6-terra`, `high`; no subagent was dispatched because no rough or critical blocker was observed
- **Luna Max handoff:** native Codex `luna_max` (`gpt-5.6-luna`, `max`) is reserved for independent bounded review or critical corrections
- **Final review:** Codex `gpt-5.6-sol`, `high`; no escalation was required because no material contradictory or recurrent evidence survived review
- **Plan date:** 2026-08-30, Asia/Kolkata
- **Verified source baseline:** `main` at `f5ab396c3458d637449229944dc070f339ddde3a`, tracking `origin/main`, clean before this plan; `git pull --ff-only` returned `Already up to date.`

## Outcome

CivicFlow keeps the application visually primary and moves the optional
assistant into one small branded orb at the bottom-right. The orb opens one chat
surface that offers chat or explicitly enabled voice, keeps microphone and
speaker controls independent, and can minimize without ending a user-started
voice session while the same page remains alive. Activity, capability, and
technical information starts closed. The large first-run guide becomes a
light-touch coachmark, empty-chat suggestions, and optional help.

This is a presentation and client-session ownership refactor. It does not add a
new agent, tool, mutation route, provider, backend, submission path, or
dependency.

## Implementation checkpoint — 2026-08-30

Phases 1–5 are validated after user local testing, final Codex review, and the
complete verification suite. The implementation keeps one mounted assistant and one controller
subscription, replaces the permanent right rail with a floating launcher and
adaptive surface, adds explicit chat/voice entry and minimized microphone stop,
adds real provider/browser speaker mute, and moves activity/help/onboarding into
closed disclosures, suggestions, and a compact coachmark.

Follow-up visual correction on 2026-08-30 fixed the absolute-surface sizing
constraint that collapsed the open popover to a 42px header strip. The surface
now uses content-fit height, anchors above the launcher, and retains its
max-height/internal-scroll behavior.

Local dev launch note: the session broker keeps an exact origin allowlist. When
serving the preview at `http://127.0.0.1:5173`, start it with
`CIVICFLOW_LIVE_ORIGIN=http://127.0.0.1:5173 npm run dev -- --host 127.0.0.1`
or use the configured `http://localhost:5173` origin; do not broaden the check.

Verified gates:

- `npm run test:unit`: 47 files, 473 tests passed.
- `npm run test:contract`: 17 files, 153 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run scan:secrets`: passed.
- `npm run build`: passed; existing Vite config and chunk-size warnings remain.
- `npm run test:e2e`: 35 tests passed.
- focused collapsed-surface regression: 2 browser tests passed; the desktop
  dialog must exceed 300px height and remain anchored above the launcher.
- `git diff --check`: passed.

No deployment, Site mutation, credential access, live provider call, or real
microphone test occurred. The user explicitly authorized final review, commit,
and push after completing local testing; Git remains authoritative for the
resulting commit and remote state.

Final review found no P0/P1 issue. It added browser geometry coverage for the
previously corrected collapsed-surface defect, re-inspected the actual source,
test, and ledger diff, and confirmed no application-store, command, persistence,
provider, dependency, secret, or generated-artifact drift.

## Current evidence and problem

- `ApplicationShell` reserves a third wide-screen grid column for
  `AgentCompanion`.
- `AgentCompanion` always renders `AssistantPanel` in the aside and renders a
  second panel in the compact dialog. CSS hides the first visually but does not
  unmount it.
- `AssistantPanel` locally owns messages, listening/thinking/speaking flags,
  speech preferences, and pending confirmation state, coupling experience
  continuity to a presentation instance.
- the current read-aloud checkbox controls browser speech synthesis, but Gemini
  PCM is played independently by the controller's `AudioOutput`; it is not a
  real speaker mute.
- latest activity and every page capability occupy permanent visual space.
- `FirstRunGuide` is a large three-card page block that competes with the form.

## Authority and precedence

1. The user's 2026-08-30 UI decisions and attached voice-orb direction.
2. This ledger for assistant presentation, visibility, audio controls, and
   onboarding.
3. [Gemini companion v1](../civicflow-gemini-companion-v1/MASTER.md) for accepted
   runtime, WebMCP-only tooling, confirmation, privacy, and cleanup.
4. [Visible collaboration UX v1](../civicflow-collaboration-ux-v1/MASTER.md) for
   accepted activity, operation, progress, recovery, and historical onboarding.
5. [WebMCP v1](../civicflow-webmcp-v1/MASTER.md) for one-state,
   one-capability-surface, human-only submission, Sites, and release boundaries.
6. Current source and tests for actual paths and behavior.

Earlier decisions for a permanent panel and expanded first-run guide remain
historical evidence. This explicit request supersedes those presentation
choices only; it does not reopen runtime, safety, tool, or mutation contracts.

## Product contract

### Application-first layout and launcher

- Remove the permanent companion column. The desktop workspace contains the
  section rail and main application only.
- Mount exactly one assistant experience and one controller subscription tree.
- Use one 60px CivicFlow orb (acceptable 56–64px) at bottom-right, normally 24px
  from the viewport plus safe-area insets; 16px is acceptable on narrow screens.
- The orb is a semantic button with accessible name, visible focus,
  `aria-expanded`, and `aria-controls`.
- Use a restrained CivicFlow teal/indigo gradient. The attached ChatGPT visual
  is interaction inspiration, not an asset to copy.
- Truthful states are `idle`, `connecting`, `listening`, `thinking`, `speaking`,
  `muted`, and `error`; color is never the only signal.
- Under reduced motion, remove continuous animation.
- While minimized and listening, show a separate, focusable microphone stop
  affordance. Main orb opens; stop affordance stops capture without opening.

### One adaptive assistant surface

- Desktop: non-modal anchored popover, target 400px wide (acceptable 380–420),
  maximum height `min(680px, calc(100dvh - 112px))`, internal scrolling.
- Mobile: bottom sheet up to 88dvh, full available width, safe-area aware, and no
  horizontal scroll.
- Order: compact header/status, conversation, voice status/actions, composer,
  then closed supporting disclosures.
- Closing returns focus to the orb unless a successful confirmed mutation must
  focus the current application heading.
- `Escape` minimizes when no blocking confirmation is visible.
- The global confirmation modal can surface while minimized. Minimize never
  approves, cancels, loses, or bypasses a pending mutation confirmation.

### First-open choice

- First open in the mounted page shows `Start voice` and `Continue with chat`.
- The text composer remains usable, so the choice never blocks typing.
- Sending a drafted text before choosing treats the interaction as chat; it
  never requests the microphone implicitly.
- `Start voice` connects if required and requests microphone only from that
  explicit click.
- `Continue with chat` connects if required without requesting microphone.
- Mode is page/session-only and never enters application persistence,
  `localStorage`, or `sessionStorage`.
- Microphone and speaker remain independently reversible after the choice.

### Voice while minimized

After an explicit user start, hiding the assistant surface does not unmount the
experience, disconnect, or stop the microphone while the same page remains
alive. This is not always-on listening, capture before consent, cross-tab or
service-worker capture, or capture after close. Capture stops on explicit stop
or end, disconnect, fatal error, controller disposal, `pagehide`, or unmount.

### Independent microphone and speaker

- Microphone controls capture and outbound user audio only.
- Speaker controls provider PCM and optional browser speech synthesis.
- Muting immediately stops active/scheduled audio, resets playback scheduling,
  cancels speech synthesis, and discards new audio while muted.
- Unmuting allows future audio only; there is no replay or backlog burst.
- Muting does not stop the microphone or disconnect; stopping the microphone
  does not change speaker preference.
- Speaker preference is session-only. It defaults on after voice selection;
  chat-only use may leave it off until enabled.

### Progressive disclosure and compact learning

- One `Activity & tools` support section starts closed on every mount.
- It shows a compact latest-action summary and nested, closed recent-activity,
  capabilities, and technical-detail disclosures.
- New activity can update a label/count but cannot auto-expand or steal focus.
- Remove the large page-level first-run block.
- Show one short dismissible coachmark associated with the orb.
- Empty chat shows three suggestion chips derived from `FIRST_RUN_PROMPTS`.
  Selecting stages composer text; it never auto-sends or executes.
- Put synthetic-demo and longer "How it works" content in a closed help
  disclosure. Dismissal remains page/session-only; no clipboard permission is
  required for the primary guide flow.

## Architecture

```text
App-owned runtime/controller for page lifetime
                  │
                  ▼
One assistant experience owner and event subscription
  ├─ conversation and pending UI state
  ├─ mic/speaker preferences and derived status
  ├─ open/minimized/mode/help/disclosure state
  └─ controller actions; no application store/command imports
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 floating launcher    one adaptive surface
                              │
                              ▼
                 existing global confirmation modal
```

Presentation visibility is not a lifecycle owner. `App` retains the runtime.
Prefer a focused local hook/provider/view model in
`src/ui/agent-companion/`; do not add a global Zustand slice or persist
transcript, audio, tool arguments, mode, or preferences.

Recommended session-only shape:

```ts
type AssistantDisplay = 'minimized' | 'open';
type AssistantMode = 'unselected' | 'chat' | 'voice';
type SpeakerPreference = 'on' | 'muted';

interface AssistantExperienceState {
  display: AssistantDisplay;
  mode: AssistantMode;
  session: SessionState;
  messages: readonly TimelineMessage[];
  microphone: 'off' | 'starting' | 'listening';
  speaker: SpeakerPreference;
  thinking: boolean;
  speaking: boolean;
  pendingConfirmation: PendingToolConfirmation | null;
  activityOpen: boolean;
  helpOpen: boolean;
}
```

Names may adapt to repository conventions, but ownership may not drift back
into multiple presentation instances. True speaker control belongs at
`AudioOutput`, either through an explicit mute operation or a wrapper with the
same tested behavior. The controller exposes only a narrow operation, never the
provider client.

## Required transitions

| From                   | Event                        | To                    | Effect                             |
| ---------------------- | ---------------------------- | --------------------- | ---------------------------------- |
| minimized + idle       | open orb                     | open + unselected     | welcome; no mic prompt             |
| open + unselected      | chat                         | open + chat           | connect; no mic                    |
| open + unselected/chat | voice                        | open + voice          | connect, then explicit mic request |
| open + listening       | minimize                     | minimized + listening | keep session/capture               |
| minimized + listening  | stop badge                   | minimized + mic off   | stop capture tracks                |
| connected              | mute                         | connected + muted     | stop/clear output only             |
| muted                  | unmute                       | connected + on        | future output only                 |
| any connected          | end/disconnect               | idle                  | stop mic/output/transport          |
| any                    | fatal error/pagehide/dispose | error/idle            | terminal cleanup                   |
| minimized              | confirmation required        | modal visible         | preserve explicit confirmation     |

## Frozen invariants

- One application state, runtime/controller, assistant experience, and WebMCP
  mutation surface.
- Assistant code reaches application work only through current WebMCP and never
  imports application commands, Zustand store, tool handlers, or provider client.
- Reads/navigation keep current policy; mutations retain visible confirmation;
  attestation/submission remain human-only and never tools.
- Existing confirmation delivery, revision, cancel, activity, operation, error,
  focus recovery, and terminal cleanup remain intact.
- Synthetic data only; no raw audio/transcript/tool arguments in storage/logs.
- Preserve npm/Vite/Sites structure and current dependencies; no reinitializing
  or adding a component/icon library.
- No live provider/microphone test, credential, Site save/deploy, branch,
  dependency install, or unrelated GitHub mutation is authorized. The user
  separately authorized committing and pushing this validated allowlisted diff
  to the existing `main` branch on 2026-08-30.

## Phase map

1. [Ownership and baseline contracts](phases/01-ownership-and-baseline-contracts.md)
2. [Floating shell and responsive interaction](phases/02-floating-shell-and-responsive-interaction.md)
3. [Voice continuity and audio controls](phases/03-voice-continuity-and-audio-controls.md)
4. [Progressive disclosure and onboarding](phases/04-progressive-disclosure-and-onboarding.md)
5. [Integration, accessibility, and hackathon gate](phases/05-integration-accessibility-and-hackathon-gate.md)

Phases remain serially reviewable. Codex completed the bounded implementation
in one worktree. Final review found no rough or critical issue, so the reserved
Luna Max correction route was not used.

## Feature acceptance

- No permanent right rail or duplicate assistant panel.
- One floating launcher opens one desktop popover/mobile sheet.
- First open offers voice or chat without blocking typing.
- Explicitly started mic continues while minimized in the same page and has a
  reachable stop; terminal cleanup is proven.
- Speaker mute affects real provider audio and browser speech, not the mic.
- Activity/tools/technical details/long help start closed.
- Coachmark and suggestions replace the large guide; suggestions never send.
- Confirmation can surface while minimized and cannot be bypassed.
- Keyboard, focus, touch, contrast, reduced-motion, mobile-height, and no-scroll
  gates pass.
- Existing assistant, WebMCP, no-submit, persistence, collaboration, build, and
  E2E gates remain green, with an independently reviewed allowlisted diff.

## Stitch and Sites boundary

Stitch may be used in a separately authorized reference pass only if a
CivicFlow project exists. Record project/screen IDs and inspect screenshots;
never import generated runtime code blindly or make Stitch a dependency. Keep
the current React/CSS/npm/Vite/Sites architecture. This plan authorizes neither
Site deployment nor external design mutation.
