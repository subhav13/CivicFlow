# CivicFlow ledger update protocol

## Read and write order

Before any implementation or review task, read:

1. `MASTER.md`
2. this file
3. `phases/00-index.md`
4. the active phase document and its linked packet
5. the current repository instructions and baseline

The active phase document owns packet-level scope and evidence. `MASTER.md` owns cross-phase decisions, architecture, risks, phase status, and full-feature acceptance. This file owns status and evidence routing rules. Do not update the synced source mirror or attached planning files.

## Status transitions

Use only evidence-backed transitions:

```text
planned → in-progress → codex-review → validated
planned → blocked
in-progress → blocked
planned → deferred
```

`validated` means the focused gate, required aggregate gate, actual diff/status review, and independent acceptance all exist in the phase document. A worker cannot mark its own work validated. `blocked` requires a concrete unmet prerequisite, contradiction, or external decision. `deferred` is intentional scope movement beyond the current release. Never use a successful worker message as a substitute for evidence.

When a phase status changes, update both `MASTER.md` and `phases/00-index.md`, then add the detailed evidence to that phase document. Do not mark a phase validated while a required command fails, a required test is skipped, a dirty overlap is unattributed, or a later-phase dependency is being silently repaired.

## Required phase update record

Append or revise a phase's evidence section with these fields:

```text
Attempt date and timezone:
Worker route and exact model/reasoning:
One-sentence routing rationale:
Observable escalation condition:
Baseline repository, branch, and exact HEAD:
Baseline status/diff summary:
Allowed files:
Actual changed files:
RED tests and observed failures:
GREEN implementation result:
Focused commands and exact results:
Aggregate commands and exact results:
Independent reviewer and findings:
Status decision:
Risks, assumptions, and unresolved decisions:
```

Use absolute repository paths in records. Separate pre-existing user changes from packet changes. If the repository has no commit, record `HEAD unavailable: no commits yet` rather than inventing a SHA.

## Evidence rules

- Tests are run in non-watch mode and their actual output is recorded.
- RED is a real failing focused test caused by the missing behavior, not a skipped assertion or a fabricated failure.
- GREEN includes the smallest implementation and the focused test result.
- `npm run typecheck` is required after every packet; phase gates also require the commands listed in the phase document.
- Review inspects the actual worktree and reruns the relevant gates. It does not trust changed-file claims without checking status and diff.
- `npm run verify` is a gate only when its required scripts and suites exist. An intentionally empty future suite is recorded as pending, not bypassed with `--passWithNoTests`.
- Tool, voice, deployment, and hosting claims require their own contract or live evidence; a local unit test cannot stand in for a live Site Tools result.

## Routing new information

| Information                                   | Update location                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cross-phase architecture or product decision  | `MASTER.md` and, if relevant, the affected phase                                                       |
| Phase or packet status                        | `MASTER.md`, `phases/00-index.md`, and active phase                                                    |
| Active files, tests, RED/GREEN evidence       | Active phase document                                                                                  |
| Implementation handoff or external task       | Active phase document and `antigravity-first-implementation.md` when it is the first handoff           |
| New WebMCP/OpenAI/Chrome/rules evidence       | `MASTER.md` source/risk/decision sections and affected phase                                           |
| Sites preview, save, deploy, or live evidence | Affected phase only after explicit authorization; summarize the cross-phase consequence in `MASTER.md` |
| Shared state or service-boundary change       | `MASTER.md`, the owning architecture phase, and the packet that owns the changed contract              |

Every update identifies the source, date, observed fact, inference if any, and action. Current primary documentation must be re-checked before WebMCP syntax, Realtime parameters, hosting configuration, or hackathon claims are accepted.

## Ownership and safety rules

- One writer owns a packet and its allowlisted files at a time.
- Phase 1 Sites work has one native `luna_max` Site-owning root task. It alone may edit source/configuration, initialize or operate a Site, and open the continuous preview for that phase. It must not use a source-editing subagent.
- A reviewer may inspect and report, but must not silently fix outside the assigned allowlist. A Phase 0 defect returns to the Phase 0 owner.
- No push, commit, deploy, publish, remote Site create/save, hosted environment mutation, live API call, paid voice call, or secret access is inferred from a packet. Each requires an explicit authorization and a separate evidence record.
- Never weaken the three invariants: one application state, one WebMCP capability surface consumed by voice, and human-only submission.
- Do not copy source from the planning mirror into the implementation checkout.

## Decision log format

For a new decision, record:

```text
Decision ID:
Date:
Question:
Evidence:
Chosen outcome:
Alternatives rejected and why:
Owner:
Resolution gate:
Affected files/phases:
```

If evidence is materially contradictory and the conflict threatens scope, safety, ownership, or a frozen invariant, set the affected phase to `blocked` and request the user's decision. Do not hide a conflict in a vague assumption.

## Completion rule

The ledger is ready for a phase only when the phase document has a concrete allowlist, packet dependencies, RED/GREEN tests, exact gates, no-go boundaries, worker evidence format, and independent review checklist. The feature is not complete merely because the ledger exists. Do not mark a phase or the full feature validated while required gates or release evidence remain pending.
