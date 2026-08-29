# CivicFlow Gemini Live companion — update protocol

## Required read order

Before any implementation or review task, read:

1. `../civicflow-webmcp-v1/MASTER.md` and its active WebMCP/Sites/release phase.
2. `../civicflow-collaboration-ux-v1/MASTER.md` and its active phase/review.
3. this `MASTER.md`.
4. this file and `phases/00-index.md`.
5. the active phase document and its packet.
6. current repository instructions, branch/HEAD/status/diff, and package scripts.

The parent ledgers own their existing contracts. This child ledger owns the
Gemini-specific companion plan and must route changes back to the owner of an
existing state, WebMCP, activity, persistence, or release contract.

## Status vocabulary and transitions

Use only:

```text
planned → in-progress → codex-review → validated
planned → blocked
in-progress → blocked
planned → deferred
```

`validated` requires actual RED and GREEN evidence, the required focused and
aggregate gates, a real diff/status inspection, and independent acceptance.
Worker prose, a screenshot, or a passing mock is not live Gemini evidence.
Phase 0 entered `codex-review` after the documentation reconciliation was
written and is now `validated` after the independent documentation/source
review recorded in its phase document. No production phase begins without a
separate phase-specific prompt.

## Required phase/packet evidence

Every packet must record:

```text
Attempt date and timezone:
Exact baseline repository, branch, and HEAD:
Baseline status, staged diff, and user-owned changes:
MODEL:
REASONING:
ROUTING RATIONALE:
ESCALATION CONDITION:
Packet and exact allowed files:
RED command, expected failure, and observed failure:
GREEN implementation summary:
Focused command results:
Typecheck result:
Aggregate gate result:
Actual changed files and diff/status review:
Independent reviewer and findings:
Status decision:
Risks, assumptions, and unresolved decisions:
```

The evidence record must distinguish observed facts, inference, and unknowns.
Do not invent a model identifier, quota, hosting capability, deployment
identity, or live result.

## Documentation-only Phase 0 rules

The first handoff is Phase 0 only. Its worker may edit only the exact
documentation allowlist in `antigravity-first-implementation.md`, may run
read-only repository checks and Markdown/placeholder checks, and may not edit
source/configuration/tests or perform remote actions. It must return for
independent Codex review before Phase 1/2 implementation is dispatched.

## Update routing

| New information                                    | Update location                                                |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Cross-phase architecture/provider/privacy decision | `MASTER.md` and the affected parent ledger                     |
| Phase status                                       | `MASTER.md`, `phases/00-index.md`, and the active phase        |
| Phase files, tests, RED/GREEN, review evidence     | active phase document only                                     |
| First implementation prompt                        | `antigravity-first-implementation.md` and Phase 0 summary      |
| Gemini docs/model/quota/transport evidence         | `MASTER.md`, Phase 3, and Phase 5 if live                      |
| WebMCP tool mapping or result contract             | Phase 2 and parent WebMCP contract owner                       |
| Activity/progress/persistence behavior             | Phase 1 and collaboration UX ledger                            |
| Site save/deploy/live evidence                     | Phase 5/7 only after explicit authorization and exact identity |
| Release package/submission evidence                | Phase 6/7 and parent release phase                             |

Every cross-feature update states source, date, fact, inference if any, and
action. Preserve historical OpenAI Realtime records when replacing them with
Gemini; do not overwrite history or promote a plan into evidence.

## Architecture and safety invariants

- One application state and one mutation surface.
- Human UI, ChatGPT Site Tools, and Gemini all converge through current WebMCP
  handlers and the existing store.
- Assistant code never imports application commands or Zustand state.
- Only current registered tools may be exposed; registrations refresh before a
  call and conflicting mutations serialize.
- Read/navigation may execute; mutations require visible confirmation.
- Attestation and submission are never Gemini functions/tools.
- No standard Gemini key in client/build/logs; no raw audio/transcript/tool
  arguments in storage or logs.
- Microphone permission requires an explicit click and all tracks stop at every
  terminal state.
- The normal portal remains usable after model, quota, network, permission, or
  hosting failure.
- Same-tab sanitized activity retention may use `sessionStorage`; cross-tab
  synchronization is not part of this hackathon.
- No commit, push, deploy, Site save, live Gemini call, secret access, or
  Devpost mutation is implied by a local phase gate.

## Testing and review rules

Use RED → GREEN → bounded refactor → focused tests → `npm run typecheck` →
independent diff review. Do not use fake production delays, skipped tests,
weakened assertions, snapshot-only proof, watch mode, or `--passWithNoTests`.
Local fakes validate contracts only. A real Gemini call requires a separately
authorized bounded live-audit packet with credential, cost/quota, deployment,
and privacy boundaries.

Before a phase is considered ready for parent review, run the commands declared
by that phase, `git diff --check`, and a status/diff inspection. Never stage or
commit as part of this ledger workflow.

## Review and stop rules

Stop and return to the coordinator when:

- the baseline is not the recorded clean state or has unexplained overlap;
- a change needs a new application schema, direct command/store import, or a
  second mutation surface;
- official Gemini documentation conflicts with the proposed transport or
  credential boundary;
- the candidate model/free tier cannot be verified;
- hosting cannot supply a secure session/credential boundary;
- a real credential, live call, public deployment, or external mutation is
  needed earlier than its authorized gate;
- a tool or flow would expose attestation/submission;
- normal portal, WebMCP, activity, or no-submit behavior regresses.

An unresolved contradiction affecting scope, safety, or an invariant is
`blocked`; an ordinary unknown belongs in the phase's open-decisions section.

## Completion rule

The child ledger is implementation-ready only when every planned phase has an
exact allowlist, dependency, RED/GREEN boundary, commands, acceptance criteria,
non-goals, risks, and external-action gates. Creating the ledger does not mark
those phases implemented. The current first handoff is complete only after
Phase 0 documentation is independently reviewed; then issue a new prompt for
Phase 1, not an all-phases authorization.
