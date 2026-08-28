# CivicFlow visible collaboration UX — phase index

## Current status

- **Feature status:** `validated` for the selected local hackathon cut
- **Active phase:** none; MSW hackathon remediation M1–M2 is complete. UX Gates A, B, C, E, and local Gate F are accepted; Phase 4 remains deferred, and live Packet 6.4 remains separately authorized
- **First phase:** Phase 1 — feedback foundation
- **Parent dependency:** accepted core application/WebMCP baseline; formal parent Gate D evidence remains independently tracked
- **Pre-planning baseline:** branch `main`, clean commit `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Release cut:** selected local hackathon cut accepted after CR-02 through CR-06 closed and independent reverification; CR-01 and CR-07 remain documented non-blocking limitations
- **Voice dependency:** none

## Phase routing

| Phase                               | File                                                                       | Status      | Primary ownership              | Entry                            | Exit                                      |
| ----------------------------------- | -------------------------------------------------------------------------- | ----------- | ------------------------------ | -------------------------------- | ----------------------------------------- |
| 1 — feedback foundation             | [01-feedback-foundation.md](01-feedback-foundation.md)                     | `validated` | lifecycle/store contract owner | plan approval and clean baseline | Gate A: deterministic ephemeral contracts |
| 2 — visible progress and motion     | [02-visible-progress-and-motion.md](02-visible-progress-and-motion.md)     | `validated` | bounded UI owner               | Gate A                           | Gate B: accessible truthful feedback      |
| 3 — guidance and recovery           | [03-guidance-and-recovery.md](03-guidance-and-recovery.md)                 | `validated` | selector/tool contract owner   | Gate B                           | Gate C: recoverable live-shaped tool flow |
| 4 — change history and undo         | [04-change-history-and-undo.md](04-change-history-and-undo.md)             | `deferred`  | command/store owner            | Gate C and explicit inclusion    | Gate D: newest eligible change reversible |
| 5 — mobile, onboarding, persistence | [05-mobile-onboarding-persistence.md](05-mobile-onboarding-persistence.md) | `validated` | responsive UI owner            | Gate C; Gate D explicitly cut    | Gate E: six-step narrow-screen clarity    |
| 6 — document readiness and release  | [06-document-readiness-release.md](06-document-readiness-release.md)       | `validated` | integration/release-test owner | Gates C and E; D if selected     | Gate F: chosen release cut accepted       |

## Dependency graph

```text
Phase 1 contracts
  └─> Phase 2 visible feedback
        └─> Phase 3 guidance and recovery ──> minimum release
              ├─> Phase 4 undo (deferred)
              └─> Phase 5 mobile/onboarding (persistence gate accepted after M2)
                    └─> Phase 6 documents and final validation
```

Phase 5 may proceed when Phase 4 is explicitly cut, as it is for this release
path. Phase 6 records Gate D as deferred. No phase may repair a failing prior
gate without returning ownership.

## Gate summary

- **Gate A — accepted after M1:** action-ID identity, failure history, and update effect semantics satisfy the normal demo contract; post-commit abort is a documented non-blocking limitation.
- **Gate B — accepted after M1:** update effects are truthful and correlated to the serialized action ID.
- **Gate C — accepted after M1:** Emma-before-income recovery appears once in activity history without mutating application state.
- **Gate D:** newest eligible change can be undone once by a human with exact revision fencing; no undo tool exists.
- **Gate E — accepted after M2:** navigation/onboarding remain green and seed/corrupt-state persistence wording is truthful.
- **Gate F — accepted locally:** the aggregate suite and document-readiness journey pass; maximum-cardinality compaction is a documented non-blocking limitation for this hackathon cut.

## Integration rules

- Finish and review each packet before the next dependent packet.
- Do not run simultaneous writers on store, App, styles, catalog/results, or shared fixtures.
- The original nine tools remain green throughout. Phase 3 additively changes the accepted catalog to ten only after its RED contract is intentionally updated and independently reviewed.
- Voice is not an entry or exit condition for any phase.
- No remote mutation follows from a local phase gate.

## Current execution checkpoint

Packets 1.1 and 1.2 were dispatched through the user-authorized OMP Sonnet route on 2026-08-27 and independently validated. Packet 1.3 was completed through the user-authorized Gemini 3.7 Flash High fallback on 2026-08-28 after two Sonnet authentication failures, then independently validated under UX Gate A. Phase 2 Packets 2.1–2.3 were completed in one user-authorized OMP Gemini 3.7 Flash High run, with two narrow same-route corrections, and independently validated under UX Gate B. Phase 3 Packets 3.1–3.3 were completed in one user-authorized OMP Gemini 3.7 Flash High run, with one narrow same-route compatibility correction, and independently validated under UX Gate C. No commit, push, deploy, live call, or hosted mutation has occurred.

The Phase 1, Phase 2, Phase 3, Phase 5, and local Phase 6 implementations exist.
The MSW review initially reopened Phases 1, 2, 3, and 5; M1/M2 now close the
five admitted findings and restore those gates. Phase 4 is explicitly deferred.
Any future Packet 6.4 dispatch must:

1. Coordinator records the exact current HEAD/status and attributes dirty files before Packet 6.4.
2. Coordinator selects the exact available implementation model and reviewer under current `AGENTS.md` and routing policy.
3. Dispatch includes the required MODEL/REASONING/rationale/escalation record.
4. Carry forward the accepted CR-02 through CR-06 evidence and record CR-01 and CR-07 as non-blocking limitations.
5. One writer receives only Packet 6.4’s explicitly authorized live-evidence scope, its allowlist, and its no-unapproved-mutation boundaries.

## 2026-08-28 review checkpoint (pre-remediation history)

The pre-remediation aggregate suite passed formatting, lint, secret scan,
typecheck, 260 unit tests, 88 contract tests, production build, and 32
Playwright tests. The independent review probe failed 7 of 7 missing-contract
assertions. MSW admitted five normal-journey fixes and rejected two edge-only
fixes for this hackathon cut. The durable evidence and implementation packets are in
[Phase 1–6 code review](../reviews/2026-08-28-phase-1-6-code-review.md). The
earlier validation evidence remains historical. No production fix, commit, push,
deploy, Site save, live tool call, or hosted mutation occurred during review.

## 2026-08-28 remediation acceptance checkpoint

- M1 and M2 completed through OMP `google-antigravity/gemini-3.7-flash` at high
  reasoning; the first attempt returned `401 Invalid API key`, and one same-route
  retry completed successfully.
- Independent focused gate: 6 files, 70 tests PASS. Aggregate gate: `npm run
verify` PASS with 270 unit tests, 90 contract tests, a passing build, and 32
  Playwright tests. `git diff --check` PASS; branch and HEAD are unchanged.
- The temporary review probe passes all five admitted CR-02–CR-06 assertions;
  only excluded CR-01 and CR-07 remain failing. The selected local hackathon cut
  is accepted; no commit, push, deploy, live call, or hosted mutation occurred.
