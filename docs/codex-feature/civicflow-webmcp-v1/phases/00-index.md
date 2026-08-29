# CivicFlow phase index

## Ledger status

- **Feature status:** `in-progress`; the selected collaboration UX cut is locally accepted, the optional Gemini companion's Phases 0–2 documentation/source, feedback-retention, and provider-neutral bridge gates are validated, and its later phases remain planned
- **Current validated phase:** Phase 2 — WebMCP capability layer
- **Current active phase:** Phase 3 — integration and live Site Tools
- **Current next phase:** Phase 4 — optional voice (after Gate D)
- **Dependency rule:** integrate strictly in numeric order; a later phase cannot repair an earlier phase's contract
- **Current implementation checkpoint:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, clean pre-planning source commit `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`; the equivalent accepted source has been published through the GitHub connector and deployed at the public Sites URL. Historical checkpoints remain in the phase evidence below.

## Phase routing table

| Plan phase                             | Ledger file                                                                                                               | Status        | Owner route                                                  | Entry gate                                  | Exit gate                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------- |
| 0 — repository and contract foundation | [01-foundation.md](01-foundation.md)                                                                                      | `validated`   | bounded native workers plus independent Sol review           | approved plan and repository access         | Gate A: schema, selector, command, store evidence                 |
| 1 — complete human portal              | [02-human-portal.md](02-human-portal.md)                                                                                  | `validated`   | one native `luna_max` Sites-owning root task                 | Gate A and ledger approval                  | Gate B: keyboard-completable six-section portal                   |
| 2 — WebMCP capability layer            | [03-webmcp-capability-layer.md](03-webmcp-capability-layer.md)                                                            | `validated`   | one bounded implementation owner plus independent review     | Gate B                                      | Gate C: fake-port nine-tool flow and no-submit proof              |
| 3 — integration and live Site Tools    | [04-integration-and-live-site-tools.md](04-integration-and-live-site-tools.md)                                            | `in-progress` | deterministic test owner; supported Sol/Terra live validator | Gate C and authorized preview               | Gate D: dated E1–E8 live evidence                                 |
| 4 — optional voice                     | [05-optional-voice.md](05-optional-voice.md) and [Gemini companion ledger](../../civicflow-gemini-companion-v1/MASTER.md) | `planned`     | bounded voice owner plus child Phase 0 validated             | Gate D                                      | Gate E: secure authorized Gemini voice/text or explicit cut to P0 |
| 5 — polish and release/submission      | [06-polish-release-submission.md](06-polish-release-submission.md)                                                        | `planned`     | release owner plus independent final reviewer                | P0/P1 decision and deployment authorization | Gate F: public release package and final acceptance               |

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
- **Gate C — WebMCP deterministic:** the original nine capabilities plus the accepted additive read-only `get_next_actions` capability through a faithful fake port; dynamic lifecycle, races, compact results, and no submission path.
- **Gate D — Live Site Tools/P0:** public preview and supported-route E1–E8 evidence; no voice claim is needed.
- **Gate E — Optional voice:** provider-neutral current-tool bridge, broker security, authorized live test, cost control, and clean fallback/cut decision.
- **Gate F — Release:** full verification, public URL/repository/license/instructions/video, current rules check, and independent final review.

## Current evidence pointer

Phase 0 was independently accepted on 2026-08-27 after a clean lockfile installation, 32 unit tests across five files, typecheck, lint, formatting, secret scan, production build, Playwright smoke, and worktree scope review. At the time of that gate the Phase 2 contract suite was intentionally empty; the foundation gate did not require that later suite. Phase 2 now supplies the contract/integration tests and the current aggregate verification passes. See [01-foundation.md](01-foundation.md) for the detailed record.

The Gemini companion Phase 0 documentation/source closure was independently
validated on 2026-08-28 against `main` at
`3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`. The expected documentation-only
working-tree changes were reviewed; no staged changes or paths outside the
documentation allowlist were present. `npm run format:check`,
`git diff --check`, the unresolved-placeholder scan, and the 34-file relative
Markdown-link check passed. No source implementation or external action
occurred in that Phase 0 handoff. A separate user prompt then authorized child
Phase 1 Packets 1.1–1.3; its local feedback/retention implementation and
independent Gate A evidence are recorded in the child phase document. Child
Phase 3 and later companion work remains separately authorized.

Phase 1 execution began on 2026-08-27 and is validated after the user's review confirmation and coordinator evidence check. Phase 2 was explicitly authorized during that review window and is also validated after independent diff and gate review. Phase 3 local browser integration is validated, the requested Sites project is public at `https://civicflow.codesm.chatgpt.site`, and the latest local source checkpoint is `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8` on `main`; earlier connector and Sites version identities remain historical evidence. A supported same-tab rehearsal subsequently added a household member, added monthly income, set coverage for two people, navigated to Documents/Review, and showed visible activity; the human UI attached synthetic proof. Packet 3.3 remains open until its complete E1–E8 evidence table and independent acceptance are recorded; these observed calls do not silently mark Gate D validated.

Phase 2 Gate C evidence is recorded in [03-webmcp-capability-layer.md](03-webmcp-capability-layer.md): all nine fake-port tools, dynamic lifecycle/race cases, compact results, activity/capability UI, exact-cent money validation, and no-submit/network boundaries pass the focused and aggregate checks. The checkpoint commits and GitHub publication are complete. Phase 3 Packets 3.1 and 3.2 are locally validated, and the authorized public Site is deployed at `https://civicflow.codesm.chatgpt.site`. A later supported same-tab rehearsal provides partial live observations, but Packet 3.3 remains open because the complete E1–E8 table and independent acceptance are not yet recorded. The earlier URL-policy rejection is retained as historical evidence rather than the current complete explanation; no alternate route is used to fill missing rows.

The 2026-08-28 collaboration-overlay MSW review does not change the historical
parent Phase 0–2 decisions. It admitted five judge-facing fixes in companion
Packets M1–M2, which are now independently accepted; companion UX Gates A, B,
C, E, and local Gate F are green for the selected local hackathon cut. CR-01
and CR-07 remain documented non-blocking hackathon limitations. Parent release
claims may carry this accepted local evidence, while live Packet 6.4 and final
release packaging remain separately authorized work.
