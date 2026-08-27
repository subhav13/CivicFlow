# First implementation handoff — prepared, not dispatched

## Route decision

This file is retained at the ledger-required path, but CivicFlow Phase 1 is not an Antigravity route. The approved Sites ownership contract requires one native Codex custom agent `luna_max` to be the Site-owning root task and sole Phase 1 source editor. No Antigravity, OMP, Gemini, Cursor, or source-editing subagent may edit the Sites checkout.

## Dispatch contract for the next approved task

- **MODEL:** `gpt-5.6-luna` through the native custom agent `luna_max`
- **REASONING:** `max`
- **ROUTING RATIONALE:** Phase 1 is a bounded human-portal implementation over independently accepted Phase 0 contracts, and the Sites single-owner rule requires one root task to retain source, configuration, and local-preview ownership.
- **ESCALATION CONDITION:** stop before editing if the Phase 0 gate is not accepted, the ledger is not accepted, dirty overlap cannot be attributed, the existing Vite/Sites capability path requires a broader redesign, a needed change falls outside the Phase 1 allowlist, or completion would require deployment, secrets, live APIs, commit, push, or another external mutation.

## Repository and source context

- **Repository:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`
- **Branch:** `main`
- **HEAD:** unavailable at ledger creation because the repository has no commits yet
- **Planning baseline:** `/Users/SubhavMathur/.codex/.chatgpt-projects/g-p-6a8f4e433074819184bcac6f1ff0e3d3/CIVICFLOW_IMPLEMENTATION_PLAN.md`
- **Phase 1 prompt:** `/Users/SubhavMathur/.codex/attachments/cc4456fa-b3dc-46a5-b8f7-3dc8b5a226e0/pasted-text.txt`
- **Ledger:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/docs/codex-feature/civicflow-webmcp-v1/`
- **Baseline status:** Phase 0 source/config/test files are uncommitted user-owned work; inspect the actual status before editing and attribute only new Phase 1 files
- **Phase 0 evidence:** clean lockfile install; 32 unit tests; typecheck, lint, format, secret scan, build, and browser smoke passed; aggregate `verify` is pending the future Phase 2 contract suite

## Sole task scope: Packet 1.1 only

Implement only the application shell and responsive navigation described in [02-human-portal.md](phases/02-human-portal.md):

- six fixed section labels in order: About You, Household, Income, Current Coverage, Documents, Review & Sign;
- synthetic/research-demo disclosure;
- initial progress of exactly 20% from the accepted seed;
- desktop right-side Agent Companion and accessible mobile drawer affordance;
- semantic landmarks, heading/focus order, keyboard navigation, responsive behavior, and no horizontal overflow at 375px;
- truthful unavailable/empty companion state, without hard-coded WebMCP tools or activity;
- no WebMCP, voice, authentication, database, upload, network, or submission implementation.

## Exact file allowlist

The task may add or edit only:

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/app/App.tsx` and orchestration-only app wiring
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/layout/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/agent-companion/` only for the truthful empty/unavailable shell state
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/components/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/styles.css` or a Phase 1 styles directory
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/layout/ApplicationShell.test.tsx`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/e2e/responsive-shell.spec.ts`

Do not edit `src/domain`, `src/application`, WebMCP, voice, server, `.openai/hosting.json`, package/configuration files, deployment state, or later ledger status unless a separate reviewed allowlist authorizes the minimum Sites/Vite integration.

## TDD and verification contract

1. Inspect the current ledger, repository instructions, status, package scripts, and Phase 0 evidence.
2. Add the focused shell unit and browser tests and record their real RED failures.
3. Implement the smallest coherent product-specific shell.
4. Refactor only within the allowlist.
5. Run:

```text
npm run test:unit -- --run src/ui/layout/ApplicationShell.test.tsx
npm run test:e2e -- tests/e2e/responsive-shell.spec.ts
npm run typecheck
```

6. Inspect actual status/diff and return changed files, RED/GREEN output, risks, and unresolved decisions. The first meaningful local preview may be started and opened in Codex only after the shell compiles and responds; it must stay local.

No skipped tests, watch mode, snapshot updates, weakened assertions, or `--passWithNoTests` are allowed. Do not perform browser screenshots, DOM inspection, visual QA, Site initialization, Site creation, version save, deployment, publishing, hosted configuration changes, live APIs, secret access, commit, push, or handoff to another source editor.

## Required return format

```text
Baseline path/branch/HEAD/status:
Actual changed files:
RED tests and observed failures:
GREEN focused commands and exact results:
Typecheck/build result:
Local preview URL and Codex handoff result:
Assumptions and unresolved decisions:
Remaining risks:
```

This handoff is a prepared artifact only. It must be explicitly approved and dispatched after independent ledger review; creating it did not start implementation.
