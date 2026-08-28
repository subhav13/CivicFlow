# CivicFlow visible collaboration UX — update protocol

## Required read order

Before implementing, reviewing, or changing status:

1. Read the parent `../civicflow-webmcp-v1/MASTER.md` and its active integration/release constraints.
2. Read this ledger's `MASTER.md`.
3. Read this file.
4. Read `phases/00-index.md`.
5. Read the active phase and packet.
6. Inspect current `AGENTS.md`, Git branch/HEAD/status/diff, package scripts, and overlapping writers.

The parent ledger owns the original application/WebMCP invariants, optional voice, deployment, and submission. This ledger owns collaboration feedback, guidance, recovery, undo, responsive onboarding, and document-readiness enhancements.

## Status transitions

Use only:

```text
planned → in-progress → codex-review → validated
planned → blocked
in-progress → blocked
planned → deferred
```

`validated` requires a real RED, focused GREEN, required phase gate, aggregate checks, actual diff/status inspection, and independent reviewer acceptance. Worker prose and screenshots alone are not acceptance.

When a phase changes status, update its phase document, `phases/00-index.md`, and the phase map in `MASTER.md`. When the chosen release cut changes, also update the parent ledger's release dependency.

## Required evidence record

Every packet records:

```text
Attempt date and timezone:
Exact baseline branch and HEAD:
Baseline status and user-owned changes:
MODEL:
REASONING:
ROUTING RATIONALE:
ESCALATION CONDITION:
Packet and allowed files:
Actual changed files:
RED command, expected failure, and observed failure:
GREEN implementation summary:
Focused command results:
Typecheck result:
Aggregate gate result:
Diff/status review:
Independent reviewer and findings:
Status decision:
Risks, assumptions, and unresolved decisions:
```

Do not record an exact model if it was not actually used. The implementation route must be chosen before a worker starts, not retrofitted afterward.

## Update routing

| New evidence or decision                                  | Update location                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| One-state, submission, privacy, or baseline tool decision | This `MASTER.md` and parent `MASTER.md`                                                        |
| Selected collaboration release cut                        | This `MASTER.md`, `phases/00-index.md`, parent release phase                                   |
| Operation lifecycle/store contract                        | Phase 1                                                                                        |
| Progress, animation, accessibility, visible effect        | Phase 2                                                                                        |
| Tool catalog, next-action, recovery result                | Phase 3 and parent tool-contract note                                                          |
| Undo/history contract                                     | Phase 4                                                                                        |
| Mobile navigation, onboarding, save-state wording         | Phase 5                                                                                        |
| Document readiness, full gate, live evidence              | Phase 6 and parent integration/release phase                                                   |
| New implementation handoff                                | Active phase and `antigravity-first-implementation.md` only if that route is selected          |
| Commit, push, save, deploy, or public URL                 | Only after explicit authorization; record exact identity in the owning phase and parent ledger |

## Evidence rules

- Capture `git status --short --branch`, `git rev-parse HEAD`, and relevant diff before each writer starts.
- Preserve pre-existing user changes. If an allowed file overlaps them, stop and obtain direction.
- RED must fail because the planned behavior is absent. A syntax failure, skipped test, or unrelated existing failure is not RED.
- Timed motion tests assert state/classes/accessibility, not brittle millisecond screenshots.
- Fake timers may verify bounded acknowledgement expiry, but production code must not create fake work delays.
- UI-only state must never change persisted application revision; assert this in store and integration tests.
- Live Site Tools proof uses supported Sol/Terra and exact deployed source. Local fake-port success is not live proof.
- No phase may silently fix a parent Phase 0–3 defect. Return it to the parent ledger owner.

## Writer and review boundaries

- One source writer owns one packet.
- A reviewer is read-only unless explicitly reassigned a failing packet.
- Shared files (`src/application/store.ts`, `src/app/App.tsx`, `src/styles.css`, WebMCP catalog/results, common fixtures) have only one active writer.
- The implementer cannot mark its own packet validated.
- Do not spawn or invoke a worker until exact model, effort, rationale, escalation condition, allowlist, and tests are recorded.
- Do not silently fall back to another model, account, CLI, OMP route, or provider.

## Safety and authorization boundaries

This ledger never authorizes commit, push, branch mutation, pull request, Site save/deploy/publish, live API, paid model, secret access, microphone use, real-person testing, or submission. Each requires a separate explicit user instruction.

Never weaken:

- one application state;
- one WebMCP capability surface;
- human-only attestation/submission;
- synthetic-data-only use;
- compact typed tool inputs/results;
- normal non-WebMCP human usability.

## Completion rule

A phase is implementation-ready only when its packets contain exact dependencies, allowed files, RED tests, GREEN behavior, focused commands, aggregate gate, acceptance criteria, non-goals, review risks, and independent review instructions. The selected collaboration release is complete only when its cut line and all prior dependencies are validated and the parent release ledger records that choice.
