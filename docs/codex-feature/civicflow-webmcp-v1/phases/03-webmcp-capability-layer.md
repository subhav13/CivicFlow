# Phase 2 — WebMCP capability layer

## Status

`planned`. Entry is Gate B: the human portal must be keyboard-completable and independently accepted. This phase owns the page capability surface, not the human domain contract or voice provider.

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

- **Status:** `planned`
- **Depends on:** Phase 1 Gate B
- **Allowlist:** ambient types, port, browser adapter, fake, and `tests/contract/model-context-port.test.ts`
- **RED:** unavailable API, duplicate registration, abort cleanup, unknown tool, execution, `getTools`, and change notification tests fail before the boundary exists
- **GREEN:** narrow port with feature detection, behaviorally faithful fake, abortable registration, and deterministic snapshots
- **Focused gate:** `npm run test:contract -- --run tests/contract/model-context-port.test.ts`
- **Acceptance:** only the browser adapter references `document.modelContext`; unsupported browsers never break the portal; fake and browser port expose the same interface
- **Refactor limit:** no catalog or command handler implementation
- **Non-goals:** live Site Tools, voice, deployment, or business rules

### Packet 2.2 — tool catalog and result envelope

- **Status:** `planned`
- **Depends on:** 2.1 and Phase 0 contracts
- **Allowlist:** `src/webmcp/tool-catalog.ts`, `src/webmcp/tool-results.ts`, and `tests/contract/tool-catalog.test.ts`
- **RED:** exact-name, no-submit, closed-schema, parameter-limit, annotation, description-uniqueness, serialization, and 1,500-character output tests fail before catalog creation
- **GREEN:** TypeBox-derived nine-tool definitions and success/failure result factories
- **Focused gate:** `npm run test:contract -- --run tests/contract/tool-catalog.test.ts`
- **Acceptance:** all nine names and availability rules match this ledger; document content is marked untrusted; results never expose full application state, stack traces, storage, or secrets
- **Refactor limit:** no registry lifecycle or handler side effects
- **Non-goals:** live browser registration, voice, or human UI redesign

### Packet 2.3 — static read and navigation handlers

- **Status:** `planned`
- **Depends on:** 2.2
- **Allowlist:** handler factory, static handlers, navigation focus helper, and `tests/integration/static-read-navigation-tools.test.ts`
- **RED:** schema rejection, no revision mutation for reads, untrusted document output, navigation selection clearing, visible activity, focus, and compact-output tests fail
- **GREEN:** progress, navigation, and document listing dispatch selectors or public UI facades and return safe envelopes
- **Focused gate:** `npm run test:contract -- --run tests/integration/static-read-navigation-tools.test.ts`
- **Acceptance:** read tools never change persisted revision; navigation changes only ephemeral UI; document strings remain text; the visible capability/activity panel reflects accepted runtime state
- **Refactor limit:** do not add mutation branches or direct store access
- **Non-goals:** contextual registry, voice, live model calls

### Packet 2.4 — static mutation handlers

- **Status:** `planned`
- **Depends on:** 2.3
- **Allowlist:** mutation handlers, money/name resolvers, and `tests/integration/static-mutation-tools.test.ts`
- **RED:** golden inputs, missing/extra fields, range and excess-precision money, owner not-found/ambiguous, duplicates/no-ops, atomic coverage, visible update-before-result, and no-submit tests fail
- **GREEN:** add member, add income, and set coverage handlers adapt natural tool inputs to the Phase 0 commands and append truthful Agent action activity
- **Focused gate:** `npm run test:contract -- --run tests/integration/static-mutation-tools.test.ts`
- **Acceptance:** the golden E1 journey moves 20% to 60%; two explicit none records are atomic; result revision/effect is stable; no handler mutates Zustand internals or exposes an ID requirement to the agent
- **Refactor limit:** no direct edits to Phase 0 command contracts
- **Non-goals:** dynamic tools, review handler, live Site Tools, or voice

### Packet 2.5 — dynamic registry and contextual handlers

- **Status:** `planned`
- **Depends on:** 2.4
- **Allowlist:** registry manager, contextual handlers, subscription hook, and `tests/integration/dynamic-registry.test.ts`
- **RED:** appear/disappear, switched-selection, stale execution, duplicate name, abort cleanup, generation races, review-only availability, teardown, and HMR tests fail
- **GREEN:** serialized abortable registry refresh and current-selection household/income update plus review handlers
- **Focused gate:** `npm run test:contract -- --run tests/integration/dynamic-registry.test.ts`
- **Acceptance:** income selection exposes exactly `update_income_source`; deselection removes it; household selection exposes only its contextual update; Review exposes `review_application`; stale execution returns `CONTEXT_STALE` and does not mutate state
- **Refactor limit:** registry mechanics only; no alternate business rules
- **Non-goals:** voice tool mapping, live validation, deployment

### Packet 2.6 — capability and activity UI

- **Status:** `planned`
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
