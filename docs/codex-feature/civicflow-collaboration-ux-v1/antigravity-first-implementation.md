# CivicFlow visible collaboration UX — first implementation handoff contract

## Status

`activated for Packet 1.1; Packet 1.1 validated; Phase 1 remains in-progress.` The user explicitly authorized OMP implementation. Packet 1.1 used `google-antigravity/claude-sonnet-4-6` at high reasoning; no quota exhaustion or fallback signal was observed. Later packets require a fresh evidence-backed dispatch record and must not infer paid capacity or silently substitute a provider.

### Packet 1.1 dispatch record

- **Date:** 2026-08-27, Asia/Kolkata
- **MODEL:** `google-antigravity/claude-sonnet-4-6`
- **REASONING:** `high`
- **ROUTING RATIONALE:** Packet 1.1 changes a shared ephemeral lifecycle contract and therefore needed deterministic TDD with an independently reviewed pure reducer.
- **ESCALATION CONDITION:** stop on scope overlap, unrelated failures, model unavailability, or confirmed exhaustion of all three Antigravity credentials; the run completed without a fallback.
- **Result:** RED missing-module failure was observed, GREEN passed with 32 focused tests, all packet gates passed, and exactly the two allowlisted files were added.
- **Remote boundary:** no commit, push, deployment, Site save, live call, or hosted mutation occurred.

### Packet 1.2 dispatch record

- **Date:** 2026-08-27, Asia/Kolkata
- **MODEL:** `google-antigravity/claude-sonnet-4-6`
- **REASONING:** `high`
- **ROUTING RATIONALE:** Packet 1.2 changed the shared Zustand store contract and required preserving synchronous command and persistence invariants.
- **ESCALATION CONDITION:** stop on scope overlap, unrelated failures, model unavailability, or confirmed exhaustion of all three Antigravity credentials; implementation and two bounded fixes completed without a fallback.
- **Result:** initial Packet 1.2 RED/GREEN added 12 store/activity tests; two independent review fixers added operation-descriptor consumption, defensive recovery copying, and pre-dispatch applying publication. Final focused tests passed 56/56 and the full suite passed 172/172.
- **Remote boundary:** no commit, push, deployment, Site save, live call, or hosted mutation occurred.

## Required dispatch header

Every activated handoff begins with an exact record:

```text
MODEL: exact available identifier
REASONING: exact supported effort
ROUTING RATIONALE: Phase 1 changes shared ephemeral store contracts and requires deterministic TDD without UI or WebMCP semantic expansion.
ESCALATION CONDITION: Stop if baseline tests fail, shared files contain unattributed user changes, the current store cannot keep operation state outside persisted application data, or the requested model/route is unavailable.
```

## First authorized scope when activated

Implement only Phase 1 Packet 1.1 from `phases/01-feedback-foundation.md`: the pure operation lifecycle contract and reducer.

### Required reading

1. `../civicflow-webmcp-v1/MASTER.md`
2. `MASTER.md`
3. `UPDATE_PROTOCOL.md`
4. `phases/00-index.md`
5. `phases/01-feedback-foundation.md`
6. current repository `AGENTS.md`, package scripts, branch/HEAD/status/diff

### Allowed production files

- new `src/application/operation-feedback.ts`
- `src/application/store.ts` only if Packet 1.1 explicitly requires an exported type seam; otherwise leave it unchanged

### Allowed tests

- new `src/application/operation-feedback.test.ts`
- `src/application/store.test.ts` only for a type seam forced by the accepted RED

### RED contract

Add focused tests proving:

- only accepted lifecycle transitions succeed;
- stale action IDs cannot complete a newer operation;
- failed and succeeded terminal states contain the correct revision/source/section metadata;
- lifecycle state is pure and contains no application state or persistence behavior.

Run:

```bash
npm run test:unit -- src/application/operation-feedback.test.ts
```

Record the expected missing-module or missing-behavior failure before production code.

### GREEN and verification

Implement the smallest pure types/reducer required by Packet 1.1. Do not add UI, CSS, tool registration, guidance, recovery mappings, undo, documents, onboarding, timers, or persistence.

Run:

```bash
npm run test:unit -- src/application/operation-feedback.test.ts
npm run typecheck
npm run lint
npm run format:check
git diff --check
git status --short
```

## Boundaries

- Do not commit, push, deploy, save/publish a Site version, call a live tool, access secrets, or modify hosted state.
- Do not edit parent ledger evidence or mark Phase 1 validated.
- Do not alter `ApplicationState`, tool names, tool results, progress rules, submission, persistence schema, or voice.
- Do not add animation or fake delays.
- Stop on scope overlap instead of repairing unrelated failures.

## Required handoff

Return:

- exact baseline and final status;
- exact changed files;
- RED command and observed failure;
- GREEN and focused command output summaries;
- typecheck/lint/format/diff results;
- risks and unresolved findings;
- a statement that no remote action occurred.

The coordinating Codex reviewer independently inspects and reruns the focused gate before any next packet begins.
