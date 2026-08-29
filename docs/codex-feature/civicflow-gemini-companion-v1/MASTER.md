# CivicFlow Gemini Live companion v1 — master ledger

## Ledger metadata

- **Feature:** CivicFlow Gemini Live text and voice companion
- **Version:** v1
- **Status:** `in-progress` through accepted local Phase 5 Packets 5.1–5.3 over the mocked Gemini runtime; the real Packet 5.3 provider audit and Phases 6–8 remain pending a configured local credential or separate decision
- **Planning owner:** the coordinating Codex task; implementation ownership is assigned only by a phase-specific handoff
- **Implementation routes:** native `luna_max` (`gpt-5.6-luna`, `max` reasoning) for the Phase 0 documentation packet; OMP Antigravity Gemini 3.7 Flash at `high` reasoning for the separately authorized Phase 1, Phase 2, Phase 3, Phase 4, and local Phase 5 implementations
- **Last updated:** 2026-08-29
- **Repository:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`
- **Parent ledgers:** [CivicFlow WebMCP v1](../civicflow-webmcp-v1/MASTER.md) and [CivicFlow visible collaboration UX v1](../civicflow-collaboration-ux-v1/MASTER.md)
- **Public baseline URL:** `https://civicflow.codesm.chatgpt.site`

This is the durable source of truth for the optional Gemini companion. It does
not by itself authorize production implementation, secret access, a real Gemini
call, commit, push, deployment, Site mutation, or Devpost mutation. Phase 0 was
documentation-only; Phase 1 feedback/retention polish, Phase 2's
provider-neutral current-tool-surface/function bridge, Phase 3's mocked runtime,
Phase 4's unified accessible companion, and Phase 5's local Packets 5.1–5.2
were separately authorized and independently accepted for their bounded
local/mock contracts. Packet 5.3 and later phases require separate,
phase-specific prompts and independent review.

The parent WebMCP ledger remains authoritative for the current CivicFlow
application, WebMCP tools, Sites behavior, live-tool evidence, and release
boundaries. The collaboration UX ledger and its 2026-08-28 review are
historical evidence for already-completed local UI work; this child ledger
consumes those accepted contracts and does not reimplement them. Neither parent
ledger is evidence that the Gemini companion has been live-validated.

## Purpose

CivicFlow is a synthetic public-benefits application demo. The existing human
portal and ChatGPT Site Tools operate one visible application state. This child
ledger plans an optional embedded assistant that accepts either typed or spoken
input, uses Gemini Live for the conversation, and reaches application changes
only through the page's currently registered WebMCP tools. The ordinary portal
and ChatGPT Site Tools must remain useful when the companion is disabled,
unsupported, over quota, or disconnected.

The companion is an accessibility and interaction enhancement, not a benefits
decision engine, government service, general chatbot, voice SDK, or replacement
for keyboard and screen-reader access.

## Source inventory and evidence

| Source                                                                                                                                              | Role and evidence                                                                                                                      | Handling                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [CivicFlow product brief](/Users/SubhavMathur/.codex/attachments/4345a0cd-6382-4419-8f19-e24f7858a5b2/pasted-text.txt)                              | Defines the six-section synthetic flow, dynamic WebMCP tools, shared visible state, and human-only submission boundary.                | Read-only product authority.                                                       |
| [Approved implementation plan](/Users/SubhavMathur/.codex/.chatgpt-projects/g-p-6a8f4e433074819184bcac6f1ff0e3d3/CIVICFLOW_IMPLEMENTATION_PLAN.md)  | Reconciles product scope, state, WebMCP contracts, Sites sequencing, tests, and release gates.                                         | Read-only planning source; recheck against the repository.                         |
| [Phase 1 Sites-first prompt](/Users/SubhavMathur/.codex/attachments/cc4456fa-b3dc-46a5-b8f7-3dc8b5a226e0/pasted-text.txt)                           | Records the single-writer Sites route and local/public boundaries.                                                                     | Read-only dispatch history.                                                        |
| [Parent WebMCP ledger](../civicflow-webmcp-v1/MASTER.md)                                                                                            | Owns the application, WebMCP, Sites, live-tool, voice-history, and release invariants.                                                 | Link and reconcile; do not erase history.                                          |
| [Parent WebMCP voice phase](../civicflow-webmcp-v1/phases/05-optional-voice.md)                                                                     | Earlier OpenAI Realtime/WebRTC design and gates.                                                                                       | Preserve as superseded history; Gemini is the current provider decision.           |
| [Collaboration UX ledger](../civicflow-collaboration-ux-v1/MASTER.md)                                                                               | Owns operation feedback, activity, progress, guidance, mobile, onboarding, and document-readiness contracts.                           | Reuse accepted UX surfaces; do not duplicate them.                                 |
| [Collaboration UX review](../civicflow-collaboration-ux-v1/reviews/2026-08-28-phase-1-6-code-review.md)                                             | Records MSW findings, remediation, accepted local cut, and non-blocking limitations.                                                   | Evidence, not an implementation authorization.                                     |
| Current CivicFlow repository                                                                                                                        | React/Vite/TypeScript application, central store/commands, ten current WebMCP tools, activity/progress UI, tests, and Sites packaging. | Source of truth for actual paths and current behavior.                             |
| [Gemini Live API documentation](https://ai.google.dev/gemini-api/docs/live-api) and [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) | Required implementation-time authority for transport, ephemeral credentials, model IDs, quotas, and free-tier terms.                   | Reverify immediately before runtime work; links do not prove current availability. |

Evidence precedence is: current user decision; current repository and test
results; attached product brief; current official Google and WebMCP
documentation; accepted parent ledgers; then this child plan. A new provider,
direct command path, persistence model, or submission capability requires a
decision before edits.

## Current baseline and observed evidence

The independent Phase 0 review preflight on 2026-08-28 verified:

- branch: `main`;
- HEAD: `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`;
- recorded starting HEAD matched the current HEAD;
- no staged changes;
- the working tree intentionally contained eight modified tracked
  documentation files and twelve untracked child-ledger documentation files;
  every dirty path was within the expected documentation allowlist;
- `git diff --stat` reported 8 tracked documentation files, 161 insertions,
  and 59 deletions; the untracked child-ledger files were reviewed as
  documentation-only;
- no repository-local `AGENTS.md` was present;
- the current project uses `npm run verify`, which includes format, lint,
  secret scan, typecheck, unit, contract, build, and Playwright gates.

No source, test, configuration, dependency, lockfile, secret, deployment, or
generated-artifact path was dirty at preflight.

The coordinating task's last accepted aggregate evidence was 270 unit tests,
90 contract/integration tests, 32 Playwright tests, a passing build, format,
lint, secret scan, and typecheck. Those counts are historical evidence and
must be rerun before a phase is accepted; this documentation task does not
reclassify them as a new implementation result.

The following live observations are recorded as partial evidence, not as a
formal E1–E8 or Packet 6.4 acceptance:

1. In a newly opened single visible CivicFlow tab, Site Tools added Subhav
   Mathur, age 27, relationship spouse, applying for coverage; revision moved
   from 0 to 1 and the visible card/activity updated.
2. Site Tools added Optum income for Subhav at `$1,000` monthly; revision moved
   from 1 to 2, progress showed 60%, and the visible card/activity updated.
3. Site Tools set `No current coverage` for Maya Carter and Subhav Mathur;
   revision moved from 2 to 3.
4. Human UI attached the synthetic `Acme Dental` proof-of-income preset on
   Documents; revision moved from 3 to 4. No document-mutation Site Tool
   exists.
5. Site Tools navigated to Review & Sign; the application showed 85% with
   attestation remaining. Attestation and submission were not exposed as
   tools. The user's later report that the final human step succeeded is
   user-reported, not independently observed by this ledger task.

An earlier no-visible-update observation was traced to Site Tools being
controlled in a different CivicFlow tab than the tab the user watched. The
subsequent same-tab run behaved correctly. Cross-tab synchronization is a
documented hackathon non-goal; exact same-tab visible behavior remains a
required automated test.

Do not claim that these observations complete the formal parent E1–E8 or
Packet 6.4 gate. Reconcile exact deployment/source identity before any public
claim.

## Product scope

### Included

- One assistant panel with text and push-to-talk voice input.
- One Gemini Live conversation session shared by typed and spoken turns.
- Visible user transcript, assistant text, optional spoken output, operation
  status, confirmation cards, and action history.
- Current WebMCP tool discovery and execution through a provider-neutral bridge.
- Friendly operation labels, real lifecycle feedback, recent-effect highlighting,
  accessible toasts, and same-tab refresh retention from the collaboration UX
  ledger.
- Explicit confirmation for application mutations.
- Deterministic read-current-section and repeat/slower-speech affordances.
- Graceful text-only and normal-portal fallback.
- Local mocks/fakes and a separately authorized bounded live Gemini audit.

### Explicitly excluded

- Eligibility, plan selection, benefit decisions, or government integrations.
- Real personal, medical, identity, financial, or document data.
- Real file bytes, OCR, document classification, uploads, or remote application
  persistence.
- Any `submit`, `attest`, `submit_application`, or equivalent function/tool.
- Direct imports of application commands or the Zustand store from assistant
  code.
- A generic natural-language execution endpoint, browser automation, or
  multi-operation plan/apply transaction.
- Always-on listening, background recording, or voice-only access to a feature.
- Cross-tab synchronization, accounts, analytics, telemetry, or a database.
- A production security, privacy, availability, or compliance claim.
- Human-only undo from the collaboration ledger; it remains deferred.

## Architecture decision

The human UI, ChatGPT Site Tools, and Gemini companion converge on the same
current WebMCP registration and handler boundary:

```text
typed text / microphone
          │
          ▼
  Gemini Live session ──> CurrentToolSurface ──> WebMCP handlers
          │                                      │
          │                                      ▼
          └──── transcript/status/activity <─ application commands/store
                                                   │
                                                   ▼
                                            visible CivicFlow UI

human controls ────────────────────────────────┘
ChatGPT Site Tools ────────────────────────────┘
```

The application state remains authoritative. The assistant can discover and
execute only the current registered WebMCP tools. It never imports
`src/application/commands`, reads the store, creates a parallel mutation, or
infers a tool from prose. A mutation must be confirmed visibly before the tool
call. Reads and section navigation may execute without mutation confirmation.
Attestation and submission remain human-only controls.

## Gemini provider decision

The user selected Gemini Live based on the reported availability of a free tier
for a bounded hackathon experiment. This is a user-reported planning rationale,
not a current provider-availability claim. It replaces the earlier OpenAI
Realtime runtime plan for new implementation work. The OpenAI plan remains in the
parent voice phase as superseded history and must not be silently rewritten as
Gemini evidence.

The initial candidate model was
`gemini-2.5-flash-native-audio-preview-12-2025`. It is retained as historical
planning context, not current runtime evidence.

On 2026-08-28, the Phase 3 documentation preflight verified from current
official Google sources that the exact implementation-time model identifier is
`gemini-3.1-flash-live-preview`, that Gemini Live is Preview, and that the
documented transport is stateful bidirectional WebSockets with text, PCM audio,
transcripts, and synchronous function calling. The same preflight verified the
documented backend-issued ephemeral-token path and the current free-tier/data-
use caveat. These are documentation facts, not a live call, quota result, or
availability claim.

The same-date Sites preflight found official platform documentation for
HTTP/HTTPS/WebSockets and Site-configured secrets. That makes a secure adapter
plausible, but the local static asset worker was not wired or deployed, so
actual hosted session compatibility remains unresolved until the later live
gate.

Google's free-tier terms may allow content to be used to improve Google
products. CivicFlow therefore has a mandatory synthetic-only boundary and must
show a concise warning before a real session. No real user data may be sent to
Gemini.

## Service and module boundaries

| Boundary                             | Owns                                                                                        | Must not own                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/application`                    | Existing validated state, commands, persistence, operation/activity feedback                | Gemini transport, audio, tool declarations, UI-specific provider logic |
| `src/webmcp`                         | Current registration, schemas, handlers, compact results, lifecycle                         | Gemini credentials, model prompts, direct UI mutation                  |
| `src/assistant`                      | Provider-neutral tool surface, function mapping, confirmation policy, session orchestration | Commands, Zustand store, a second mutation API                         |
| `src/assistant/gemini-*`             | Gemini Live protocol adapter and typed session events                                       | Client-controlled model/tools/instructions or secret values            |
| `server`/Sites adapter               | Short-lived session/credential boundary if current official route and hosting support it    | Application data persistence, raw transcript/audio logging             |
| `src/ui/agent-companion`             | Text/voice controls, transcript, confirmation, status, history presentation                 | Tool semantics, credentials, hidden actions                            |
| `src/ui/feedback`, `src/ui/progress` | Existing collaboration feedback and progress presentation                                   | Provider-specific calls or fake latency                                |

`App.tsx` remains orchestration-only. Domain modules remain browser/provider
free. The first implementation may add focused `src/assistant` files, but it
must reuse the accepted activity/progress surfaces instead of replacing them.

## Canonical contracts

### Current WebMCP surface

```ts
interface CurrentToolSurface {
  snapshot(signal?: AbortSignal): Promise<RegisteredToolRef[]>;
  execute(
    name: string,
    argumentsJson: string,
    signal?: AbortSignal,
  ): Promise<string>;
  subscribe(listener: () => void): () => void;
}
```

`snapshot` reflects the current ten registered tools. `execute` refreshes and
validates against the current registration, serializes conflicting mutations,
and returns the exact compact WebMCP result string. Invalid JSON, missing
tools, stale contextual tools, and aborts become bounded safe errors. The
surface never exposes submission or attestation.

### Gemini function mapping

```ts
interface ProviderFunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ToolCall {
  callId: string;
  name: string;
  argumentsJson: string;
}
```

Definitions copy exact registered names, descriptions, and JSON Schemas into
the provider adapter. Function arguments are parsed once at the bridge
boundary. The unchanged WebMCP result is returned as the function response.
No provider declaration may add a synthetic submit/attestation function.

### Confirmation policy

```ts
type ToolIntent = 'read' | 'navigate' | 'mutate' | 'forbidden';

interface ConfirmationRequest {
  actionId: string;
  toolName: string;
  plainLanguageSummary: string;
  affectedSection: string;
  affectedEntities: readonly string[];
}
```

Read/navigation calls can proceed after normal assistant checks. Mutations
produce a visible `Confirm`/`Cancel` card and only the explicit confirm action
executes the current WebMCP tool. Silence, transcript completion, or spoken
affirmation must not be treated as confirmation. Submission/attestation is
forbidden even if requested in text or voice.

### Assistant session

The exact Gemini Live event and transport types remain an implementation-time
adapter decision after official-documentation and Sites-hosting verification.
The stable internal lifecycle is:

```text
idle → connecting → listening/thinking → confirming → applying → speaking/idle
                         │                  │
                         └──── error ◄─────┘
```

Every terminal state stops microphone tracks, removes listeners, cancels stale
tool calls, and leaves the portal usable. Text input must work when microphone
permission is denied or Gemini is unavailable.

### Activity and privacy contract

The companion consumes the collaboration ledger's `ActivityEntry` and
`OperationState`. Only sanitized summaries may be retained in same-tab
`sessionStorage`. Never persist raw prompts, tool arguments, transcripts,
audio, SDP/session payloads, API keys, or full application snapshots. Corrupt or
oversized retained activity is discarded safely; reset clears it. Cross-tab
sync is not part of this hackathon.

## Phase map

| Phase                                         | Ledger document                                                                               | Status        | Dependency                                       | Exit gate                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------ | --------------------------------------------------------- |
| 0 — baseline and live-evidence/source closure | [01-baseline-and-live-evidence.md](phases/01-baseline-and-live-evidence.md)                   | `validated`   | recorded HEAD and allowlisted docs-only baseline | Phase 0 evidence and parent-link review                   |
| 1 — agent feedback and notification polish    | [02-agent-feedback-polish.md](phases/02-agent-feedback-polish.md)                             | `validated`   | accepted Phase 0                                 | Feedback Gate A: visible, truthful same-tab activity      |
| 2 — current tool surface and Gemini bridge    | [03-current-tool-and-gemini-bridge.md](phases/03-current-tool-and-gemini-bridge.md)           | `validated`   | Feedback Gate A                                  | Bridge Gate B: exact current-tool mapping                 |
| 3 — secure Gemini Live runtime                | [04-secure-gemini-live-runtime.md](phases/04-secure-gemini-live-runtime.md)                   | `validated`   | Bridge Gate B and docs verification              | Runtime Gate C: mocked secure lifecycle                   |
| 4 — unified voice/text companion              | [05-unified-voice-text-companion.md](phases/05-unified-voice-text-companion.md)               | `validated`   | Runtime Gate C                                   | Companion Gate D: accessible shared session UI            |
| 5 — integration, accessibility, and live gate | [06-integration-accessibility-live-gate.md](phases/06-integration-accessibility-live-gate.md) | `in-progress` | Companion Gate D                                 | Gate E: local proof plus separately authorized live audit |
| 6 — release package                           | [07-release-package.md](phases/07-release-package.md)                                         | `planned`     | P0 and explicit voice include/cut decision       | Package Gate F: reproducible truthful artifacts           |
| 7 — final release gate                        | [08-final-release-gate.md](phases/08-final-release-gate.md)                                   | `planned`     | Package Gate F and external approvals            | Gate G: exact-source independent GO                       |

Phase 0 was the documentation-only first handoff. Its documentation/source
identity closure is validated. Phase 1 was later authorized through a separate
user prompt and is independently accepted for local feedback, progress,
notification, and sanitized same-tab activity retention. Phase 2 was then
separately authorized and is independently accepted for the provider-neutral
current WebMCP surface, exact function mapping, result round-trip, and
confirmation policy. Phase 3 was subsequently authorized and is independently
accepted for the mocked secure session boundary and lifecycle only. Phase 4 was
then separately authorized and is independently accepted for the accessible
shared text/voice companion UI, controller lifecycle integration, explicit
confirmation surface, local read guidance, responsive theme, and text-only
fallback over the mocked runtime. Phase 5 local Packets 5.1–5.2 are now
independently accepted for mocked integration, accessibility, privacy, and
exact-visible-tab evidence; Packet 5.3 remains pending separate live
authorization, and Phases 6–8 remain planned.

## Phase 1 implementation evidence

On 2026-08-28, the user separately authorized Phase 1 Packets 1.1–1.3 against
`main` at `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The bounded OMP route used
`google-antigravity/gemini-3.7-flash` with `high` reasoning. The dispatch record
required the exact model/effort, a bounded presentation/retention rationale,
and escalation on any scope, baseline, test-identity, or provider mismatch;
the wrapper evidence and each correction run remained on that route. No paid
Merge route, commit, push, deploy, live call, or external action occurred.

The implementation adds friendly current-tool labels, truthful validating /
applying / succeeded / failed presentation, an accessible non-blocking change
toast, action-correlated affected-entity details, and sanitized same-tab
`sessionStorage` retention capped at 20 entries and 32 KiB. It preserves the
existing ten-tool surface, command/store contracts, no-submit boundary, and
cross-tab exclusion. Production timing uses the WebMCP lifecycle's real browser
presentation boundary; the test fixture keeps its delay after tool execution.

The coordinator independently reviewed the actual diff and worktree after the
OMP runs, removed an initial production test hook and artificial timing path,
restored the exact delayed browser assertion, and reran the required focused,
integration, persistence, type, format, lint, secret, build, aggregate, and
browser gates. The OMP run evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-182848-96586`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-184539-99763`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-192244-5389`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-192959-6609`

## Phase 2 implementation evidence

On 2026-08-28, the user authorized Phase 2 Packets 2.1–2.3 against `main` at
`3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The bounded OMP route used
`google-antigravity/gemini-3.7-flash` with `high` reasoning, exactly matching
the user's requested Gemini 3.7 Flash High route. No provider fallback, paid
Merge route, commit, push, deploy, credential access, live call, or external
action occurred.

The provider-neutral implementation is limited to the five `src/assistant`
files and three Phase 2 contract files. Initial RED collected 22 tests with
19 failures and 3 passes; the first GREEN passed all 22. Independent review
reproduced four concrete policy/error-boundary defects, the same route
corrected them, and the correction RED/GREEN closed at 4 failures/18 passes
then 22 passes. The accepted boundary snapshots and subscribes to the
existing WebMCP port, refreshes contextual registrations before execution,
serializes mutations while keeping reads unblocked, honors abort, maps exact
schemas, round-trips unchanged results, requires explicit mutation
confirmation, denies submit/attest variants, and sanitizes upstream errors.

Independent preservation and aggregate evidence passed: 25 WebMCP contract
guard tests, 22 lifecycle unit guard tests, 36 unit files/301 tests, 13
contract files/112 tests, 33 Playwright tests, typecheck, lint, formatting,
secret scan, and production build. The actual diff review found no scope
deviation and no forbidden assistant dependency. OMP evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-202027-13812`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-202904-14784`

## Phase 3 implementation evidence

On 2026-08-28, the user authorized Phase 3 Packets 3.1–3.3 against `main` at
`3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The OMP route used
`google-antigravity/gemini-3.7-flash` with `high` reasoning. The initial direct
Sonnet route was not used for acceptance after an authentication failure; the
user then explicitly selected Gemini 3.7 Flash High and the standard wrapper
completed the implementation. No provider fallback, paid Merge route, commit,
push, deploy, credential access, live call, or external action occurred.

The implementation is limited to the three `src/assistant` runtime seams, two
`server` seams, and three focused test files recorded in the Phase 3 document.
Initial RED was 10 contract failures plus 16 lifecycle failures. Independent
review added concrete assertions for body/media bounds, stale socket and audio
cleanup, connection-error sanitization, cross-event bridge serialization,
stale tool results, pending connects, and duplicate terminal events. The final
focused GREEN was 12/12 contract tests and 25/25 lifecycle tests.

Independent aggregate evidence passed: format, lint, secret scan, TypeScript,
338 unit tests, 124 contract tests, production build, and 33 Playwright tests.
The local server seams also passed a direct TypeScript check. This is mocked
Runtime Gate C evidence only: no real Gemini session, microphone, credential,
Site save, deployment, or production availability was tested. OMP evidence is
retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-211918-18182`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-212647-18951`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-213332-19880`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-213930-20496`

The coordinator independently reviewed the actual diff/status and found no
remaining Phase 3 stop-ship issue after closing the reproduced race, cleanup,
boundary, and secret-policy findings.

## Phase 4 implementation evidence

On 2026-08-28, the user separately authorized Phase 4 Packets 4.1–4.3 against
`main` at `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The bounded OMP route used
`google-antigravity/gemini-3.7-flash` with `high` reasoning for the initial
implementation and each correction. The dispatch rationale was the user's
explicit Gemini 3.7 Flash High request; every handoff required escalation on
scope, baseline, security-boundary, or provider mismatch. No paid Merge route,
provider fallback, commit, push, deploy, credential access, live Gemini call,
or external action occurred.

The implementation extends the existing Agent Companion with one themed,
accessible panel for shared text and voice turns. It integrates the accepted
Phase 3 controller, renders user/model interim and final captions, exposes
listening/thinking/confirming/applying/speaking/error states, keeps explicit
mutation confirmation reachable, provides read-current-section guidance,
optional speech with repeat/slower controls, microphone cleanup, a text-only
fallback, unique input IDs, and local clear-conversation history. The clear
control cancels local speech and local history only; it does not disconnect the
controller, touch the application store, call a WebMCP tool, or hide a pending
confirmation. The UI uses the existing CivicFlow soft light/teal surfaces,
focus treatment, responsive wrapping, and reduced-motion rules. No current
WebMCP catalog, application schema, submission/attestation boundary, provider
credential path, or hosting path changed.

The initial RED exposed missing panel/controller seams. Independent review then
added assertions for model transcripts, confirmation state, applying state,
connection gating, unique IDs, microphone cleanup, serialized confirmation
queue behavior, and clear-conversation safety. The final independent focused
GREEN passed 22 unit tests across the panel/controller suites, 2 companion
contract tests, and 2 assistant E2E tests. Local Playwright desktop/mobile
visual inspection confirmed the panel remains within the existing theme and
narrow layout without horizontal overflow. Independent aggregate verification
then passed format check, lint, secret scan, both TypeScript project checks,
42 unit files/362 tests, 15 contract files/126 tests, production build, and all
35 Playwright tests. A separate final `git diff --check` and scoped assistant
security/import scan were also clean.

OMP evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-221855-24148`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-223210-26372`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-224949-28377`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-225923-29852`

This is Companion Gate D evidence over the mocked Runtime Gate C only. It does
not authorize a real Gemini session, provider credentials, microphone hardware,
hosting, deployment, live audit, release packaging, undo, cross-tab sync, new
WebMCP tools, or external action. Phase 5 remains the planned owner of the
local integration/accessibility/live-gate decision.

## Dependency and integration order

```text
Phase 0 source/evidence closure
  → Phase 1 activity/progress/notification polish
  → Phase 2 current WebMCP surface and Gemini function bridge
  → Phase 3 secure Gemini Live session boundary
  → Phase 4 unified accessible text/voice companion
  → Phase 5 local integration and separately authorized live audit
  → Phase 6 README/license/diagram/demo package
  → Phase 7 independent final gate and separately authorized release actions
```

One writer owns a packet. Shared files (`store.ts`, `App.tsx`, `styles.css`,
WebMCP catalog/results, and companion shell) cannot have concurrent writers.
Each packet must complete RED, GREEN, typecheck, focused verification, actual
diff review, and independent acceptance before a dependent packet begins.

## Security and accessibility gates

- No standard Gemini API key in browser JavaScript, built assets, logs, tests,
  network-visible client configuration, or repository files.
- Provider/model/instructions/tools are server-controlled where a server route
  is required; the client cannot select them.
- Session endpoint is disabled by default, same-origin/expected-origin
  checked, bounded, rate-limited, no-store, and free of raw media/transcript
  logging.
- Microphone access begins only after an explicit click. Tracks stop on stop,
  disconnect, error, page hide, and component unmount.
- Typed interaction, keyboard navigation, screen-reader labels/live regions,
  visible transcript/captions, high contrast, 200% zoom, large targets, and
  reduced-motion behavior remain available.
- No feature is available exclusively through speech.
- Mutations have plain-language confirmation and visible operation status.
- The portal works without Gemini, without microphone permission, and after
  quota/network failures.
- Live voice is shipped only after the bounded authorized audit; otherwise it
  is disabled and the proven P0 path ships.

## Testing strategy and exact gates

Every implementation packet uses RED → GREEN → bounded refactor → focused
tests → `npm run typecheck` → independent diff review. No fake command delay,
skipped assertion, weakened test, snapshot-only proof, or `--passWithNoTests`.

Existing repository scripts are:

```bash
npm ci
npm run format:check
npm run lint
npm run scan:secrets
npm run typecheck
npm run test:unit
npm run test:contract
npm run build
npm run test:e2e
npm run verify
git diff --check
```

Runtime work uses mocks/fakes until the separately authorized live audit.
`npm run verify` is a gate only when its actual output is captured. A local
mock cannot be presented as Gemini Live evidence.

## Release cuts

- **P0:** current human portal, collaboration polish, and WebMCP tools. It is
  always shippable without Gemini.
- **P0 + companion:** local bridge/runtime/UI gates pass, the live audit is
  separately authorized and successful, and the feature can be disabled
  without changing P0.
- **Fallback cut:** if model, quota, hosting, security, accessibility, or
  schedule gates fail, disable Gemini and release P0 with truthful limitations.

## Open decisions

| Decision                                   | Current position                                                                                                                     | Resolution gate         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Exact Gemini Live model ID                 | `gemini-3.1-flash-live-preview` verified in official docs on 2026-08-28; Preview and live availability still require recheck         | Phase 5 live gate       |
| Gemini transport and credential boundary   | Official docs verify stateful WebSockets and backend-issued ephemeral tokens; no real connection was made                            | Phase 5 live gate       |
| Exact hosting support for a session broker | Sites docs describe HTTP/HTTPS/WebSockets and hosted secrets; local adapter is not wired or deployed, so compatibility is unresolved | Phase 5 live gate       |
| Free-tier quota/retention terms            | Current pricing/free-tier data-use caveat recorded; exact quota, rates, regional availability, and live terms require recheck        | Phase 5 live gate       |
| Voice in final public demo                 | Off unless Gate E is green and separately authorized                                                                                 | Phase 5 live gate       |
| License                                    | Parent release plan says MIT unless owner chooses another                                                                            | Phase 6 package         |
| Cross-tab synchronization                  | Explicitly out of hackathon scope                                                                                                    | No later than release   |
| Undo                                       | Explicitly deferred from collaboration UX path                                                                                       | Not part of this ledger |

If any open decision conflicts with the one-state, one-WebMCP-surface,
synthetic-only, or human-only-submission invariant, stop and request a user
decision.

## Required handoff and evidence format

Every later phase prompt must include the exact baseline branch/HEAD/status,
MODEL, REASONING, routing rationale, escalation condition, packet allowlist,
RED/GREEN commands, aggregate gate, no-commit/no-push/no-deploy/no-live-call/
no-secret boundaries, and an independent review checklist. The first file
[antigravity-first-implementation.md](antigravity-first-implementation.md) is
retained as the standard handoff filename, but its current content is strictly
Phase 0 and must not authorize Phase 1 or Phase 2 implementation.

## Full-feature acceptance

The companion is accepted only if the normal portal remains fully usable; text
and voice share one Gemini Live session; all mutations use current WebMCP
tools; operation/activity/progress feedback is visible and attributable;
keyboard/screen-reader/text-only/reduced-motion paths remain complete; no
secret, raw media, transcript, direct command, submission, or attestation path
exists; local security/accessibility/integration gates pass; the bounded live
Gemini audit is separately authorized and evidence-backed; release artifacts
map claims to evidence; and an independent reviewer accepts the exact source
and deployment. If any optional condition fails, voice is disabled and P0 is
the accepted outcome.
