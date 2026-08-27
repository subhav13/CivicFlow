# Phase 2 — WebMCP capability layer

## Status

`validated`. Entry was authorized while Phase 1 review was pending; the user has now confirmed Phase 1 review completion. The implementation and Gate C evidence were independently reviewed by the coordinator. This phase owns the page capability surface, not the human domain contract or voice provider.

## Goal

Expose a small, truthful, draft-isolated WebMCP surface that ChatGPT Site Tools can discover and execute against the same application commands and visible UI. Provide a faithful fake port and contract tests before any live Site Tools audit.

## Problem Evidence

The current repository has no `src/webmcp` implementation and the contract test script has no test files. The product brief requires approximately nine high-quality tools, dynamic contextual tools, and an Agent Companion that visibly reflects runtime capabilities. The plan requires WebMCP draft API changes to remain isolated so a browser that lacks `document.modelContext` still has a complete normal portal.

## Design

- `ModelContextPort` is the only browser boundary. Its browser adapter feature-detects `document.modelContext`; its fake rejects duplicate names, honors abort cleanup, snapshots current tools, executes registered handlers, and emits change notifications.
- A TypeBox-derived catalog owns exact tool names, titles, descriptions, closed input schemas, annotations, synthetic examples, and no-submit assertions. Tool handlers validate again at runtime, resolve natural names or current selection, dispatch the Phase 0 command facade, update visible UI/activity, and return a compact JSON envelope.
- Static tools register once after hydration. The registry manager serializes refreshes, tracks a monotonic generation, aborts obsolete contextual registrations, and exposes the accepted snapshot to the UI and the future voice bridge. Contextual execution resolves selection from current store state at call time.
- The Agent Companion reads the registry snapshot and activity facade. It is not a hard-coded catalog and never attributes an action to ChatGPT or voice when the browser cannot provide that identity.

## Likely Files

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/ambient.d.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/model-context-port.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/browser-model-context-port.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/fake-model-context-port.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/tool-catalog.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/tool-handlers.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/tool-results.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/registry-manager.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/webmcp/use-webmcp-registry.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/agent-companion/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/contract/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/integration/`

Do not edit Phase 0 schemas, selectors, command semantics, persistence semantics, voice, server, deployment, or the accepted Sites route. If an adapter needs syntax correction for current draft documentation, isolate it to the browser adapter and ambient type boundary.

## Exact capability catalog

| Name                       | Availability                   | Input and effect                                                                                                                       | Annotation                                         |
| -------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `get_application_progress` | Static                         | Closed empty object; returns percent, completed sections, next section, up to five issue summaries, revision; no mutation              | `readOnlyHint`                                     |
| `navigate_to_section`      | Static                         | Closed section enum; updates ephemeral active section, clears incompatible selection, focuses heading; revision unchanged              | none                                               |
| `add_household_member`     | Static                         | Closed first/last/age/relationship/applying fields; defaults last name at handler boundary; adds or identifies member and reveals card | none                                               |
| `update_household_member`  | Selected household member only | Closed non-empty field subset without ID; resolves current selection at execution time                                                 | none                                               |
| `add_income_source`        | Static                         | Closed owner natural name, employer, finite dollars with at most two decimals, frequency; resolves owner and adds or identifies source | none                                               |
| `update_income_source`     | Selected income only           | Closed non-empty owner/employer/amount/frequency subset; resolves current selection at execution time                                  | none                                               |
| `set_current_coverage`     | Static                         | Closed non-empty unique natural-name list, status, optional provider/plan; atomically upserts explicit records                         | none                                               |
| `list_uploaded_documents`  | Static                         | Closed empty object; returns compact kind/displayName/status; no mutation                                                              | `readOnlyHint`, `untrustedContentHint`             |
| `review_application`       | Review section only            | Closed empty object; replaces ephemeral review highlights, focuses first blocker, returns compact issues and readiness                 | no read-only annotation because visible UI changes |

No catalog name contains `submit`. The agent cannot call `submitDemo`, confirm no income, or invoke a hidden mutation. Tool descriptions are concise, unique, synthetic-only, and never used as a prompt-instruction channel.

## Tasks

Packets 2.1 through 2.6 below are the atomic implementation and review tasks. The registry and handler contracts do not bypass Phase 0 or Phase 1 ownership.

## Packets

### Packet 2.1 — ModelContextPort and fake

- **Status:** `validated`
- **Depends on:** Phase 1 Gate B
- **Allowlist:** ambient types, port, browser adapter, fake, and `tests/contract/model-context-port.test.ts`
- **RED:** unavailable API, duplicate registration, abort cleanup, unknown tool, execution, `getTools`, and change notification tests fail before the boundary exists
- **GREEN:** narrow port with feature detection, behaviorally faithful fake, abortable registration, and deterministic snapshots
- **Focused gate:** `npm run test:contract -- --run tests/contract/model-context-port.test.ts`
- **Acceptance:** only the browser adapter references `document.modelContext`; unsupported browsers never break the portal; fake and browser port expose the same interface
- **Refactor limit:** no catalog or command handler implementation
- **Non-goals:** live Site Tools, voice, deployment, or business rules

### Packet 2.2 — tool catalog and result envelope

- **Status:** `validated`
- **Depends on:** 2.1 and Phase 0 contracts
- **Allowlist:** `src/webmcp/tool-catalog.ts`, `src/webmcp/tool-results.ts`, and `tests/contract/tool-catalog.test.ts`
- **RED:** exact-name, no-submit, closed-schema, parameter-limit, annotation, description-uniqueness, serialization, and 1,500-character output tests fail before catalog creation
- **GREEN:** TypeBox-derived nine-tool definitions and success/failure result factories
- **Focused gate:** `npm run test:contract -- --run tests/contract/tool-catalog.test.ts`
- **Acceptance:** all nine names and availability rules match this ledger; document content is marked untrusted; results never expose full application state, stack traces, storage, or secrets
- **Refactor limit:** no registry lifecycle or handler side effects
- **Non-goals:** live browser registration, voice, or human UI redesign

### Packet 2.3 — static read and navigation handlers

- **Status:** `validated`
- **Depends on:** 2.2
- **Allowlist:** handler factory, static handlers, navigation focus helper, and `tests/integration/static-read-navigation-tools.test.ts`
- **RED:** schema rejection, no revision mutation for reads, untrusted document output, navigation selection clearing, visible activity, focus, and compact-output tests fail
- **GREEN:** progress, navigation, and document listing dispatch selectors or public UI facades and return safe envelopes
- **Focused gate:** `npm run test:contract -- --run tests/integration/static-read-navigation-tools.test.ts`
- **Acceptance:** read tools never change persisted revision; navigation changes only ephemeral UI; document strings remain text; the visible capability/activity panel reflects accepted runtime state
- **Refactor limit:** do not add mutation branches or direct store access
- **Non-goals:** contextual registry, voice, live model calls

### Packet 2.4 — static mutation handlers

- **Status:** `validated`
- **Depends on:** 2.3
- **Allowlist:** mutation handlers, money/name resolvers, and `tests/integration/static-mutation-tools.test.ts`
- **RED:** golden inputs, missing/extra fields, range and excess-precision money, owner not-found/ambiguous, duplicates/no-ops, atomic coverage, visible update-before-result, and no-submit tests fail
- **GREEN:** add member, add income, and set coverage handlers adapt natural tool inputs to the Phase 0 commands and append truthful Agent action activity
- **Focused gate:** `npm run test:contract -- --run tests/integration/static-mutation-tools.test.ts`
- **Acceptance:** the golden E1 journey moves 20% to 60%; two explicit none records are atomic; result revision/effect is stable; no handler mutates Zustand internals or exposes an ID requirement to the agent
- **Refactor limit:** no direct edits to Phase 0 command contracts
- **Non-goals:** dynamic tools, review handler, live Site Tools, or voice

### Packet 2.5 — dynamic registry and contextual handlers

- **Status:** `validated`
- **Depends on:** 2.4
- **Allowlist:** registry manager, contextual handlers, subscription hook, and `tests/integration/dynamic-registry.test.ts`
- **RED:** appear/disappear, switched-selection, stale execution, duplicate name, abort cleanup, generation races, review-only availability, teardown, and HMR tests fail
- **GREEN:** serialized abortable registry refresh and current-selection household/income update plus review handlers
- **Focused gate:** `npm run test:contract -- --run tests/integration/dynamic-registry.test.ts`
- **Acceptance:** income selection exposes exactly `update_income_source`; deselection removes it; household selection exposes only its contextual update; Review exposes `review_application`; stale execution returns `CONTEXT_STALE` and does not mutate state
- **Refactor limit:** registry mechanics only; no alternate business rules
- **Non-goals:** voice tool mapping, live validation, deployment

### Packet 2.6 — capability and activity UI

- **Status:** `validated`
- **Depends on:** 2.5 and Phase 1 shell
- **Allowlist:** `src/ui/agent-companion/`, store UI adapters if already allowed by Phase 1, and component/integration tests
- **RED:** exact accepted snapshot, loading/error/unavailable states, newest-20 activity, polite live announcement, truthful caller label, and mobile drawer tests fail
- **GREEN:** render registry snapshots and accepted action receipts, with a clear unavailable/not-yet-enabled state when WebMCP is absent
- **Focused gate:** `npm run test:unit -- --run src/ui/agent-companion/AgentCompanion.test.tsx` and `npm run test:contract -- --run tests/integration/capability-activity-ui.test.tsx`
- **Acceptance:** dynamic changes appear without reload; no hard-coded fake catalog; activity says “Agent action” rather than inventing ChatGPT or voice identity; the companion never exposes submission
- **Refactor limit:** presentation and public facade use only
- **Non-goals:** voice, live Site Tools, public hosting, or manual submission changes

## Acceptance Criteria

Gate C is green only when all nine capabilities pass through the fake port, dynamic registration and race behavior is deterministic, compact output and visible-effect contracts pass, no submission name or path exists, and no handler bypasses the public command/store facade. The independent reviewer must inspect actual registration behavior and catalog output before the next phase.

## Phase 2 gate and evidence

Gate C requires all nine capabilities through the fake port, dynamic registration lifecycle and race tests, compact output tests, visible UI effects before tool resolution, no `submit_application` name or path, and no direct command/store bypass. The worker returns exact changed files, RED/GREEN output, contract results, typecheck, aggregate results, and risks. An independent reviewer inspects the catalog and actual registration behavior before Gate D.

## Non-Goals

No live ChatGPT calls, public Site creation, Site save/deploy/publish, Realtime voice, SDP broker, authentication, database, government integration, or changes to the human command semantics.

## Review Risks

- The WebMCP draft may change. Keep syntax isolated in `ModelContextPort` and recheck primary documentation before implementation and live audit.
- Asynchronous registration can expose stale tools. Delayed promises, generation tokens, and abort tests are mandatory.
- Contextual handlers can capture stale IDs. Resolve selection at execution time and fail closed.
- Agent Companion can become a static mock. Derive it from the accepted registry snapshot only.
- Tool descriptions or document content can smuggle instructions. Keep inputs closed, content untrusted, and outputs compact.

## Execution evidence

- **Attempt date and timezone:** 2026-08-27, Asia/Kolkata.
- **Worker route and exact model/reasoning:** OMP worker, `google-antigravity/gemini-3.7-flash` (`gemini-3.7-flash-high` CLI), high reasoning. Three bounded correction runs used the same route for serializer/activity/registry hardening and exact money precision.
- **One-sentence routing rationale:** The user explicitly authorized the complete Phase 2 OMP route with Gemini 3.7 Flash High, and independent review required bounded corrections without changing the product boundary.
- **Observable escalation condition:** Stop if the WebMCP draft cannot remain in the browser adapter/ambient boundary, if domain/command/persistence/Phase 1/voice/server/Sites changes are required, or if any submission capability is needed; no such condition occurred.
- **Baseline repository, branch, and exact HEAD:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, Phase 1 baseline `923efae8634ca311672e209065b6d2d3557fcedc`; Phase 2 was committed locally as `d437a6ee09156d0919c767f8daf1d037b00c2e7b` and published through the GitHub connector as `8d88dae839833fd7524fd6772d51b61aa8c8c66d`.
- **Baseline status/diff summary:** The pre-dispatch Phase 2 baseline was the clean local Phase 1 commit. After independent review, the Phase 2 snapshot was committed and published; the current worktree is clean and no Phase 2 writer overlapped the OMP runs.
- **Allowed files:** `src/webmcp/**`; `src/ui/agent-companion/**`; minimal `src/app/App.tsx`, `src/ui/layout/ApplicationShell.tsx`, `src/application/store.ts`, `vitest.contract.config.ts`; Phase 2 contract/integration tests; and the bounded correction allowlists recorded in the OMP task files under `/private/tmp/`.
- **Actual changed files:** `src/app/App.tsx`; `src/application/store.ts`; `src/application/store.test.ts`; `src/ui/agent-companion/AgentCompanion.tsx`; `src/ui/agent-companion/AgentCompanion.test.tsx`; `src/ui/layout/ApplicationShell.tsx`; `src/webmcp/ambient.d.ts`; `browser-model-context-port.ts`; `fake-model-context-port.ts`; `index.ts`; `model-context-port.ts`; `registry-manager.ts`; `tool-catalog.ts`; `tool-handlers.ts`; `tool-results.ts`; `use-webmcp-registry.ts`; `tests/contract/model-context-port.test.ts`; `tests/contract/tool-catalog.test.ts`; `tests/integration/capability-activity-ui.test.tsx`; `tests/integration/dynamic-registry.test.ts`; `tests/integration/static-mutation-tools.test.ts`; and `tests/integration/static-read-navigation-tools.test.ts`; plus the minimal `vitest.contract.config.ts` discovery change.
- **RED tests and observed failures:** The full-phase worker recorded RED coverage for the missing port/fake, catalog/envelope, static handlers, dynamic registry, and Agent Companion contracts before implementation. Independent review then observed a React duplicate-key warning from repeated fixed human activity IDs and reproduced valid decimal rejection for `0.29`, `0.58`, and `4950.1`; an oversized serializer case also exceeded the stated budget. These were concrete post-GREEN findings, not ignored warnings.
- **GREEN implementation result:** All nine catalog tools now register through the narrow port; static and contextual handlers use the existing public store/command facade; contextual registration is serialized, abortable, generation-guarded, and teardown-safe; Agent Companion renders accepted capabilities and truthful activity; money checks use exact cent round-trip validation; activity IDs are unique within the retained feed; and result serialization is hard-capped at 1,500 characters with intact retained strings or a safe minimal envelope.
- **Focused commands and exact results:** Main worker and corrections passed the focused suites: model-context port (11 tests), catalog/results (13 tests), static read/navigation (8 tests), static mutation (15 tests after precision corrections), dynamic registry (12 tests after race/teardown corrections), Agent Companion (6 tests), capability/activity integration (4 tests), and store (9 tests). The final money correction added rejection coverage for `9999999.00000001`.
- **Aggregate commands and exact results:** Independent `npm run verify` passed `format:check`, lint, secret scan, typecheck, 20 unit files/118 tests, 7 contract/integration files/64 tests, production build, and 3 Playwright E2E tests. `git diff --check` passed. `rg -n "document\.modelContext" src` matched only `src/webmcp/browser-model-context-port.ts` and `src/webmcp/ambient.d.ts`; `rg -n "fetch|XMLHttpRequest|sendBeacon|WebSocket" src/webmcp` returned no matches.
- **Independent reviewer and findings:** Coordinator review inspected the actual worktree and implementation, reproduced the initial decimal/serialization/activity defects, routed each correction through a bounded OMP worker, reran the complete verification pipeline, and confirmed branch/HEAD unchanged. No submission tool or network path was introduced. The `src/application/store.ts` `id-` prefix is a minimal compatibility correction so default generated entity IDs satisfy the accepted Phase 0 leading-letter identifier schema when WebMCP uses the public store facade.
- **Status decision:** `validated`; Gate C evidence is present, the actual diff was independently inspected, all required local gates pass, the user confirmed the Phase 1 review dependency is closed, and the accepted snapshot is committed locally and published to the public repository.
- **Risks, assumptions, and unresolved decisions:** WebMCP draft syntax remains isolated to the browser adapter/ambient boundary. Live Site Tools, public hosting, voice, deployment, commit, and push were out of scope for implementation and are deferred to later authorized phases. No contradictory product or safety evidence was found.
