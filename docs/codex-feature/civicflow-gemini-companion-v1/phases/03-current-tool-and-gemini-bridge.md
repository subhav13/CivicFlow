# Phase 2 — current WebMCP tool surface and Gemini function bridge

## Status

`validated`. Entry required Phase 1 Feedback Gate A and a reviewed tool-surface
baseline. This phase uses fakes only; it did not open a Gemini connection or
access credentials.

## Goal

Expose the page's current WebMCP registrations to a provider-neutral assistant
adapter so Gemini can use the exact same capabilities ChatGPT sees, including
dynamic contextual tools, without a direct application mutation path.

## Problem Evidence

- CivicFlow currently has ten registered WebMCP tools: the original nine plus
  read-only `get_next_actions`.
- Household/income update and review tools are contextual and can appear or
  disappear with selection/section state.
- Provider declarations can become stale if a function call uses an old tool
  snapshot.
- An assistant that imports commands or the store would create a second
  mutation surface and break the one-state invariant.

## Design

Create a focused `src/assistant` boundary. `CurrentToolSurface` adapts the
browser WebMCP port, subscribes to registration changes, refreshes before every
execution, and serializes calls. `gemini-function-mapper` converts exact tool
definitions into provider-neutral function declarations. `gemini-tool-bridge`
parses arguments once, calls the current surface, and returns the unchanged
compact WebMCP result. A confirmation policy classifies read/navigation,
mutation, and forbidden intents.

## Likely Files

- `src/assistant/types.ts`
- `src/assistant/current-tool-surface.ts`
- `src/assistant/gemini-function-mapper.ts`
- `src/assistant/gemini-tool-bridge.ts`
- `src/assistant/confirmation-policy.ts`
- `src/webmcp/model-context-port.ts` only for a narrow public adapter seam
- `tests/contract/gemini-tool-bridge.test.ts`
- `tests/contract/current-tool-surface.test.ts`
- `tests/contract/confirmation-policy.test.ts`

Do not modify application commands, the store, domain schemas, or Gemini
transport in this phase.

## Canonical interfaces

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

## Tasks

### Packet 2.1 — surface snapshot and dynamic lifecycle

- Read current registrations from the existing browser model-context adapter.
- Notify subscribers when static/contextual tools change.
- Refresh immediately before execution and reject disappeared contextual tools
  with a bounded safe error.
- Serialize conflicting mutation calls and support abort without stale success.

### Packet 2.2 — exact function mapping and result round-trip

- Copy exact name, description, and closed JSON Schema from each registration.
- Parse function arguments once at the bridge boundary.
- Return the exact WebMCP result string unchanged.
- Handle invalid JSON, missing tools, aborted calls, and upstream tool errors
  without inventing application state.

### Packet 2.3 — intent/confirmation policy

- Classify current read/navigation tools as executable without mutation
  confirmation.
- Classify application mutations as confirmation-required.
- Classify any submit/attest equivalent as forbidden, even if a model requests
  it or a future registration is malformed.
- Return a plain-language confirmation request without executing the tool.

## RED tests

- Surface tests fail for absent snapshot/subscribe/execute contracts, dynamic
  addition/removal, stale contextual tools, abort, and serial execution.
- Mapping tests fail if definitions drift from WebMCP schemas or if result text
  is reserialized.
- Policy tests fail if a mutation bypasses confirmation or if a submit/attest
  name is exposed.
- Static import-boundary checks fail if assistant code imports commands or the
  store.

## Phase 2 implementation evidence

On 2026-08-28, the user authorized Phase 2 Packets 2.1–2.3 against `main` at
the accepted baseline `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The bounded
OMP route used `google-antigravity/gemini-3.7-flash` with `high` reasoning,
matching the requested Gemini 3.7 Flash High route. No provider fallback, paid
Merge route, commit, push, deploy, credential access, live call, or external
action occurred.

The first exact Phase 2 RED collected 22 tests with 19 failures and 3 passes.
The implementer then produced the provider-neutral `src/assistant` boundary
and the exact Phase 2 GREEN passed all 22 tests. Independent review found four
concrete policy/error-boundary defects; the same OMP route corrected them. The
correction RED reproduced 4 failures and 18 passes, and the corrected GREEN
passed all 22 tests.

The accepted implementation is limited to:

- `src/assistant/types.ts`;
- `src/assistant/current-tool-surface.ts`;
- `src/assistant/gemini-function-mapper.ts`;
- `src/assistant/gemini-tool-bridge.ts`;
- `src/assistant/confirmation-policy.ts`; and
- the three Phase 2 contract files under `tests/contract/`.

The coordinator independently reviewed the actual worktree and source after
the correction. The surface snapshots and subscribes to the existing port,
refreshes before execution, rejects missing contextual tools, serializes
mutations while allowing reads to proceed, honors abort without stale success,
maps exact schemas/results, requires explicit mutation confirmation, denies
submit/attest variants, and sanitizes bridge errors. No assistant file imports
application commands, the store, provider transport, credentials, browser
media, or network APIs.

Preservation guards passed with 25 contract tests and 22 WebMCP lifecycle unit
tests. Aggregate verification passed with 36 unit files/301 tests, 13 contract
files/112 tests, 33 Playwright tests, typecheck, lint, formatting, secret scan,
and production build. OMP evidence is retained at:

- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-202027-13812`
- `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-202904-14784`

## GREEN implementation boundary

GREEN is a provider-neutral, fake-port bridge only. It may not connect to
Gemini, request a microphone, add server routes, persist conversation data,
modify app state directly, or add a new Site Tool. The existing ten-tool
catalog and exact result envelope remain the source of truth.

## Verification commands

```bash
npm run test:contract -- --run tests/contract/current-tool-surface.test.ts tests/contract/gemini-tool-bridge.test.ts tests/contract/confirmation-policy.test.ts
npm run test:contract -- --run tests/contract/tool-catalog.test.ts tests/contract/model-context-port.test.ts
npm run test:unit -- --run tests/integration/dynamic-registry.test.ts tests/integration/tool-operation-lifecycle.test.ts
npm run typecheck
npm run lint
npm run format:check
npm run scan:secrets
npm run build
npm run verify
git diff --check
```

## Acceptance Criteria

- All current WebMCP tools map exactly and refresh dynamically.
- Calls execute through WebMCP only, serialize safely, and return unchanged
  result strings.
- No assistant module imports application commands or the store.
- Mutation confirmation is explicit; reads/navigation may proceed; submission
  and attestation are absent/forbidden.
- Existing WebMCP, activity, no-submit, and full verification suites remain
  green.

## Non-Goals

No Gemini Live transport, API key, session broker, microphone, UI panel,
conversation persistence, new tool, direct command call, deployment, commit,
push, or live audit.

## Review Risks

- Stale contextual snapshots can mutate the wrong record; refresh and exact
  registration identity are mandatory.
- Serializing all calls instead of only conflicting mutations could harm
  responsiveness; define the queue boundary and test it.
- Rewrapping results can alter compact error semantics; compare exact strings.
- A broad forbidden-name filter is not a substitute for the current catalog;
  deny submission structurally and test the public function list.

## External boundaries

No commit, push, deploy, live Gemini session, secret access, or Site action is
authorized. A separate phase prompt is required for secure runtime work after
Bridge Gate B is independently accepted.
