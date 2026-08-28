# CivicFlow phase index

## Ledger status

- **Feature status:** `in-progress`
- **Current validated phase:** Phase 2 — WebMCP capability layer
- **Current active phase:** Phase 3 — integration and live Site Tools
- **Current next phase:** Phase 4 — optional voice (after Gate D)
- **Dependency rule:** integrate strictly in numeric order; a later phase cannot repair an earlier phase's contract
- **Current implementation checkpoint:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, clean pre-planning source commit `801a165ff8f115d6a4801b1f33d087508104ec04`; the equivalent four-file WebMCP compatibility change was published through the GitHub connector as remote commit `2781fd587a22700978be7a324e1df654af80e34c` and deployed as Sites version 4

## Phase routing table

| Plan phase                             | Ledger file                                                                    | Status        | Owner route                                                  | Entry gate                                  | Exit gate                                             |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| 0 — repository and contract foundation | [01-foundation.md](01-foundation.md)                                           | `validated`   | bounded native workers plus independent Sol review           | approved plan and repository access         | Gate A: schema, selector, command, store evidence     |
| 1 — complete human portal              | [02-human-portal.md](02-human-portal.md)                                       | `validated`   | one native `luna_max` Sites-owning root task                 | Gate A and ledger approval                  | Gate B: keyboard-completable six-section portal       |
| 2 — WebMCP capability layer            | [03-webmcp-capability-layer.md](03-webmcp-capability-layer.md)                 | `validated`   | one bounded implementation owner plus independent review     | Gate B                                      | Gate C: fake-port nine-tool flow and no-submit proof  |
| 3 — integration and live Site Tools    | [04-integration-and-live-site-tools.md](04-integration-and-live-site-tools.md) | `in-progress` | deterministic test owner; supported Sol/Terra live validator | Gate C and authorized preview               | Gate D: dated E1–E8 live evidence                     |
| 4 — optional voice                     | [05-optional-voice.md](05-optional-voice.md)                                   | `planned`     | bounded voice owner plus independent security review         | Gate D                                      | Gate E: secure authorized voice or explicit cut to P0 |
| 5 — polish and release/submission      | [06-polish-release-submission.md](06-polish-release-submission.md)             | `planned`     | release owner plus independent final reviewer                | P0/P1 decision and deployment authorization | Gate F: public release package and final acceptance   |

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

Phase 0 was independently accepted on 2026-08-27 after a clean lockfile installation, 32 unit tests across five files, typecheck, lint, formatting, secret scan, production build, Playwright smoke, and worktree scope review. At the time of that gate the Phase 2 contract suite was intentionally empty; the foundation gate did not require that later suite. Phase 2 now supplies the contract/integration tests and the current aggregate verification passes. See [01-foundation.md](01-foundation.md) for the detailed record.

Phase 1 execution began on 2026-08-27 and is validated after the user's review confirmation and coordinator evidence check. Phase 2 was explicitly authorized during that review window and is also validated after independent diff and gate review. Phase 3 local browser integration is validated, the requested Sites project is public at `https://civicflow.codesm.chatgpt.site`, and the current compatibility checkpoint is local commit `801a165ff8f115d6a4801b1f33d087508104ec04`, connector-published remote commit `2781fd587a22700978be7a324e1df654af80e34c`, and Sites version 4. Supported live Site Tools successfully added a household member, added income, atomically set coverage for two people, read progress, and navigated to Review & Sign. Packet 3.3 remains open until its complete E1–E8 evidence table and independent acceptance are recorded; these observed calls do not silently mark Gate D validated.

Phase 2 Gate C evidence is recorded in [03-webmcp-capability-layer.md](03-webmcp-capability-layer.md): all nine fake-port tools, dynamic lifecycle/race cases, compact results, activity/capability UI, exact-cent money validation, and no-submit/network boundaries pass the focused and aggregate checks. The checkpoint commits and GitHub publication are complete. Phase 3 Packets 3.1 and 3.2 are locally validated, and the authorized public Site is deployed at `https://civicflow.codesm.chatgpt.site`. Packet 3.3 remains open because the supported in-app Browser route rejected the public Site URL before live E1–E8 tool evidence could be collected; no alternate route was used.

The 2026-08-28 collaboration-overlay MSW review does not change the historical
parent Phase 0–2 decisions. It admitted five judge-facing fixes in companion
Packets M1–M2, which are now independently accepted; companion UX Gates A, B,
C, E, and local Gate F are green for the selected local hackathon cut. CR-01
and CR-07 remain documented non-blocking hackathon limitations. Parent release
claims may carry this accepted local evidence, while live Packet 6.4 and final
release packaging remain separately authorized work.
