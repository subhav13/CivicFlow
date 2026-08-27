# CivicFlow phase index

## Ledger status

- **Feature status:** `in-progress`
- **Current validated phase:** Phase 0 — repository and contract foundation
- **Current next phase:** Phase 1 — complete human portal (awaiting independent review)
- **Dependency rule:** integrate strictly in numeric order; a later phase cannot repair an earlier phase's contract
- **Current baseline:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, no commit yet, Phase 0 files uncommitted

## Phase routing table

| Plan phase                             | Ledger file                                                                    | Status         | Owner route                                                  | Entry gate                                  | Exit gate                                             |
| -------------------------------------- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| 0 — repository and contract foundation | [01-foundation.md](01-foundation.md)                                           | `validated`    | bounded native workers plus independent Sol review           | approved plan and repository access         | Gate A: schema, selector, command, store evidence     |
| 1 — complete human portal              | [02-human-portal.md](02-human-portal.md)                                       | `codex-review` | one native `luna_max` Sites-owning root task                 | Gate A and ledger approval                  | Gate B: keyboard-completable six-section portal       |
| 2 — WebMCP capability layer            | [03-webmcp-capability-layer.md](03-webmcp-capability-layer.md)                 | `planned`      | one bounded implementation owner plus independent review     | Gate B                                      | Gate C: fake-port nine-tool flow and no-submit proof  |
| 3 — integration and live Site Tools    | [04-integration-and-live-site-tools.md](04-integration-and-live-site-tools.md) | `planned`      | deterministic test owner; supported Sol/Terra live validator | Gate C and authorized preview               | Gate D: dated E1–E8 live evidence                     |
| 4 — optional voice                     | [05-optional-voice.md](05-optional-voice.md)                                   | `planned`      | bounded voice owner plus independent security review         | Gate D                                      | Gate E: secure authorized voice or explicit cut to P0 |
| 5 — polish and release/submission      | [06-polish-release-submission.md](06-polish-release-submission.md)             | `planned`      | release owner plus independent final reviewer                | P0/P1 decision and deployment authorization | Gate F: public release package and final acceptance   |

## Integration sequence

```text
01 foundation
  → 02 human portal
  → 03 WebMCP capability layer
  → 04 deterministic integration and live Site Tools
  → 05 optional voice or voice cut
  → 06 polish, release, and submission evidence
```

Each phase is divided into atomic packets in its phase document. A packet must finish RED, GREEN, focused verification, typecheck, and independent review before the next packet begins. Shared contract changes return to the owning phase.

## Cross-phase gates

- **Gate A — Domain contract:** strict state/schema, selectors, commands, persistence, progress, review, and reset evidence.
- **Gate B — Human portal:** keyboard-only completion without WebMCP or voice.
- **Gate C — WebMCP deterministic:** all nine capabilities through a faithful fake port; dynamic lifecycle, races, compact results, and no submission path.
- **Gate D — Live Site Tools/P0:** public preview and supported-route E1–E8 evidence; no voice claim is needed.
- **Gate E — Optional voice:** provider-neutral current-tool bridge, broker security, authorized live test, cost control, and clean fallback/cut decision.
- **Gate F — Release:** full verification, public URL/repository/license/instructions/video, current rules check, and independent final review.

## Current evidence pointer

Phase 0 was independently accepted on 2026-08-27 after a clean lockfile installation, 32 unit tests across five files, typecheck, lint, formatting, secret scan, production build, Playwright smoke, and worktree scope review. The aggregate command currently stops at the intentionally empty Phase 2 contract suite; the foundation gate does not require that later suite. See [01-foundation.md](01-foundation.md) for the detailed record.

Phase 1 execution began on 2026-08-27 and is now awaiting independent review. The known uncommitted baseline is retained; no overlapping writer is active. Sites remains local-only because this repository has no hosting manifest or project identifier and the supported plugin requires Vite 8. No remote Site operation is authorized in this phase.
