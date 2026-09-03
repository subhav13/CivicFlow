# Phase 8 — judge-only Gemini companion PIN

## Status

`validated` — the local implementation, Vite PIN wiring, truthful connection
progress, retry feedback, and confirmation-free navigation regression fix are
independently accepted. On 2026-09-04 the user separately authorized the final
GitHub main/release synchronization, Sites secret update, and deployment. X and
Devpost form edits remain outside this phase.

## Goal

Keep the CivicFlow portal, manual form, and WebMCP tool surface immediately
accessible while requiring a judge-provided PIN before the browser may obtain
a billable Gemini Live ephemeral session. The PIN must remain server-side,
must not enter the public bundle or repository, and must be requested only when
the user turns on the Live companion.

## Problem Evidence

- `server/gemini-session-core.ts` currently validates origin, method, content
  type, body size, and a successful-session rate window, but it accepts any
  valid JSON body and has no caller authentication.
- `server/gemini-local-session.ts` correctly keeps `GEMINI_API_KEY` server-side
  and issues a one-use token with a maximum ten-minute expiry, but any visitor
  able to reach the public origin can request one.
- `src/assistant/assistant-runtime.ts` always sends `{}` to
  `/api/gemini/session`.
- `src/ui/agent-companion/AssistantPanel.tsx` connects immediately when the
  Live switch is enabled; it has no credential prompt.
- Origin checks and an in-memory per-runtime rate limit reduce accidental use
  but are not authentication or a billing hard stop.

## Design

### Public boundary

- Do not gate the Site, normal form, WebMCP registration, ChatGPT Site Tools,
  activity panel, or manual completion path.
- Gate only Gemini session issuance used by the embedded Live text/voice
  companion.
- Turning Live off clears any in-memory access value together with the current
  session. No PIN is stored in `localStorage`, `sessionStorage`, cookies,
  activity, transcript, analytics, logs, or error text.

### Server boundary

- Add `CIVICFLOW_COMPANION_PIN` to the Sites Worker environment contract. Treat
  it as a secret supplied only through Sites environment settings.
- Hosted voice must fail closed when the PIN is missing or blank. Local Vite
  middleware stays ungated when `CIVICFLOW_COMPANION_PIN` is absent or blank in
  `process.env` and the Vite-loaded env (including `.env.local`). A nonblank
  value is passed to `createLocalGeminiSessionHandler` with
  `requireCompanionPin: true`. Tests may still construct an ungated handler
  where the existing local development contract requires it. Never print or
  read a real `.env.local` value in tests or logs.
- Accept one bounded JSON property, `accessPin`, at the session endpoint. Reject
  missing, non-string, blank, oversized, or incorrect values before contacting
  Google.
- Compare fixed-length digests without an early-return character comparison.
  Return one generic authentication failure; never echo or log either value.
- Count failed and successful authentication attempts in a bounded rate window
  before provider issuance so the gate is not an unlimited online PIN oracle.
  Preserve the existing successful-session limit and `Cache-Control: no-store`.
- Do not change the one-use ephemeral-token or ten-minute maximum-expiry
  contract.

### Client and UI boundary

- Add a narrow optional access-value path through the assistant runtime/client;
  do not put the PIN in application state or the WebMCP surface.
- On an off-to-on Live transition, show an accessible modal with a labelled
  password input, **Enable Live**, and **Cancel**. Cancel leaves the controller
  disconnected and returns focus to the switch.
- Keep the entered value only in component/runtime memory for the active Live
  lifecycle, including an internal tool-surface reconnect. Clear it after a
  failed connect, explicit disconnect, component disposal, or disabled gate.
- A wrong PIN leaves Live off and shows concise, non-sensitive guidance. Never
  request microphone permission before PIN acceptance and successful session
  connection.
- Reuse the current companion visual language and focus-management patterns;
  do not introduce `window.prompt` or an inaccessible native-only flow.

## Likely Files

- `server/gemini-session-core.ts`
- `server/gemini-local-session.ts`
- `server/sites-worker.ts`
- `src/assistant/assistant-runtime.ts`
- `src/assistant/gemini-live-client.ts`
- `src/assistant/assistant-controller.ts` only if a backward-compatible optional
  connect parameter is required
- `src/ui/agent-companion/AssistantPanel.tsx`
- a focused PIN dialog component under `src/ui/agent-companion/` if separation
  keeps `AssistantPanel` smaller
- `src/styles.css`
- `vite.config.ts`
- focused tests under `tests/contract`, `tests/unit`, and
  `src/ui/agent-companion`
- `.env.example` and README security/testing instructions, using placeholders
  only

## Tasks

1. Record clean baseline identity and exact dirty allowlist containing only
   this plan before implementation.
2. Add RED contract tests for missing/wrong/correct/oversized PINs, failed-
   attempt limiting, fail-closed hosted configuration, no provider call on
   denial, and non-disclosure.
3. Add RED client/UI tests for prompt timing, cancel, wrong PIN, successful
   connection, microphone ordering, focus return, memory-only handling, and
   disconnect cleanup.
4. Implement the smallest server authentication seam and client access-value
   path that makes those tests GREEN.
5. Add placeholder-only configuration and truthful documentation. Do not write
   the real PIN to any file or command output.
6. Run focused tests, then formatting, secret scan, typecheck, unit, contract,
   build, and targeted assistant Playwright coverage.
7. Hand the actual diff and evidence to Codex. Codex independently reviews
   scope, security, accessibility, and test results before any release request.

## Acceptance Criteria

- Public portal and WebMCP behavior are unchanged without a PIN.
- The hosted session broker is disabled when its server PIN is absent.
- Missing, malformed, oversized, rate-limited, and incorrect PIN attempts never
  invoke the Gemini token endpoint and disclose no secret or comparison detail.
- A correct PIN can obtain the existing one-use, maximum-ten-minute credential.
- The real PIN is absent from Git history, built assets, browser storage,
  activity/transcripts, logs, screenshots, and test fixtures.
- The accessible prompt appears only on Live enable, supports keyboard use,
  cancels cleanly, restores focus, and precedes microphone permission.
- Reconnect works during the authorized active lifecycle; disconnect and
  failure clear the in-memory value.
- Focused security/UI tests and the full relevant regression gates pass.
- Codex independently inspects the diff and records GO before asking for
  commit, push, Sites secret update, deployment, live test, or Devpost action.

## Non-Goals

- No whole-site login, user accounts, database, OAuth, CAPTCHA, analytics,
  persistent sessions, WebMCP credential gate, Gemini model change, billing
  configuration, API-key rotation, X post, or Devpost form automation.
- No claim that a shared PIN replaces provider quotas or a Gemini project spend
  cap.
- No commit, push, branch mutation, Sites environment mutation, deployment, or
  live Gemini call in the implementation packet.

## Review Risks

- A PIN bundled into client code is public and is an automatic rejection.
- An authentication check after provider issuance still incurs cost and is an
  automatic rejection.
- A successful-session-only limiter permits brute-force attempts; denial paths
  must consume the authentication-attempt budget.
- Global in-memory limiting can vary across Worker instances and can also be
  abused for denial of service; document this remaining limitation rather than
  calling it production-grade protection.
- Retaining the PIN for reconnect must be memory-only and lifecycle-bounded.
- A modal that traps or loses focus, or microphone permission requested before
  authorization, blocks accessibility acceptance.

## Implementation evidence (2026-09-04)

```text
Attempt date and timezone: 2026-09-04, Asia/Kolkata
Exact baseline repository, branch, and HEAD: CivicFlow, main, 73c300e3dffbd16dcb3208d11ad3f865b5b8e8d7
Baseline status, staged diff, and user-owned changes: unstaged ledger-only dirty paths (MASTER.md, phases/00-index.md, cursor-phase-08-judge-pin-implementation.md, phases/09-judge-companion-pin.md); no staged changes
MODEL: cursor-grok-4.6-xhigh
REASONING: xhigh
ROUTING RATIONALE: user explicitly selected this exact verified model for the bounded security implementation
ESCALATION CONDITION: stop on dirty path outside the Phase 8 ledger baseline, secret/external access need, scope/interface expansion beyond the plan, unrelated regression, permission expansion, commit/push/deploy need, or inability to prove authentication denial before provider token issuance
Packet and exact allowed files: Phase 8 likely files plus focused tests and placeholder-only docs
```

RED (Vitest 4.1.11; `--runInBand` is not a Vitest 4 option and was omitted):

- Command: `npx vitest run tests/contract/gemini-companion-pin.test.ts tests/unit/assistant-companion-pin.test.ts src/ui/agent-companion/AssistantPanel.test.tsx`
- Observed: 18 failed | 41 passed (59). Missing/wrong/oversized PIN paths returned 200 and called the issuer; hosted voice without `CIVICFLOW_COMPANION_PIN` still issued; session body remained `{}`; Live switch connected without a dialog.

GREEN design summary:

- Hosted Worker always requires `CIVICFLOW_COMPANION_PIN` and fails closed with 404 when it is absent/blank.
- Session core authenticates `accessPin` with SHA-256 digest comparison (no early character return) before `issueEphemeralSession`. Failed and successful attempts share a bounded auth window; the existing successful-session limiter remains.
- Local handlers stay ungated unless a companion pin is supplied in options.
- Runtime/client keep the entered value only in memory for connect/reconnect and clear it on failure, disconnect, or dispose.
- Assistant panel shows an accessible password dialog on Live off-to-on; Cancel restores focus; microphone starts only after a successful connect from Start voice.

Focused GREEN: 5 files / 92 tests passed (`gemini-companion-pin`, `sites-worker`, `assistant-companion-pin`, `AssistantPanel`, `AgentCompanion`).

Aggregate GREEN (Node v22.23.1):

- `npm run format:check` passed
- `npm run scan:secrets` passed
- `npm run typecheck` passed
- `npm run test:unit` — 55 files / 545 tests passed
- `npm run test:contract` — 20 files / 179 tests passed
- `npm run build` passed
- `git diff --check` passed
- Built client assets do not contain `CIVICFLOW_COMPANION_PIN` or test placeholder pin values

Playwright: targeted `tests/e2e/assistant-text-voice.spec.ts` was not run to completion because Chromium was not installed in this environment. Browsers were not downloaded (no permission expansion).

Cursor status decision: `codex-review`. No commit, push, Sites secret update, deployment, or live Gemini call was performed.

Independent Codex acceptance on 2026-09-04 Asia/Kolkata:

- Reviewed the actual server, client/controller, accessible dialog, tests,
  configuration, documentation, and ledger diff; no path outside the Phase 8
  allowlist was modified.
- Confirmed authentication and failed-attempt limiting run before provider
  issuance; missing/blank hosted configuration fails closed; the real PIN is
  absent from source and built assets.
- Re-ran the five focused files: 92/92 tests passed.
- Re-ran formatting, secret scan, typecheck, and `git diff --check`: passed.
- Re-ran the production build: passed.
- An initial parallel aggregate run produced resource-contention timeouts while
  unit, contract, and build ran together. Uncontended serial reruns passed:
  unit 545/545 and contract 179/179.
- Accepted the local implementation. The remaining gate is release-only:
  choose a real PIN outside Git, set it as a Sites secret, commit/push the
  reviewed source, deploy the exact source, and perform a bounded live test only
  after explicit authorization.

## Local Vite PIN wiring correction (2026-09-04)

Independent review found that `vite.config.ts` never passed
`CIVICFLOW_COMPANION_PIN` into `createLocalGeminiSessionHandler`. Local testing
could show the access-code dialog while the Vite middleware still issued
sessions without checking the entered value.

```text
Attempt date and timezone: 2026-09-04, Asia/Kolkata
Exact baseline repository, branch, and HEAD: CivicFlow, main, 73c300e3dffbd16dcb3208d11ad3f865b5b8e8d7
Baseline status: uncommitted Phase 8 implementation still present; this correction is limited to vite.config.ts, focused PIN tests, and placeholder-only docs
MODEL: cursor-grok-4.6-xhigh
REASONING: xhigh
ROUTING RATIONALE: same user-selected model owns the targeted correction from independent review
ESCALATION CONDITION: stop on any need for secret access, unrelated files, commit/push/deploy, network/provider call, or broader architecture
```

RED (Vitest 4.1.11):

- Command: `npx vitest run --config vitest.contract.config.ts tests/contract/gemini-companion-pin.test.ts`
- Observed: 3 failed | 18 passed (21). Missing or wrong placeholder PINs from the loaded-env stand-in and `process.env` still returned 200.

GREEN design summary:

- `createLocalViteGeminiSessionHandler` is the local Vite middleware factory.
- A nonblank `CIVICFLOW_COMPANION_PIN` from `process.env` or the Vite-loaded env is passed through with `requireCompanionPin: true`.
- Absent or blank values keep the ungated local developer contract.
- Tests use in-memory placeholder env objects only and do not open `.env.local`.

Focused GREEN: `tests/contract/gemini-companion-pin.test.ts` — 21/21 passed, including proofs that a wrong local PIN cannot reach provider issuance and that the correct placeholder can.

Aggregate GREEN (Node v22.23.1):

- `npm run format:check` passed
- `npm run scan:secrets` passed
- `npm run typecheck` passed
- `npm run build` passed
- `git diff --check` passed
- Built client assets do not contain `CIVICFLOW_COMPANION_PIN` or test placeholder pin values

Cursor status decision: `codex-review`. No commit, push, Sites secret update, deployment, live Gemini call, or `.env.local` read was performed.

## Final interaction and release gate (2026-09-04)

- `navigate_to_section` remains a direct navigation action and no longer creates
  a confirmation draft or narrates draft-review language.
- The PIN dialog now presents visible connection progress after an accepted PIN
  and keeps retry/error feedback in the same surface.
- Independent focused verification passed: 59 unit tests and 31 contract tests.
- Release verification passed formatting, lint, repository secret scanning,
  typechecking, 188 contract tests, the production build, and the diff check.
  Five aggregate UI timeouts also passed serially (13/13), confirming they were
  resource-contention timeouts rather than functional failures.
- `.env.local` remains ignored. The hosted Gemini key and companion PIN are Sites
  runtime secrets and are not bundled into client assets or committed to Git.
