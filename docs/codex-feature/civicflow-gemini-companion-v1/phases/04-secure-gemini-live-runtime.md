# Phase 3 — secure Gemini Live runtime

## Status

`validated`. Entry required Bridge Gate B. The exact Gemini Live model,
credential mechanism, and Sites hosting compatibility are recorded below from
the implementation-time preflight; no live provider or deployment claim is
made.

## Evidence record

Attempt date and timezone: 2026-08-28, Asia/Kolkata.

Exact baseline repository, branch, and HEAD: `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, `main`, `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`.

Baseline status and user-owned changes: the worktree was intentionally dirty
from the accepted Phase 1/2 implementation and documentation work. It had no
staged changes. All pre-existing modified and untracked paths were preserved;
the Phase 3 implementation added only the allowlisted assistant, server, and
focused-test paths below.

MODEL: `google-antigravity/gemini-3.7-flash` (OMP; CLI alias
`gemini-3.7-flash-high`).

REASONING: `high`.

ROUTING RATIONALE: The user explicitly selected the standard Antigravity
Gemini 3.7 Flash High route for this cross-file secure-runtime phase, and the
bounded packets had observable mocked acceptance tests.

ESCALATION CONDITION: stop on model/provider mismatch, quota/auth/network or
timeout failure, a required secret/live call, an invariant conflict, or any
edit/action outside the packet allowlist; no such condition remained after
the final correction.

Packet and exact allowed files:

- Packet 3.1 documentation/hosting preflight, recorded here and in the master
  ledger; no external mutation.
- Packets 3.2–3.3: `src/assistant/session-state.ts`,
  `src/assistant/gemini-live-client.ts`,
  `src/assistant/assistant-controller.ts`,
  `server/gemini-session-core.ts`,
  `server/sites-gemini-session-adapter.ts`,
  `tests/contract/gemini-session-api.test.ts`,
  `tests/unit/gemini-live-client.test.ts`, and
  `tests/unit/assistant-controller.test.ts`.

RED evidence:

- Initial RED: 10 contract tests and 16 lifecycle tests failed at the
  intentional Phase 3 seams.
- Independent correction RED: 12 contract tests had 2 failures and 22
  lifecycle tests had 7 failures for body/media validation, stale sockets,
  stale microphone audio, cross-event call ordering, error sanitization, and
  provider cleanup.
- Final correction RED: 25 lifecycle tests had 1 failure for duplicate
  terminal transport events.

GREEN implementation summary: the session core is disabled by default,
same-origin and method/media/body bounded, no-store, rate-limited, and passes
only fixed server-owned model/instructions/tools to an injected ephemeral
issuer. The Live client uses the documented JSON event shapes, short-lived
credential seam, exact function-call IDs, sanitized errors, and generation-safe
socket teardown. The controller requires explicit microphone activation,
cleans tracks/listeners/output on terminal paths, serializes current-session
bridge calls, and drops stale results without importing application state.

Official-doc fact, 2026-08-28: Google's [Gemini Live API documentation](https://ai.google.dev/gemini-api/docs/live-api) identifies Live as Preview and documents bidirectional WebSockets, text, PCM audio, transcripts, and tool use. The [ephemeral-token documentation](https://ai.google.dev/gemini-api/docs/ephemeral-tokens) documents backend-issued short-lived Live credentials. The [Live tools documentation](https://ai.google.dev/gemini-api/docs/live-tools) documents synchronous function calling. The [pricing documentation](https://ai.google.dev/gemini-api/docs/pricing) records the current free-tier/data-use caveat. The exact model recorded by the official model/pricing pages is `gemini-3.1-flash-live-preview`.

Hosting fact and inference: official [ChatGPT Sites documentation](https://learn.chatgpt.com/docs/sites) describes HTTP, HTTPS, WebSockets, and Site-configured secrets. This supports the secure shape in principle. The local CivicFlow artifact still generates a static asset worker, so the Phase 3 Sites adapter is testable but not wired into that worker or deployed; hosted compatibility remains unverified.

Focused results: `npm run test:contract -- --run tests/contract/gemini-session-api.test.ts` — 1 file, 12 tests passed; `npm run test:unit -- --run tests/unit/gemini-live-client.test.ts tests/unit/assistant-controller.test.ts` — 2 files, 25 tests passed.

Aggregate results: `npm run verify` passed formatting, lint, secret scan,
TypeScript, 338 unit tests, 124 contract tests, build, and 33 Playwright E2E
tests. The new server files also passed a direct TypeScript check because the
existing project node tsconfig does not include `server/`.

Actual changed Phase 3 files and diff/status review: the five production seams
and three focused suites listed in the packet were reviewed after the worker
and correction runs. HEAD and branch were unchanged, no changes were staged,
`git diff --check` passed, and no forbidden application/store, direct
`document.modelContext`, credential, logging, generated-worker, hosting,
deployment, or external-action change was found.

Independent reviewer and findings: coordinating Codex review reproduced and
closed the concrete body/media, stale socket, stale audio, raw error,
cross-event tool-serialization, stale tool-result, and duplicate terminal
cleanup findings. Final review found no remaining stop-ship issue within the
mocked Phase 3 boundary.

Status decision: `validated` for the local mocked Runtime Gate C only.

Risks, assumptions, and unresolved decisions: no real Gemini call, credential,
microphone, Site save, deployment, or public-availability result was tested.
The Preview model, free-tier terms, quotas, regional availability, and actual
hosted session compatibility require recheck before the separately authorized
live gate.

## Goal

Provide a bounded, provider-configured Gemini Live session that supports text,
audio, transcripts, and function calls without exposing a standard Gemini API
key or compromising the normal CivicFlow portal.

## Problem Evidence

- The superseded parent design assumes an OpenAI WebRTC/SDP broker; that
  transport cannot be carried forward as a Gemini implementation assumption.
- Gemini Live preview model IDs, free-tier quotas, regional availability, and
  ephemeral-token/server-mediated options may change.
- ChatGPT Sites hosting may not support the required secure session boundary.
- Microphone, audio, transcripts, and session errors need deterministic cleanup
  and must not leak into persistence or logs.

## Design

First run a documentation/hosting preflight. Verify the current official
Gemini Live route and choose either a short-lived ephemeral credential path or a
server-mediated connection supported by the actual Sites environment. The
client must never receive a standard API key. Keep runtime configuration
server-owned: model, system instructions, enabled WebMCP function list, max
session duration, idle timeout, and rate controls.

The runtime is disabled by default. The normal portal remains independently
usable when disabled, denied, over quota, disconnected, or unavailable.

## Likely Files

- `src/assistant/gemini-live-client.ts`
- `src/assistant/assistant-controller.ts`
- `src/assistant/session-state.ts`
- `server/gemini-session-core.ts`
- `server/sites-gemini-session-adapter.ts`
- `tests/contract/gemini-session-api.test.ts`
- `tests/unit/gemini-live-client.test.ts`
- `tests/unit/assistant-controller.test.ts`
- `.env.example` only for non-secret placeholders
- hosting/configuration files only in an explicitly authorized adapter packet

Never inspect or print an actual `.env`; do not add real credentials.

## Tasks

### Packet 3.1 — official docs and hosting preflight

- Verify the exact supported Gemini Live model identifier, preview status,
  supported audio/text/function-calling events, free-tier terms, quotas, rate
  limits, and data-use conditions from current official Google documentation.
- Verify whether ephemeral tokens or server-mediated connections are supported.
- Verify whether ChatGPT Sites can host the needed same-origin secure boundary.
- If the candidate model or secure hosting route cannot be verified, set this
  phase `blocked` and request a decision; never guess or silently fall back.

### Packet 3.2 — bounded session boundary

- Add disabled-by-default session endpoint/core with expected-origin/method/
  content-type/body-size validation, no-store responses, rate/session limits,
  fixed server-owned model/instructions/tools, and safe error mapping.
- Ensure standard credentials do not enter browser assets, responses, logs, or
  tests. Do not log raw audio, transcripts, tool arguments, session payloads,
  or upstream bodies.
- Use mocked upstreams for success, quota, timeout, malformed response, and
  network failure.

### Packet 3.3 — client/session lifecycle

- Support explicit connect/disconnect, text send, audio input/output events,
  transcript events, stop, retry, permission denial, quota failure, and
  network failure.
- Request microphone only after an explicit user click.
- Stop every media track and remove listeners on stop, disconnect, error, page
  hide, and component unmount.
- Route model function calls to the Phase 2 bridge; do not add direct commands.

## RED tests

- Preflight must fail safely when the model ID, free tier, transport, or hosting
  capability is unavailable or unverified.
- Contract tests fail if a client can choose model/instructions/tools, if a key
  reaches the browser, if origin/body/method limits are absent, or if raw
  payloads are logged.
- Lifecycle tests fail for pre-click microphone access, missing cleanup, stale
  events, quota/network failure, or portal unusability after disconnect.

## GREEN implementation boundary

GREEN uses mocks/fakes and the verified official protocol only. A real Gemini
call, real credential, public enablement, or deployment is excluded until the
separate Phase 5 live authorization. If secure Sites hosting is impossible,
stop at the boundary and preserve P0; do not add an insecure client key path.

## Verification commands

```bash
npm run test:contract -- --run tests/contract/gemini-session-api.test.ts
npm run test:unit -- --run tests/unit/gemini-live-client.test.ts tests/unit/assistant-controller.test.ts
npm run scan:secrets
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run verify
git diff --check
```

Record exact test counts and the official-doc/hosting decision in this phase;
do not treat a mocked session as a live-provider result.

## Acceptance Criteria

- Current official model/transport/free-tier terms are evidenced, or the phase
  is explicitly blocked pending a decision.
- Runtime is disabled by default and has a secure server/ephemeral boundary.
- Client cannot choose model, tools, or instructions and never sees a standard
  API key.
- Text/audio/session lifecycle cleans up all resources and preserves P0.
- All function calls route through the current WebMCP bridge.
- Local security, secret, type, build, and aggregate gates pass.

## Non-Goals

No real Gemini call, microphone use in tests, public voice enablement, unlimited
sessions, production availability claim, application persistence, deployment,
commit, push, or Devpost action.

## Review Risks

- Preview APIs and model IDs drift; record source date and exact identifier.
- A token broker can leak sensitive media or keys through logs and errors.
- Sites may support static assets but not a secure session endpoint.
- Media cleanup can fail on page lifecycle edges; test every terminal path.
- A client-controlled function list can bypass no-submit policy; keep config
  server-owned and bridge-owned.

## External boundaries

No secret access, live Gemini session, deployment, Site save, commit, push, or
public voice claim is authorized by this phase. Phase 5 needs a separate
explicit live authorization even after this local gate passes.
