# Phase 0 — repository and contract foundation

## Status

`validated` as of 2026-08-27, with the ledger created afterward. The implementation is present in the uncommitted CivicFlow checkout; no commit or push was made. The Phase 0 aggregate gate excludes the future contract suite, which is intentionally empty until Phase 2.

## Goal

Provide a deterministic, browser-independent domain and application foundation that every later UI, WebMCP, and voice path can share. The foundation owns strict persisted state, pure progress/review rules, immutable commands and receipts, vanilla Zustand dispatch, validated local persistence, and deterministic reset.

## Problem Evidence

The repository began as an empty Git checkout with no application files or ledger. The approved plan requires a six-section synthetic benefits workspace, a 20% Maya Carter seed, exact 20 → 40 → 60 progress behavior, a human-only submission boundary, idempotent commands, and validated localStorage before UI or WebMCP work can begin. Phase 0 was implemented and independently rechecked; the current source tree is the evidence rather than the initial empty state.

## Design

- React/Vite/TypeScript tooling is strict and reproducible from `package-lock.json`.
- TypeBox schemas compiled by Ajv reject unknown properties and enforce entity, money, timestamp, and document limits. Cross-field checks enforce unique IDs, valid references, coverage metadata, attestation timestamps, and submission timestamps.
- The deterministic seed contains synthetic Maya Carter data and no real PII. Selectors calculate section weights, review blockers, person resolution, and submission readiness without time, browser, or mutation effects.
- Commands accept injected `{ source, now, newId }`, clone changed structures, validate the next state, increment revision once, return typed receipts, and reject ordinary changes after demo submission. Human-only no-income confirmation is not a WebMCP operation.
- The store exposes one dispatch facade to React and non-React callers. Application state and UI state are separate; only application state is persisted. Invalid, unknown-version, oversized, or unreadable storage falls back to the seed with a non-sensitive notice.

## Likely Files

The approved plan's conceptual split was reconciled to the actual repository without changing the Phase 0 public exports:

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/package.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/package-lock.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tsconfig.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tsconfig.app.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tsconfig.node.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/vite.config.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/vitest.config.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/vitest.contract.config.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/playwright.config.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/eslint.config.js`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/.prettierrc.json`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/.gitignore`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/scripts/scan-secrets.mjs`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/app/App.tsx`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/app/App.test.tsx`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/domain/index.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/domain/application.test.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/command-types.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/commands.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/commands.test.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/persistence.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/persistence.test.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/store.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/application/store.test.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/main.tsx`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/styles.css`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/test/setup.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/e2e/smoke.spec.ts`

Later phases may split `src/domain/index.ts` into schema, seed, normalization, selectors, and errors modules only if exports and ownership remain compatible. Phase 1 must not edit these accepted contracts.

## Tasks

Packets 0.1 through 0.5 below are the atomic implementation and review tasks. They remain dependency ordered and cannot be combined across the Phase 0 gate.

## Packets

### Packet 0.1 — baseline and toolchain

- **Status:** `validated`
- **Depends on:** approved product plan and repository access
- **Allowlist:** package and lockfile; TypeScript/Vite/Vitest/Playwright/ESLint/Prettier configs; `src/app/App.tsx`; `src/app/App.test.tsx`; `src/main.tsx`; `src/styles.css`; `src/test/setup.ts`; `tests/e2e/smoke.spec.ts`; `scripts/scan-secrets.mjs`; ignore files
- **Owns:** strict build/test scripts and a synthetic-demo shell; it may not own domain behavior, WebMCP, voice, or deployment
- **RED:** importing the missing app shell and browser smoke route fails before scaffolding
- **GREEN:** strict React/Vite/TypeScript shell, clean-installable dependencies, scripts, smoke unit test, browser smoke, and production build
- **Focused gate:** `npm run test:unit -- --run src/app/App.test.tsx` and `npm run build`
- **Acceptance:** the shell renders, the lockfile installs cleanly, the production build succeeds, and no secrets or external source edits exist
- **Aggregate after integration:** `npm run format:check`, `npm run lint`, `npm run scan:secrets`, `npm run typecheck`, unit tests, and build
- **Non-goals:** product forms, persistence, WebMCP, voice, Sites hosting, and visual polish

### Packet 0.2 — canonical schemas and seed

- **Status:** `validated`
- **Depends on:** 0.1
- **Allowlist:** `src/domain/index.ts` and `src/domain/application.test.ts`
- **Owns:** TypeBox/Ajv application state, strict cross-field invariants, normalization helpers, deterministic seed, caps, and injected-boundary types
- **RED:** invalid ages, non-integer or over-limit money, closed-object extras, duplicate or invalid references, covered-without-provider, none-with-details, invalid timestamps, overlong document names, and wrong seed fixtures fail
- **GREEN:** strict schema validation, synthetic Maya seed, normalized name keys, entity caps, and explicit cross-field errors
- **Focused gate:** `npm run test:unit -- --run src/domain`
- **Acceptance:** the seed is exact and 20% complete; invalid values fail without browser imports; document names stay plain text and capped at 120; money is integer cents capped at $10,000,000
- **Aggregate after integration:** all domain tests, typecheck, lint, format, and build
- **Non-goals:** command dispatch, storage, React, tools, or voice

### Packet 0.3 — pure selectors

- **Status:** `validated` within the domain module
- **Depends on:** 0.2
- **Allowlist:** `src/domain/index.ts` and `src/domain/application.test.ts`
- **Owns:** person resolution, completion criteria, weighted progress, review issue order, and `canSubmitDemo`
- **RED:** table-driven progression, coverage, no-income, document, attestation, ambiguity, and issue-code fixtures fail before selectors exist
- **GREEN:** pure selectors with stable section ordering and no mutation, time, storage, or browser access
- **Focused gate:** `npm run test:unit -- --run src/domain`
- **Acceptance:** the golden seed path reports exactly 20%, 40%, and 60%; review blockers identify the right section and person; selectors preserve input
- **Aggregate after integration:** all domain/application tests, typecheck, lint, format, and build
- **Non-goals:** UI highlighting, navigation, or tool registration

### Packet 0.4 — commands and typed receipts

- **Status:** `validated`
- **Depends on:** 0.2 and 0.3
- **Allowlist:** `src/application/command-types.ts`, `src/application/commands.ts`, and `src/application/commands.test.ts`; two compatibility-only receipt fixtures in `src/application/store.test.ts`
- **Owns:** applicant edits, household confirmation/member add-update, human-only no-income confirmation, income add-update, atomic coverage, metadata-only documents, attestation, manual submit, reset, idempotency, locks, revisions, and `ChangedEntitySummary[]`
- **RED:** every command's failure, success, no-op, idempotency, atomicity, duplicate, ambiguity, boundary, and submitted-lock fixture fails before implementation
- **GREEN:** immutable validated transitions with injected clock/ID, safe messages, changed-entity summaries, exact one-revision changes, no I/O, and no submission tool/path
- **Focused gate:** `npm run test:unit -- --run src/application/commands.test.ts`
- **Acceptance:** invalid multi-person coverage never partially applies; duplicate adds are no-ops; hostile document names remain data; submit enforces review and attestation without network; reset restores seed at revision 0
- **Aggregate after integration:** all domain/application tests, typecheck, lint, format, and build
- **Non-goals:** Zustand, React, WebMCP, voice, API, or hosting

### Packet 0.5 — store and versioned persistence

- **Status:** `validated`
- **Depends on:** 0.4
- **Allowlist:** `src/application/store.ts`, `src/application/store.test.ts`, `src/application/persistence.ts`, and `src/application/persistence.test.ts`
- **Owns:** vanilla Zustand facade, command context injection, atomic application/UI snapshots, localStorage key `civicflow.application.v1`, validated hydration/save, persistence notices, activity cap, and UI reset
- **RED:** hydration, malformed/unknown-version/oversized storage, write failure, ephemeral state exclusion, subscriber snapshots, no-op transition safety, submitted lock, and reset fixtures fail before implementation
- **GREEN:** one dispatch boundary for React and non-React callers, seed fallback, changed-state persistence, no persisted UI state, newest-20 activity, and deterministic reset
- **Focused gate:** `npm run test:unit -- --run src/application`
- **Acceptance:** corrupt storage cannot crash startup; UI-only actions never revise or persist application state; changed application state remains in memory if saving fails; reset clears ephemeral state atomically
- **Aggregate after integration:** all domain/application tests, typecheck, lint, format, and build
- **Non-goals:** WebMCP registration, voice, network storage, or UI sections

## Phase 0 evidence record

- **Attempt date:** 2026-08-27, Asia/Kolkata
- **Worker routes:** bounded GPT-5.6 Terra high workers, followed by independent root review
- **Routing rationale:** bounded foundation packets were implemented independently so the shared contracts could be reviewed before UI work
- **Escalation condition:** return to the owning packet for any schema, receipt, persistence, or invariant defect; do not repair inside a later phase
- **Baseline:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, `HEAD unavailable: no commits yet`
- **Initial status:** all scaffold and Phase 0 files untracked; no existing source diff; no ledger before this task
- **RED/GREEN evidence:** each packet supplied a focused failing test and a passing focused gate; the root reran the final suite independently
- **Final focused results:** `npm ci --ignore-scripts` passed; `npm run test:unit -- --run` passed with 5 files and 32 tests; `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run scan:secrets`, `npm run build`, and `npm run test:e2e` passed
- **Aggregate result:** `npm run verify` passed through format, lint, secret scan, typecheck, and all 32 unit tests, then stopped at `npm run test:contract` with `No test files found`; Phase 2 owns creation of that suite, so this does not invalidate Gate A
- **Independent review:** root inspected actual files, fixed receipt/no-op and coverage-order edge cases through bounded workers, reran gates, and confirmed no submission/network/voice code
- **Status decision:** `validated` for Phase 0; Phase 1 remains blocked until this ledger is accepted and its own task is explicitly dispatched

## Acceptance Criteria

Gate A is satisfied when the state/selector/command/store contracts are strict, immutable, deterministic, independently reviewed, and green under the Phase 0 commands. The current evidence satisfies that gate. No later packet may change these contracts without returning here.

## Non-Goals

No human portal sections, WebMCP adapter/catalog/registry, voice, server, Site initialization, deployment, or public release work belongs in this phase.

## Review Risks

- The repository has no commit, so future workers must attribute changes using the recorded untracked baseline and exact file lists.
- The accepted conceptual domain split is currently one `index.ts`; later refactors must preserve imports and tests.
- The aggregate contract suite is intentionally absent until Phase 2; do not bypass that future gate or treat it as a Phase 0 failure.
- Any Phase 1 requirement that cannot be satisfied through the existing commands/store is a Phase 0 reassignment, not a UI workaround.

## Independent reviewer checklist

- Confirm the actual Phase 0 file set and no overlap with later-phase files.
- Rerun all Phase 0 focused and aggregate commands and inspect failures rather than worker prose.
- Verify persisted JSON contains application state only and no UI, tool, voice, or secret data.
- Verify command receipts include messages and summaries, revisions are exact, submit performs no I/O, and reset is the only post-submit transition.
- Verify the three invariants remain intact and record any contradiction as a decision or blocker.
