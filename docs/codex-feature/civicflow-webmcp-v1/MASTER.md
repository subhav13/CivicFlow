# CivicFlow WebMCP v1 — master ledger

## Ledger metadata

- **Feature:** CivicFlow, a WebMCP-native public-benefits application workspace
- **Version:** v1
- **Overall status:** `in-progress` — Phases 0, 1, and 2 are validated; Phase 3 is in progress; Phases 4–5 are planned
- **Ledger owner:** the coordinating Codex task, with independent review by a Sol route
- **Phase 1 Site owner:** one native `luna_max` task is the sole source and local-preview owner
- **Last updated:** 2026-08-27
- **Implementation repository:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`
- **Planning baseline:** [CIVICFLOW_IMPLEMENTATION_PLAN.md](/Users/SubhavMathur/.codex/.chatgpt-projects/g-p-6a8f4e433074819184bcac6f1ff0e3d3/CIVICFLOW_IMPLEMENTATION_PLAN.md)

This ledger is the working source of truth for implementation, review, and release evidence. The attached brief and approved planning baseline remain read-only source references. A worker's prose is not acceptance evidence; the actual diff, status, focused commands, and independent review are authoritative.

## Purpose and problem

CivicFlow is a fictional Massachusetts public-benefits and health-coverage application workspace built with synthetic data. The demo must show that a person can use the normal portal, ChatGPT Site Tools, and an optional embedded voice companion against the same visible application state. The current repository has the accepted Phase 0 foundation but only a shell UI. The remaining work is to add the human portal, WebMCP capability surface, deterministic integration evidence, optional voice, and release packaging without breaking the three product invariants.

The product is deliberately not a government service, eligibility engine, enrollment system, or general voice SDK. The most important user-visible safety behavior is that an agent can help prepare and review the demo but cannot submit it. A human must attest and click **Submit Demo**.

## Source inventory and evidence

| Source                                                                                                                                             | Role and evidence                                                                                                                                                | Handling                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [CivicFlow product brief](/Users/SubhavMathur/.codex/attachments/4345a0cd-6382-4419-8f19-e24f7858a5b2/pasted-text.txt)                             | Primary product authority. Defines the six sections, synthetic demo story, dynamic WebMCP tools, voice-through-WebMCP concept, and no-agent-submission boundary. | Read-only; product scope follows it unless the user gives a newer instruction.      |
| [Approved implementation plan](/Users/SubhavMathur/.codex/.chatgpt-projects/g-p-6a8f4e433074819184bcac6f1ff0e3d3/CIVICFLOW_IMPLEMENTATION_PLAN.md) | Reconciles the brief into architecture, schemas, tool contracts, packets, gates, risks, and the Sites-first route.                                               | Read-only planning baseline; this ledger links and operationalizes it.              |
| [Phase 1 Sites-first prompt](/Users/SubhavMathur/.codex/attachments/cc4456fa-b3dc-46a5-b8f7-3dc8b5a226e0/pasted-text.txt)                          | Phase 1 ownership, packet limits, local-only Sites boundary, focused tests, and stop conditions.                                                                 | Read-only dispatch contract; Phase 1 must preserve its single-writer rule.          |
| `sites-building` skill                                                                                                                             | Sites lifecycle ownership, existing-Vite capability path, first meaningful preview, and hosting handoff rules.                                                   | Required for any Sites work; remote Site operations are separately authorized only. |
| Current CivicFlow repository                                                                                                                       | Actual implementation evidence: React/Vite/TypeScript scaffold; TypeBox/Ajv domain; commands; Zustand store and persistence; tests and scripts.                  | Source of truth for real paths, dirty state, and baseline results.                  |
| Repository-local `sources/` mirror                                                                                                                 | No additional project source files were available during planning.                                                                                               | Do not infer requirements from an empty mirror.                                     |

Evidence precedence is: current user instruction; attached product brief; current primary WebMCP/OpenAI/Chrome documentation at the time of the relevant packet; current hackathon rules; then this ledger and its linked plan. Draft API syntax may change inside the isolated adapter, but a change to the one-state, one-capability-surface, or no-agent-submission invariants requires a decision before edits.

## Frozen product scope

### User-facing outcome

The portal has six fixed sections in this order:

1. About You
2. Household
3. Income
4. Current Coverage
5. Documents
6. Review & Sign

It shows a research-demo disclosure, a deterministic progress header, normal keyboard-accessible forms and cards, a review surface with actionable missing-item links, an Agent Companion that truthfully reflects runtime capabilities, a human-only attestation and **Submit Demo** control, and a deterministic reset.

### Priority boundary

- **P0:** human portal, central state/commands, all nine WebMCP capabilities, dynamic contextual registration, deterministic tests, live Site Tools evidence, public repository and release package.
- **P1:** optional OpenAI Realtime voice over WebRTC using the current WebMCP surface; P0 must remain shippable without it.
- **P2:** only after P0 and P1 are green: optional undo, adversarial showcase polish, accessibility refinement, and other explicitly approved enhancements.

### Explicit non-goals

No MassHealth or government API, enrollment, eligibility decision, plan recommendation, login, account, role system, database, real identity or medical data, actual file bytes, OCR, document classification, regulatory claim, multi-benefit expansion, reusable VoiceMCP SDK, direct voice mutation API, hidden submission route, or generic browser automation path belongs in this feature. No public-host or live-API action is implied by a phase document.

### Honest human boundary

The product does not expose `submit_application` or any equivalent agent capability. It must say that submission is not an exposed agent action; it must not claim that a general browser controller could never click the visible button.

## Three non-negotiable invariants

1. **One state:** human UI, future ChatGPT Site Tools, and embedded voice all use the same application command/store facade.
2. **One capability surface:** voice consumes the page's current WebMCP tools through `getTools` and `executeTool`; it never owns parallel mutation functions.
3. **No agent submission:** only the visible attestation control and human **Submit Demo** button may invoke `submitDemo`. There is no submission tool, voice function, command-palette shortcut, API endpoint, or network submission side effect.

## Architecture and boundaries

```text
human React controls ───────┐
                            ├─> application commands ─> Zustand store ─> selectors ─> visible UI
future ChatGPT Site Tools ──┘                              │
                                                           └─> validated localStorage
embedded voice ─> current WebMCP tool surface ─────────────┘
```

Dependencies point inward: domain contracts and pure selectors are below application commands and the store; the human UI and WebMCP handlers are separate callers of that facade; the optional voice bridge consumes WebMCP only. Domain code has no React, browser, WebMCP, voice, hosting, network, clock, or storage dependency.

| Boundary                         | Owns                                                                                      | Must not own                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/domain`                     | TypeBox schemas, Ajv validation, seed, normalization, progress, review, person resolution | Browser APIs, rendering, mutation effects          |
| `src/application/commands`       | Immutable validated transitions, idempotency, locks, typed receipts                       | Registration, React, network                       |
| `src/application/store`          | Persisted application snapshot, ephemeral UI snapshot, dispatch, subscriptions            | Tool-specific business branches                    |
| `src/application/persistence`    | Versioned localStorage hydration/save/fallback                                            | Network storage or UI state                        |
| `src/ui`                         | Forms, cards, navigation, review, capability/activity presentation                        | Direct state mutation or provider calls            |
| `src/webmcp`                     | Browser adapter, fake, catalog, handlers, registry lifecycle                              | Duplicated command semantics                       |
| `src/voice`                      | Current-tool mapping and Realtime/media lifecycle                                         | Application command imports or alternate mutations |
| `server` or Sites Worker adapter | Optional same-origin SDP broker with fixed server-owned config                            | Application data persistence                       |

The current repository keeps the accepted Phase 0 domain contract in `src/domain/index.ts`; future packets may split files only with explicit ownership and unchanged exports. `App.tsx` remains orchestration-only.

## Canonical contracts

### Persisted application state

The accepted state is schema version `1`, application ID `civicflow-synthetic-demo`, revision number, synthetic applicant Maya Carter, `householdConfirmed`, household members, `noIncomeConfirmed`, income sources with integer USD cents, coverage records, metadata-only demo documents, attestation, and `not_submitted` or `submitted_demo` submission state. IDs are lower-case stable strings; the seed applicant is `person-maya-carter`. State is validated at creation, command, hydration, and save boundaries. Persisted data never contains `UiState`.

Limits are 20 household members, 30 income sources, 30 coverage records, 20 demo documents, 100 KiB serialized state, 120 characters for document display names, and 1,000,000,000 cents for an income source. Covered records require a provider; `none` records have no provider or plan metadata. Natural names are normalized for comparison while display casing is retained.

### Ephemeral UI state

The store keeps active section, selection, review highlights, runtime capability summaries, newest-first activity entries capped at 20, voice status/transcript/error, and a persistence notice. These fields never increment persisted revision and are cleared on reload or deterministic reset.

### Command and receipt contract

Commands include applicant updates, household confirmation and member add/update, human-only no-income confirmation, income add/update, atomic coverage upsert, metadata-only document attach, attestation, human-only `submitDemo`, and reset. Each receives `{ source: 'human' | 'webmcp', now, newId }` and returns an immutable next state plus a receipt with `actionId`, `changed`, `stateRevision`, a safe user-readable message, and typed compact changed-entity summaries. Changes increment revision exactly once; failures and no-ops preserve revision; ordinary commands reject submitted state with `APPLICATION_LOCKED`; reset is the sole post-submit transition.

### WebMCP tool surface

The exact nine names are:

`get_application_progress`, `navigate_to_section`, `add_household_member`, `update_household_member`, `add_income_source`, `update_income_source`, `set_current_coverage`, `list_uploaded_documents`, and `review_application`.

The first, navigation, add, coverage, and document tools are static. Household and income updates are contextual to a current selection. Review is available only while Review & Sign is active. Read-only annotations are applied to progress and document listing; document listing also marks user-controlled document text as untrusted. Every input is a closed runtime-validated object, outputs are compact JSON strings capped at 1,500 characters, and no tool name contains `submit`.

Only `BrowserModelContextPort` may touch `document.modelContext`. The registry manager serializes asynchronous registration, aborts obsolete contextual registrations, rejects duplicate names, invalidates old generations, and exposes the accepted runtime snapshot to the capability panel. Contextual handlers resolve selection at execution time and return `CONTEXT_STALE` without mutation when selection is absent or deleted.

### Optional voice contract

The provider-neutral `CurrentToolSurface` snapshots and executes current WebMCP tools. A Realtime bridge maps those exact definitions to function tools, parses arguments once, executes serially through WebMCP, returns the unchanged tool result, refreshes on `toolchange`, and never adds a submission function. A same-origin SDP broker is disabled by default and, if later authorized, owns model/voice/instruction configuration, secret protection, origin/method/content-type/body checks, rate limiting, spend control, safe errors, and log redaction. Microphone access starts only after an explicit click and all tracks stop on teardown, page hide, disconnect, or fatal error. Voice can be removed without affecting P0.

## Phase map and ownership

| Plan phase                                | Ledger document                                                                       | Status        | Dependency            | Gate                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------- | --------------------- | -------------------------------------- |
| Phase 0 — foundation                      | [01-foundation.md](phases/01-foundation.md)                                           | `validated`   | approved scope        | Gate A: domain/application evidence    |
| Phase 1 — human portal                    | [02-human-portal.md](phases/02-human-portal.md)                                       | `validated`   | Phase 0               | Gate B: keyboard-completable portal    |
| Phase 2 — WebMCP capability layer         | [03-webmcp-capability-layer.md](phases/03-webmcp-capability-layer.md)                 | `validated`   | Phase 1               | Gate C: fake-port deterministic tools  |
| Phase 3 — integration and live Site Tools | [04-integration-and-live-site-tools.md](phases/04-integration-and-live-site-tools.md) | `in-progress` | Phase 2               | Gate D: supported-route live evidence  |
| Phase 4 — optional voice                  | [05-optional-voice.md](phases/05-optional-voice.md)                                   | `planned`     | Gate D                | Gate E: secure authorized voice or cut |
| Phase 5 — polish and release              | [06-polish-release-submission.md](phases/06-polish-release-submission.md)             | `planned`     | P0 and voice decision | Gate F: public release package         |

Packets are dependency ordered and cannot be combined across a phase gate. One writer owns a packet at a time. Shared-contract changes return to the owning earlier packet.

## Execution model and routing

- Planning and independent acceptance use GPT-5.6 Sol with high or max reasoning according to risk; every dispatch records model, reasoning, one-sentence rationale, and an observable escalation condition.
- Phase 1's Sites path is a single native `luna_max` root task using `gpt-5.6-luna` at `max` reasoning. It is the sole Site checkout, source, configuration, and local-preview owner for Packets 1.1–1.5. It must not invoke OMP, Gemini, Cursor, Antigravity, or a source-editing subagent.
- Later bounded implementation packets may use a native `luna_max` task only when separately dispatched with exact file and test allowlists. A Sol reviewer inspects actual state and evidence; worker completion prose never self-accepts a phase.
- Live Site Tools evidence must use a currently supported validation route, such as Sol or Terra, because Luna is not assumed to be enabled for that validation.
- Sites work uses the existing Vite capability path. Phase 1 is local-only: no initializer over the repository, remote Site creation, save, deploy, publish, hosted environment mutation, live API, secret access, commit, or push.
- The original foundation preflight had no Git `HEAD`; the requested local Phase 1 commit provided the Phase 2 baseline `923efae8634ca311672e209065b6d2d3557fcedc` on `main`. Phase 2 is now committed and published; each future phase preflight must record the exact status and avoid claiming a clean checkout without checking it.

## Testing and exact gates

Every packet follows RED, GREEN, bounded refactor, focused gate, and independent review. No skipped tests, watch mode, snapshot updates, weakened assertions, or `--passWithNoTests` are accepted.

Required scripts are `npm ci`, `npm run format:check`, `npm run lint`, `npm run scan:secrets`, `npm run typecheck`, `npm run test:unit -- --run`, `npm run test:contract -- --run`, `npm run test:e2e`, `npm run build`, and `npm run verify`. `verify` runs formatting, lint, secret scan, typecheck, unit tests, contract tests, build, and E2E in that order.

Phase 0 evidence already recorded: clean lockfile installation, 32 unit tests across five files, typecheck, lint, format check, secret scan, production build, browser smoke, and worktree scope review all passed. At that time the contract suite was intentionally empty; Phase 2 now supplies the contract/integration tests and the aggregate `verify` command passes.

The non-negotiable automated cases include exact seed/progress and review rules, every command's success/failure/no-op/idempotency/lock behavior, strict closed schemas and limits, atomic coverage, dynamic registry races, visible DOM updates before tool resolution, no submission tool or network submission, corrupt-storage recovery, hostile document text safety, accessibility, media cleanup, compact outputs, and clean-install reproducibility.

## Security, privacy, and resilience guardrails

- Every disclosure says fictional, research demo, and synthetic data only.
- No real PII, medical data, identity documents, file bytes, OCR, URLs containing state, or storage contents in tool output.
- React renders document and user strings as text; instruction-like filenames are data, not instructions.
- LocalStorage is versioned, size-capped, fully validated, and falls back to the deterministic seed with a non-sensitive notice.
- WebMCP unavailable, registration failure, stale context, corrupt storage, microphone denial, and voice/network failure leave the normal portal usable.
- Public hosting later requires HTTPS, appropriate security headers, no exposed secrets, anonymous access as authorized, and a current rules check.

## Full-feature acceptance criteria

The feature is accepted only when a keyboard-only user can complete the six-section synthetic flow without WebMCP; the exact nine tools are discoverable and update the same visible state; contextual tools appear and disappear correctly; tool results and activity are compact and truthful; no agent-facing submission path exists; manual submission performs no network request; optional voice, if claimed, uses the current WebMCP surface and passes its security/cost/live gate; clean-install format, lint, secret, type, unit, contract, build, E2E, and accessibility gates pass; the public repository, URL, license, instructions, and video satisfy the current rules; and an independent reviewer accepts the final diff and evidence.

## Open decisions and scheduled resolution

| Decision                             | Default                                                                          | Resolve by                               |
| ------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------- |
| Exact Sites/Vite integration changes | Add only the minimum supported integration if the existing-site path requires it | Phase 1 preflight and Packet 1.1         |
| Public host                          | ChatGPT Sites                                                                    | Before any authorized release deployment |
| Voice in final demo                  | Off unless Gate E is fully green                                                 | Packet 4.4 cut decision                  |
| Realtime model and voice             | Current verified official values through server configuration                    | Packet 4.2 and 4.4                       |
| P2 undo                              | Omit unless all earlier gates are green                                          | Packet 5.1                               |
| Public license                       | MIT unless the owner chooses another license                                     | Packet 5.3                               |
| Demo-freeze date                     | At least 48 hours before the current verified deadline                           | Before release planning                  |

No decision is required to create this ledger. If future evidence conflicts with the synthetic scope, shared-tool voice architecture, no-agent-submission boundary, or Sites single-owner rule, stop and request a decision.

## Current implementation evidence

Phase 1 execution began on 2026-08-27 in the Site-owning root task. The repository baseline was `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow` on branch `main` before the requested local commit; the Phase 2 baseline is commit `923efae8634ca311672e209065b6d2d3557fcedc`. The user confirmed the Phase 1 review is complete, and the coordinator accepted Gate B using the recorded evidence and current green suite. No other writer is editing the checkout.

The repository now includes the minimal `@openai/sites-vite-plugin` integration, Vite 8-compatible lockfile, `.openai/hosting.json`, and a small Worker asset wrapper required by the Sites packaging contract. Those changes were made only after the user separately authorized Phase 3 public hosting; Phase 1 remains recorded as local-only.

Phase 1 packet evidence is recorded in [02-human-portal.md](phases/02-human-portal.md). All five packets and Gate B are validated after the user's review confirmation and coordinator evidence check. The aggregate verification now includes the Phase 2 contract suite and passes.

## Current ledger acceptance state

This ledger records and accepts Phase 1 Gate B and Phase 2 Gate C. Phase 2's local deterministic Gate C evidence is recorded in [03-webmcp-capability-layer.md](phases/03-webmcp-capability-layer.md). Phase 3 public Site deployment was separately authorized and is recorded below; live Site Tools acceptance remains open until supported E1–E8 evidence exists.

### Phase 2 execution evidence

Phase 2 was dispatched as one complete OMP implementation task using `google-antigravity/gemini-3.7-flash` (`gemini-3.7-flash-high` CLI) with high reasoning, as explicitly requested. Three bounded correction runs on the same route addressed independently reproduced defects in money precision, hard result-size limits, activity-key uniqueness, and registry teardown/generation safety. The OMP evidence directories are `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-175436-732`, `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-181718-4344`, `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-182853-7146`, and `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-183359-8895`.

The Phase 2 implementation was committed locally as `d437a6ee09156d0919c767f8daf1d037b00c2e7b`, its ledger baseline correction as `c05d180aaf8af257ab865efeb20f0a06e019e0b4`, and both snapshots were published through the GitHub connector as remote commits `8d88dae839833fd7524fd6772d51b61aa8c8c66d` and `fcbdb106208bd1c5fc39d80690fe2b9669694877`. The worker added the isolated `src/webmcp` port/catalog/handler/registry layer, wired the accepted capability/activity facade into the Agent Companion, and added contract/integration coverage. Phase 2 Gate C is validated. The later Phase 3 browser suites, Sites packaging, and public deployment evidence are recorded in the sections below.

### Phase 3 local execution evidence

Phase 3 Packets 3.1 and 3.2 are locally validated on baseline `ed53c020510dc7ea25c9991eb0f31d65ef2b1610` through the OMP Gemini route. The primary evidence directory is `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-193634-13948`; the bounded correction evidence is `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260827-195356-15985`. The actual diff is limited to the Playwright fixture/config and the new browser/contract test files recorded in the Phase 3 document. Independent focused and aggregate verification passes: 6 adversarial contract tests, 19 focused new browser tests, 22 total E2E tests, 124 unit tests, 70 contract/integration tests, build, format, lint, secret scan, and typecheck. The correction restored test-runner server ownership and proves a visible DOM mutation while a delayed WebMCP result remains pending. No production/domain behavior, submission path, network mutation, branch, or HEAD changed in the worker task. Gate D requires the separately authorized public Site route and supported live E1–E8 evidence.

### Phase 3 public Sites deployment evidence

The user authorized the public Sites route on 2026-08-27. CivicFlow was saved as Sites version 1 from source commit `537493810e06be0bcca5c42a7a80552663595336` and published at `https://civicflow.codesm.chatgpt.site`. The first deployment's worker logs showed the asset binding returned 404 for `/`; the root cause was the static asset service requiring an explicit `/index.html` request. The minimal Worker wrapper fix was committed as `7a15a7d0f0afa7c58959dba82825b36c47954052`, published through the GitHub connector as `6d70ca74177e0a3dee5c6c2d89834c066ec52260`, pushed to the Sites source branch, saved as Sites version 2, and redeployed successfully. The final Site is public and the latest version is 2. The local aggregate `npm run verify` passed after the fix, and the deployment URL is production.

The supported live E1–E8 audit was attempted after deployment but could not proceed: the in-app Browser URL policy rejected the `codesm.chatgpt.site` page before the tab could be claimed. Per the browser safety boundary, no alternate browser, raw network, or indirect execution route was used. Therefore Gate D remains open: deployment is evidenced, but no live Site Tools discovery/execution claims are made until a supported browser route can claim the public page.
