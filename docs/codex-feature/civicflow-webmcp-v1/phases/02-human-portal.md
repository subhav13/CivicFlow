# Phase 1 — complete human portal

## Status

`codex-review`. Phase 0 Gate A remains independently accepted. Packets 1.1 through 1.5 have implementation evidence in this task; independent review and the later Phase 2 contract suite remain outstanding.

## Goal

Build the complete six-section CivicFlow human portal over the accepted Phase 0 command and store facade. The portal must work with WebMCP, Site Tools, voice, authentication, database, upload, and network features absent. It must be keyboard-completable and visually communicate a fictional synthetic research demo.

## Problem Evidence

The current UI is only a shell with the synthetic-demo heading. The store, commands, selectors, and persistence are available, but no user can yet navigate the six sections, edit Maya, add Emma, record Acme Dental income, set explicit coverage, attach a preset document, review blockers, attest, submit locally, or reset. The attached Phase 1 prompt requires Packets 1.1–1.5 and a local-only Sites existing-Vite capability path.

## Design

- `App.tsx` composes the store, layout, section routing, and adapters; it contains no business rules.
- Components read the current application snapshot and derive progress/issues through Phase 0 selectors. Every data change dispatches an accepted command with `source: 'human'`; UI navigation, selection, focus, drawer state, activity presentation, and review highlights remain ephemeral.
- Desktop uses an identity/status bar, left progress rail, central application workspace, and sticky right Agent Companion. At tablet/mobile widths, section navigation is compact or horizontally scrollable and the companion is a labeled drawer that does not cover the active form by default.
- Forms use programmatic labels, described errors, keyboard-operable cards, visible selection state, polite live announcements, coherent focus movement after explicit navigation, reduced-motion support, and no horizontal overflow at 375px.
- Agent Companion is truthful before Phase 2: it displays a runtime unavailable or empty capability state and does not invent tool names or agent activity.
- Documents are preset metadata only. No file input, bytes, object URL, OCR, network, or upload dependency is allowed. All user-controlled strings render as text.
- The manual submission surface contains the attestation checkbox and visible **Submit Demo** button only. It calls the accepted `submitDemo` command locally, says “Synthetic demo submitted locally,” locks ordinary edits, and exposes reset confirmation.

## Likely Files

Phase 1 may add or edit only these repository-local areas, after reconciling the actual tree:

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/app/App.tsx` and orchestration-only app helpers
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/layout/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/sections/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/components/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/agent-companion/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/styles/` or the existing `src/styles.css`
- phase-specific unit/component tests under `src/ui/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/integration/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/e2e/`

`package.json`, `package-lock.json`, `vite.config.ts`, `.openai/hosting.json`, and other configuration files are conditional. They may change only when the accepted ledger review proves the minimum existing-Vite Sites integration requires them. Never initialize a new Site over this repository or replace the accepted scaffold. Do not edit `src/domain`, `src/application`, WebMCP, voice, server, deployment, or later-phase ledger status to make Phase 1 pass.

## Tasks

Packets 1.1 through 1.5 below are the atomic implementation and review tasks. They must run sequentially under one Sites-owning root task.

## Packets

### Packet 1.1 — application shell and responsive navigation

- **Status:** `codex-review`
- **Depends on:** Phase 0 Gate A
- **Owns:** product-specific shell, six labels in fixed order, progress header, disclosure, step rail, navigation semantics, responsive companion affordance, base styles, and shell tests
- **RED:** `src/ui/layout/ApplicationShell.test.tsx` and `tests/e2e/responsive-shell.spec.ts` fail for missing labels/order, 20% initial progress, disclosure, landmarks, keyboard navigation, mobile affordance, or 375px overflow
- **GREEN:** render a coherent application viewport with About You, Household, Income, Current Coverage, Documents, and Review & Sign; provide a visible sequential Next control on every section (disabled with an explanatory final-section note on Review & Sign); desktop right panel; accessible mobile drawer; no WebMCP dependency
- **Focused gate:** `npm run test:unit -- --run src/ui/layout/ApplicationShell.test.tsx`, `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`, and `npm run typecheck`
- **Preview gate:** after the coherent product-specific route compiles, the Site-owning root task may start the normal local preview and open it in Codex for user feedback. This is not deployment or visual acceptance.
- **Acceptance:** headings and landmarks are coherent, section navigation and the visible Next controls work by keyboard, initial progress is exactly 20%, companion state is truthful, and no horizontal overflow exists at 375px
- **Refactor limit:** shared presentational primitives and styles only; no form business logic or WebMCP registration
- **Aggregate after integration:** Phase 1 unit/component suite, typecheck, format, lint, secret scan, and current E2E smoke
- **Non-goals:** working data forms, tool catalog, voice, Site save/deploy, or remote configuration

### Packet 1.2 — About You and Household

- **Status:** `codex-review`
- **Depends on:** 1.1
- **Owns:** editable synthetic applicant fields, validation display, household member add/edit cards, selection/deselection, explicit no-other-member confirmation, and accessible field/card primitives
- **Allowlist:** `src/ui/sections/AboutSection.tsx`, `HouseholdSection.tsx`, shared UI fields/cards, their tests, and permitted app wiring
- **RED:** tests fail for required labels, invalid/blank applicant updates, normal add/edit validation, selection state, duplicate member behavior, confirmation, and keyboard card actions
- **GREEN:** dispatch `updateApplicant`, `addHouseholdMember`, `updateHouseholdMember`, and `confirmHousehold` only through the public store facade; selected cards use `aria-selected` or equivalent; receipts are available for later activity presentation
- **Focused gate:** `npm run test:unit -- --run src/ui/sections/AboutSection.test.tsx src/ui/sections/HouseholdSection.test.tsx` and `npm run typecheck`
- **Acceptance:** a human can edit Maya, add synthetic Emma as a seven-year-old daughter applying for coverage, select/deselect the card, and reach household progress completion without direct state mutation
- **Refactor limit:** no domain or command contract changes; if a missing transition blocks the form, stop and return to Phase 0
- **Aggregate after integration:** full Phase 1 unit/component suite plus shell E2E and build
- **Non-goals:** agent tools, income, coverage, document bytes, submission, or voice

### Packet 1.3 — Income and Current Coverage

- **Status:** `codex-review`
- **Depends on:** 1.2
- **Owns:** income cards/forms, human dollars-to-cents conversion and validation, income selection, coverage controls for every applying person, explicit none/covered details, and selection behavior
- **Allowlist:** `src/ui/sections/IncomeSection.tsx`, `CoverageSection.tsx`, currency/input helpers, tests, and permitted app wiring
- **RED:** tests fail for empty/non-finite/excess-precision/out-of-range dollars, currency formatting, owner choice, duplicate/no-op behavior, coverage for all applying people, none-clears-details, and selection/deselection
- **GREEN:** dispatch `addIncomeSource`, `updateIncomeSource`, and atomic `setCurrentCoverage` through the facade; keep money as integer cents; do not infer coverage; keep the human no-income branch unavailable when recorded sources exist while preserving the Phase 0 invariant
- **Focused gate:** `npm run test:unit -- --run src/ui/sections/IncomeSection.test.tsx src/ui/sections/CoverageSection.test.tsx src/domain/selectors.test.ts` and `npm run typecheck`
- **Acceptance:** adding Emma and Acme Dental at $4,950 monthly reaches exactly 60%; changing to $5,100 is stable; explicit `none` records exist for Maya and Emma; provider and plan clear when status is none
- **Refactor limit:** no selector, schema, command, or persistence edits; conversion helpers must be local UI adapters with boundary tests
- **Aggregate after integration:** full Phase 1 suite, build, shell E2E, and no-network scan
- **Non-goals:** natural-name WebMCP resolution, tool lifecycle, voice, eligibility, or government integration

### Packet 1.4 — Documents and review

- **Status:** `codex-review`
- **Depends on:** 1.3
- **Owns:** preset synthetic document controls, document cards, deterministic review summary, issue links, highlights, and focus/navigation behavior
- **Allowlist:** `src/ui/sections/DocumentsSection.tsx`, `ReviewSection.tsx`, issue-summary/link components, tests, and permitted app wiring
- **RED:** tests fail for metadata-only attach, no file input, no request, hostile instruction-like display names, proof-of-income blocker clearing, issue ordering, issue-link navigation, and focus target
- **GREEN:** dispatch `attachDemoDocument` and selector-derived review state; render every document string as plain text; attach only built-in synthetic metadata presets
- **Focused gate:** `npm run test:unit -- --run src/ui/sections/DocumentsSection.test.tsx src/ui/sections/ReviewSection.test.tsx` and `npm run typecheck`
- **Acceptance:** attaching proof of income clears only the proof blocker when income exists; hostile names remain text; review issues link to the correct section/field; no file or network path exists
- **Refactor limit:** no direct recomputation of progress/review rules and no tool result logic
- **Aggregate after integration:** full Phase 1 suite, build, E2E, and a fetch spy showing no document or submission request
- **Non-goals:** upload services, OCR, document classification, WebMCP, or agent actions

### Packet 1.5 — attestation, human-only submission, and reset

- **Status:** `codex-review`
- **Depends on:** 1.4
- **Owns:** attestation checkbox, visible Submit Demo control, submitted state, local success copy, locked edit presentation, reset confirmation, and manual submission integration test
- **Allowlist:** review controls, submitted-state/reset-dialog components, `tests/integration/manual-submission.test.tsx`, and permitted app wiring
- **RED:** tests fail for blockers, missing attestation, valid submission, double submission, edit-after-submit lock, reset confirmation, deterministic seed restoration, and zero outbound submission requests
- **GREEN:** dispatch `setAttestation`, `submitDemo`, and `resetDemo` only from visible human controls; never expose a keyboard shortcut, command-palette action, WebMCP handler, voice function, or API path for submission
- **Focused gate:** `npm run test:unit -- --run tests/integration/manual-submission.test.tsx` and `npm run typecheck`
- **Acceptance:** blockers and missing attestation prevent submission; valid submission says it is local, fictional, and synthetic; ordinary edits lock; reset requires confirmation and restores the exact seed; fetch/XHR/beacon spy records zero submission requests
- **Refactor limit:** no command semantics or persistence changes; a failed command remains visible and recoverable
- **Aggregate after integration:** full unit/component suite, E2E golden human path, format, lint, secret scan, typecheck, build, and `npm run verify` after Phase 2 contract tests exist
- **Non-goals:** agent submission, remote application, live API, Site deployment, or voice

## Acceptance Criteria

Gate B is green only when a keyboard-only user can move through all six sections, edit the seeded applicant, add Emma, add the Acme Dental income, explicitly set coverage, attach a demo document, follow review links, attest, submit locally, and reset deterministically. The portal works with WebMCP and voice absent; the Agent Companion does not invent capabilities; all focused tests, typecheck, build, E2E, accessibility, and aggregate requirements pass; no Phase 0 contract was edited; and no remote Site or hosted state was changed.

## Non-Goals

Do not add WebMCP registration or catalog, voice, server/API, authentication, database, file upload, real eligibility, external submission, remote Sites operations, public deployment, or a new design system beyond the coherent portal surface.

## Review Risks

- A React shortcut could duplicate command logic or mutate Zustand internals; reviewer must trace every data action through the public facade.
- Review components may accidentally recalculate progress or issue codes; assertions must use selector output and user-visible behavior.
- A submission button can accidentally use a form action or navigation; the network spy and source scan are mandatory.
- Responsive drawer focus and semantic card selection can regress while preserving desktop screenshots; keyboard and 375px tests are required.
- Sites integration may tempt a scaffold replacement; existing-Vite preservation is a hard stop condition.

## Worker evidence and independent review

The worker must return packet-by-packet RED and GREEN output, exact changed files, baseline branch/HEAD/status, focused commands, typecheck/build results, preview handoff result, assumptions, and unresolved decisions. The independent reviewer must inspect the actual diff, confirm no Phase 0 or later-phase files were edited, exercise the six-section keyboard flow, check the no-network submission boundary, and leave the phase `planned`, `codex-review`, `validated`, or `blocked` based on evidence rather than prose.

## Sites boundary

Use the existing Vite Sites capability path only if the phase allowlist and current Sites documentation show a minimum required integration. The Site-owning root task alone may edit the checkout, start and hand off the first meaningful local preview, or operate Sites. Phase 1 remains local-only: no Site initializer, project creation, version save, deploy, publish, hosted environment variable change, commit, push, live API, or secret access.

## Execution evidence

- **2026-08-27 preflight:** repository `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, no Git `HEAD`; status contains only the known uncommitted scaffold, Phase 0 implementation, and feature ledger. There are no nested repository instructions and no `.openai/hosting.json`. Phase 0 focused tests, typecheck, lint, format, secret scan, build, and browser smoke were green; aggregate verification stops only at the intentionally empty later Phase 2 contract suite.
- **Sites boundary decision:** local Vite preview is retained. `@openai/sites-vite-plugin` is absent and its supported package requires a hosting manifest/project identifier plus Vite 8; adding those would exceed this local-only phase and invent external state. No Sites configuration or remote resource was changed.
- **Packet 1.1 RED:** the initial shell tests failed because the application still exposed only the seed heading/placeholder route and did not render the six product labels, companion state, or responsive navigation contract. **GREEN:** `npm run test:unit -- --run src/ui/layout/ApplicationShell.test.tsx` passed 2 tests, including dialog focus return and Escape handling; `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts` passed 1 test at 375px with no horizontal overflow; `npm run typecheck` passed. The local Vite preview was started with `npm run dev -- --host 127.0.0.1 --port 4173` and opened in Codex with a queued handoff; no deployment or Site mutation occurred.
- **Packet 1.2 RED:** the initial About/Household tests failed on the placeholder route and missing normal form/card behavior. **GREEN:** `npm run test:unit -- --run src/ui/sections/AboutSection.test.tsx src/ui/sections/HouseholdSection.test.tsx` passed 3 tests; `npm run typecheck` passed. The UI dispatches only the accepted applicant/member/confirmation commands, and selection remains UI-only.
- **Packet 1.3 RED:** the initial Income/Coverage tests failed on missing section controls and validation behavior. **GREEN:** `npm run test:unit -- --run src/ui/sections/IncomeSection.test.tsx src/ui/sections/CoverageSection.test.tsx src/domain/application.test.ts` passed 10 tests; `npm run typecheck` passed. The mandated `src/domain/selectors.test.ts` path does not exist in the accepted repository; selector coverage is in `src/domain/application.test.ts`, and no Phase 0 domain file was added. The UI uses a prefixed browser ID factory in `src/ui/use-civic-flow-store.ts` so generated persisted IDs satisfy the accepted leading-letter schema without editing Phase 0 store code.
- **2026-08-27 no-income/navigation correction:** the clean empty-income branch now confirms no income successfully; when a recorded source exists, `Confirm no income` is disabled and a visible note explains that the Phase 0 invariant requires an empty income list. The command contract remains unchanged, so recorded income is never silently discarded. `ApplicationShell` now renders a visible `Next: <section>` control after every section and a disabled final-section control on Review & Sign. Existing section tests were scoped to the navigation landmark so the new controls do not create ambiguous queries. `npm run test:unit -- --run src/ui/sections/IncomeSection.test.tsx src/ui/layout/ApplicationShell.test.tsx` passed 7 tests; `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts tests/e2e/golden-path.spec.ts` passed 2 tests including browser traversal through all sections; and `npm run format:check` passed.
- **Packet 1.4 RED:** the initial Documents/Review tests failed because the route had no preset attach controls, metadata list, or selector-driven issue list. **GREEN:** `npm run test:unit -- --run src/ui/sections/DocumentsSection.test.tsx src/ui/sections/ReviewSection.test.tsx` passed 3 tests after adding a regression case for focusing the specific applying person missing coverage; `npm run typecheck` passed. The review list uses `getReviewIssues`, proof attachment is metadata-only, hostile-looking names remain text, and issue actions navigate and focus the target field.
- **Packet 1.5 RED:** the exact integration command initially found no tests because the scaffold Vitest include covered only `src`; after the minimal include was extended to `tests/**/*.test.*`, the new test first exposed jsdom's absent `sendBeacon` API and then the missing-attestation expectation. Those harness issues were corrected without weakening the product assertions. **GREEN:** `npm run test:unit -- --run tests/integration/manual-submission.test.tsx` passed 1 test; `npm run typecheck` passed. The test proves 20 → 40 → 60 progress, proof-blocker clearing, missing-attestation blocking, local submission, the disabled submitted control (double-submit lock), zero fetch/XHR/beacon calls, edit locking, reset-dialog focus and Escape dismissal, and confirmed reset to the seed. `npm run test:e2e -- tests/e2e/golden-path.spec.ts` passed 1 keyboard-operable browser flow.
- **Aggregate GREEN:** `npm run format:check`, `npm run lint`, `npm run scan:secrets`, `npm run typecheck`, `npm run test:unit -- --run` (13 files, 48 tests), `npm run build`, and `npm run test:e2e` (3 tests) passed after the no-income/navigation correction. The exact `npm run verify` command passes those gates and then stops at `No test files found` for `tests/contract/**/*.test.ts`; that suite belongs to Phase 2 and remains a Phase 1 exit blocker under the approved prompt.
- **Actual Phase 1 files:** `src/app/App.tsx`; `src/styles.css`; `src/test/setup.ts`; `src/ui/layout/ApplicationShell.tsx`, `section-meta.ts`, and tests; `src/ui/agent-companion/AgentCompanion.tsx`; `src/ui/components/FormField.tsx` and `SectionPrimitives.tsx`; `src/ui/sections/AboutSection.tsx`, `HouseholdSection.tsx`, `IncomeSection.tsx`, `CoverageSection.tsx`, `DocumentsSection.tsx`, `ReviewSection.tsx`, and tests; `src/ui/currency.ts`, `types.ts`, `use-civic-flow-store.ts`; `tests/integration/manual-submission.test.tsx`; and `tests/e2e/golden-path.spec.ts` plus the existing shell specs. `vitest.config.ts` received the minimal test-discovery include needed for the ledger-allowlisted integration test. No Phase 0 domain/application source, WebMCP, voice, server, deployment, or later-phase ledger file was edited.
- **Boundary confirmation:** only this Site-owning root task edited the checkout. No OMP, Gemini, Cursor, Antigravity, or source-editing subagent was invoked; no commit, push, remote Site create/save/deploy/publish, hosted environment mutation, live API call, or secret access occurred. The only external UI action was opening the local preview in Codex.
