# CivicFlow assistant UI refresh — update protocol

## Read order

1. Repository instructions and current branch/HEAD/status/diffs.
2. `../civicflow-webmcp-v1/MASTER.md`.
3. `../civicflow-collaboration-ux-v1/MASTER.md` and accepted onboarding phase.
4. `../civicflow-gemini-companion-v1/MASTER.md` and UI/runtime phases.
5. This `MASTER.md`, this protocol, and `phases/00-index.md`.
6. The one active phase and its actual source/tests.

## Status and evidence

Use only:

```text
planned → in-progress → codex-review → validated
planned → blocked
in-progress → blocked
planned → deferred
```

Every implementation run records:

```text
Attempt date and timezone:
Exact repository, branch, and HEAD:
Baseline status, staged diff, and user-owned changes:
MODEL:
REASONING:
ROUTING RATIONALE:
ESCALATION CONDITION:
Packet and exact allowed files:
RED command, expected failure, and observed failure:
GREEN implementation summary:
Focused command results:
Typecheck/build result:
Aggregate gate result:
Actual changed files and diff/status review:
Independent reviewer and findings:
Status decision:
Risks, assumptions, and unresolved decisions:
```

Only independent review can set `validated`. Distinguish verified facts,
inference, and unknowns. A fake never proves a real mic, provider, or deployment.

## Execution rhythm

1. Audit baseline and exact dirty-path allowlist.
2. Read active phase and affected source/tests.
3. Add the smallest deterministic RED assertion and record its failure.
4. Implement only the active packet.
5. Run focused GREEN, typecheck/build, and declared regression gates.
6. Inspect diff/status and run `git diff --check`.
7. Return to coordinator; do not start the next phase.
8. Independent Sol review inspects source, tests, commands, and actual diff.

## Routing and stop rules

This ledger owns launcher/surface, experience state, speaker UI/output seam,
progressive disclosure, and compact onboarding. Parent ledgers retain tool,
confirmation-policy, application state/commands/persistence, provider/server,
Sites deployment, and release ownership.

Stop when HEAD/dirty paths differ, an edit escapes the active allowlist, a
second assistant/controller/store/mutation route would appear, minimized voice
would require background/cross-tab capture, mute cannot be truthful at
`AudioOutput`, an invariant regresses, or any install/live call/credential/
deploy/commit/push/remote mutation is required.

Use deterministic fakes. No watch mode, skipped/weakened tests,
`--passWithNoTests`, arbitrary sleeps, or snapshot-only acceptance. Preserve
scripts and dependencies. Full `npm run verify` belongs to Phase 5 or an earlier
material-risk review. Creating this ledger is not implementation and no phase
authorizes the next or an external action.
