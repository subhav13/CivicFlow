# Phase 5 — integration, accessibility, and live Gemini gate

## Status

`in-progress`. Packets 5.1 and 5.2 local integration, accessibility, exact-tab,
and privacy evidence are accepted over the mocked Runtime Gate C. The local
Packet 5.3 credential/session path and browser handshake fix are implemented and
independently verified; the full authorized Gemini Live audit remains unclaimed
and is not inferred from a handshake, local mocks, public Site deployment, or a
passing build.

## Goal

Prove that text and voice use the same current WebMCP tools and visible state,
that failures degrade safely, and that the optional companion is inclusive and
truthful on the exact release candidate.

## Problem Evidence

- A local bridge can pass while a live model receives stale tools or produces
  an unconfirmed mutation.
- Microphone denial, quota exhaustion, network loss, unsupported audio, and
  page teardown are common failure paths.
- The earlier live issue involved controlling a different browser tab; exact
  same-tab evidence is necessary, while cross-tab synchronization is out of
  scope.
- Live deployment/source identity and official Gemini model/terms can drift.

## Design

Use deterministic fake Gemini events for the local matrix. Use a real Gemini
Live session only in a separately authorized, bounded audit with synthetic
data, an agreed quota/time/cost boundary, an exact deployment identity, and no
secret disclosure. Record tool discovery, function arguments class, result,
revision before/after, visible effect, cleanup, and no-submit behavior
separately.

## Likely Files

- `tests/e2e/assistant-text-voice.spec.ts`
- `tests/e2e/assistant-live-audit.spec.ts` only if an authorized harness exists
- `tests/integration/assistant-companion.test.tsx`
- `tests/integration/assistant-phase5.test.tsx`
- `tests/contract/gemini-session-api.test.ts`
- `tests/contract/current-tool-surface.test.ts`
- `src/ui/agent-companion/ConversationTimeline.tsx`
- existing WebMCP/activity/persistence/accessibility tests
- the active `docs/codex-feature` phase/evidence document only for audit recording

No product code may be changed in the live-audit packet except a narrowly
proven adapter correction returned to its owning phase.

## Tasks

### Packet 5.1 — local end-to-end matrix

- Type a household-member request and verify visible operation/activity.
- Drive a voice-shaped mocked income request and text correction through the
  same bridge/session/application state.
- Test ambiguity, unknown-person recovery, stale contextual tools, and a
  recoverable tool failure without revision mutation.
- Test microphone denial, network interruption, quota exhaustion, stop, page
  hide, and unmount cleanup.
- Test `Read current section`, repeat, slower speech, reduced motion, keyboard,
  screen-reader announcements, captions, contrast, zoom, and mobile layout.
- Ask to submit/attest and prove no function/tool or state mutation exists.

### Packet 5.2 — exact-visible-tab and privacy gate

- Run the mutation and activity proof in one page instance and assert no
  refresh is needed.
- Assert only sanitized activity survives same-tab refresh and reset clears it.
- Scan built output, logs/test fixtures, and client requests for credentials,
  raw audio, transcripts, tool arguments, or full application state.
- Keep cross-tab synchronization explicitly unclaimed.

### Packet 5.3 — local Live path and separately authorized real audit

The user authorized the local environment variant: keep the normal portal
disabled by default, expose the companion only behind an explicit development
flag and themed UI switch, broker a short-lived Gemini credential from the
local server, and pin the documented free-tier Live model. The implementation
must never expose the provider key to the browser or silently fall back to a
paid route.

Before making any real provider request, obtain or deliberately configure a
local Gemini credential and confirm the synthetic-data, model, quota, and
stop-rule boundary. Then run only the agreed synthetic scenarios:

- discover the current tool list;
- read next actions;
- add/update a member or income after visible confirmation;
- recover an unknown-person or stale-context failure;
- observe operation/activity/progress in the exact visible tab;
- verify text continuation after voice and optional spoken output;
- verify microphone cleanup and quota/error fallback;
- ask for submission/attestation and verify refusal/no tool.

If any live requirement fails, disable/cut voice and retain P0; do not weaken
the portal or local gates to save the feature.

## RED tests

- Local integration tests fail if text/voice diverge in tool surface, state,
  action ID, confirmation, activity, or visible UI.
- Failure tests fail if errors mutate state, leave media active, persist raw
  content, or make the portal unusable.
- Accessibility tests fail for any essential voice-only operation, missing
  text transcript/caption, keyboard trap, focus loss, reduced-motion defect, or
  responsive overflow.
- Live audit is NO-GO if exact source/deployment identity cannot be matched,
  tools are stale/missing, visible state is not updated, or submit/attest is
  reachable.

## GREEN implementation boundary

Local GREEN means all mocked integration/security/accessibility checks pass.
Live GREEN means a separately authorized bounded Gemini audit passes on the
exact deployment and records evidence. Neither gate authorizes commit, push,
deployment, or Devpost submission by itself.

## Verification commands

```bash
npm run test:unit -- --run src/ui/agent-companion/AssistantPanel.test.tsx tests/integration/assistant-phase5.test.tsx tests/integration/assistant-companion.test.tsx
npm run test:contract -- --run tests/contract/current-tool-surface.test.ts tests/contract/gemini-tool-bridge.test.ts tests/contract/gemini-session-api.test.ts
npm run test:e2e -- tests/e2e/assistant-text-voice.spec.ts tests/e2e/adversarial-accessibility.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/collaboration-feedback.spec.ts
npm run scan:secrets
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run verify
git diff --check
```

For the live packet, append exact date/timezone, model/route, deployment/source
identity, bounded scenario results, and failures; never include credentials or
raw transcripts/audio.

## Acceptance Criteria

- All local text/voice integration, privacy, cleanup, accessibility, mobile,
  reduced-motion, no-submit, and exact-visible-tab gates pass.
- A real live claim exists only if authorized and evidenced on the exact source
  and deployment.
- Voice can be disabled without affecting the P0 portal or ChatGPT tools.
- If live evidence is unavailable or fails, the recorded outcome is voice off,
  not a partial or unsupported public claim.

## Non-Goals

No unbounded live sessions, real user data, public voice default, automatic
retry/mutation, cross-tab sync, production SLA/security claim, commit, push,
deployment, or Devpost submission.

## Review Risks

- Live model behavior can differ from mocks; record concrete tool and DOM
  evidence instead of conversational claims.
- Free-tier usage can exhaust during retries; use a fixed budget and stop rule.
- Public URL can point to a different source than the tested checkout.
- A model may phrase refusal correctly while still exposing a submit function;
  inspect the actual function list and state/revision.

## External boundaries

The local implementation is authorized and complete over mocks. The real live
packet is still blocked until a local credential is deliberately configured and
the bounded synthetic audit is started. No deployment, hosting change, paid
fallback, external application mutation, or release action is authorized by
local tests.

## Phase 5 local Packets 5.1–5.2 evidence

On 2026-08-29, the user authorized Phase 5 local Packets 5.1 and 5.2 through
the same bounded OMP workflow used for the accepted prior phases. The accepted
repository was `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`,
branch `main`, at HEAD
`3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The worktree already contained
user-owned Phase 1–4 source, test, and ledger changes; those changes were
preserved and attribution was reviewed against the allowlist before and after
the handoff.

The route was:

```text
MODEL: google-antigravity/gemini-3.7-flash
REASONING: high
ROUTING RATIONALE: The user explicitly requested OMP Antigravity Gemini 3.7 Flash High, and `agy models` exposed `gemini-3.7-flash-high`.
ESCALATION CONDITION: Stop on baseline, allowlist, test-identity, provider, live-credential, hosting, deployment, or external-action mismatch; none occurred.
```

The RED gate ran
`npm run test:unit -- --run src/ui/agent-companion/AssistantPanel.test.tsx`:
20 tests were selected, with 19 passing and the new caption-announcement test
failing because the conversation log had no explicit `aria-live="polite"`.
The local mocked matrix was also run before handoff and passed after its
assertions were aligned with the existing recovery/result contracts.

The bounded implementation changed only the approved local packet paths:

- `src/ui/agent-companion/ConversationTimeline.tsx` now marks the visible
  conversation/caption log as `aria-live="polite"`.
- `src/ui/agent-companion/AssistantPanel.test.tsx` records the screen-reader
  caption contract.
- `tests/integration/assistant-phase5.test.tsx` exercises typed and
  voice-shaped mocked turns through the actual registry/current-surface/bridge
  stack, explicit confirmation, visible operation/activity and progress state,
  text correction, unknown-person recovery, stale contextual tools,
  no-submit/attestation exposure, revision fencing, and raw-retention safety.
- `tests/e2e/collaboration-feedback.spec.ts` extends the existing same-tab
  mutation/reload proof through the real submitted-demo reset confirmation and
  asserts that the retained activity key is removed.

The GREEN focused results were:

- 3 focused unit/integration files: 24 tests passed;
- current-tool-surface, Gemini bridge, and mocked session contracts: 29 tests
  passed;
- assistant, adversarial accessibility, reduced-motion, and same-tab E2E
  selection: 16 tests passed.

Independent aggregate verification then passed `npm run verify`: Prettier,
ESLint, the repository secret scan, both TypeScript projects, 43 unit files /
365 tests, 16 contract files / 128 tests, the production build, and all 35
Playwright tests. A separate `git diff --check` passed. The coordinator
independently inspected the actual diff/status and found no out-of-allowlist
Phase 5 change, no branch or HEAD drift, and no concrete stop-ship finding.

OMP evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260829-005721-36524`

This validates the local Packets 5.1–5.2 evidence over mocked components only.
It does not complete the real-provider portion of Gate E. No real Gemini
credential was available in the local environment, so no live session,
microphone hardware request, quota/cost experiment, deployment, hosting
change, commit, push, merge, release package, cross-tab synchronization, undo,
new WebMCP tool, or external action occurred. Cross-tab synchronization remains
explicitly unclaimed.

## Phase 5.3 local implementation evidence

On 2026-08-29, the user authorized the local environment implementation of
Packet 5.3. The accepted repository was
`/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`,
at HEAD `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The existing dirty worktree
from prior accepted phases was preserved; no commit, push, deployment, hosting
mutation, or external action was performed.

The OMP route for implementation and bounded corrections was:

```text
MODEL: google-antigravity/gemini-3.7-flash
REASONING: high
ROUTING RATIONALE: The user explicitly requested OMP Antigravity Gemini 3.7 Flash High for the local Phase 5.3 implementation.
ESCALATION CONDITION: Stop on baseline, allowlist, provider, credential, hosting, deployment, or external-action mismatch; none occurred.
```

The local implementation adds a server-only `GEMINI_API_KEY` broker at
`POST /api/gemini/session`, pinned to
`models/gemini-3.1-flash-live-preview`, the documented ephemeral-token
endpoint, a single-use token, a bounded issuance rate, local-origin and JSON
guards, safe errors, and no-store responses. The browser receives only the
short-lived token response and connects to the constrained Live WebSocket.
The companion is disabled in normal production builds and is available only
when the development flag is explicit; the visible `Live Voice Assistant`
switch starts and stops the session and media path. The WebMCP registry is
awaited before the socket setup snapshot, only the current non-submit tool
surface is mapped, and page-hide/unmount/error paths stop media and disconnect.

The RED→GREEN focused implementation gates were:

- RED: 5 focused files with 9 expected failures;
- GREEN: 5 focused files with 58 tests passed;
- focused UI/runtime/transport/browser-media unit selection: 51 tests passed;
- focused local-session/current-surface/bridge contract selection: 36 tests
  passed.

Independent aggregate verification then passed `npm run verify`: Prettier,
ESLint, the repository secret scan, both TypeScript projects, 46 unit files /
390 tests, 17 contract files / 135 tests, the production build, and all 35
Playwright tests. A separate explicit Live-flag mobile browser check passed,
and `git diff --check` passed. The production client bundle contained neither
`GEMINI_API_KEY` nor `x-goog-api-key`. Independent review inspected the actual
final diff/status, confirmed HEAD and branch stability, confirmed the UI switch
is disabled by default, and found no concrete stop-ship finding.

OMP evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260829-014824-40210`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260829-020540-41613`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260829-021651-42643`

## Phase 5.3 authorized live-attempt evidence, RCA, and handshake fix

On 2026-08-29 at approximately 04:09 Asia/Kolkata, the user-authorized local
attempt reached the session broker and upgraded the browser WebSocket for the
pinned `gemini-3.1-flash-live-preview` Live path. The provider closed the
socket before `setupComplete` with close code `1007` and `wasClean: true`. The
client had previously collapsed that event into `Assistant connection closed.`;
the bounded diagnostic classified it as `setup_rejected` / `setup_schema`.
Neither the credential nor the raw provider close reason was retained.

The independent Terra xhigh RCA identified the missing setup-acceptance
boundary and the likely browser/provider schema mismatch. The bounded fix now
waits for `setupComplete`, rejects pre-setup closes as sanitized protocol
errors, retains only phase/code/cleanliness/category metadata, converts
TypeBox literal unions to provider-compatible enums, and removes
`uniqueItems` from the provider-only schema copy while preserving local AJV
validation. The focused Live/client/runtime/controller/UI selection passes 65
tests; aggregate verification with the Live flag explicitly off passes 395
unit tests, 135 contract tests, the build, and all 35 Playwright tests.

The browser safety boundary initially blocked the post-fix retry because the
setup frame contains CivicFlow's internal tool schemas and system instruction.
After the user explicitly approved that destination, bounded retries at
approximately 04:23–04:27 Asia/Kolkata used the normalized seven-tool frame
(1,705 bytes). The browser still reported a transport error before
`setupComplete`; this was later shown to be CivicFlow dropping a valid binary
`Blob` response, not a provider rejection.

The RCA was confirmed with bounded no-audio probes through the existing local
token broker. Model-only setup was rejected because it omitted the audio
modality, while the audio setup, system instruction, transcriptions, both tool
schema encodings, and the exact normalized seven-tool setup all returned
`setupComplete` as a `Blob`. The provider therefore accepted the token, pinned
model, setup configuration, and complete tool surface.

The RED test reproduced the browser wrapper failure by delivering a
`Blob`-typed `setupComplete` before the client listener was attached and timed
out. The GREEN fix decodes `Blob` frames with `text()`, preserves string and
`ArrayBuffer` handling, serializes inbound frame delivery, and buffers frames
that arrive before listeners attach. The repaired browser path then reached
`Connected` with the text composer enabled on the exact localhost app; the
verification-only session was closed afterward. No microphone permission,
audio input, CivicFlow tool action, commit, push, deployment, or external
mutation occurred.

The post-fix focused selection passes 67 tests; aggregate verification with the
Live flag explicitly off passes 397 unit tests, 135 contract tests, the build,
and all 35 Playwright tests. Gate E therefore remains unclaimed for the full
voice/tool audit: microphone behavior, live function execution/confirmation,
free-tier quota behavior, and hosted deployment compatibility are still not
validated.
