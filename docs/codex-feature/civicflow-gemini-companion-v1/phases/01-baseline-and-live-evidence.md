# Phase 0 — baseline, source identity, and live-evidence closure

## Status

`validated`. The documentation reconciliation was independently reviewed
against the recorded HEAD and expected documentation-only dirty set. Phase 1
and any production implementation still require a separate explicit prompt.

## Goal

Create a single, evidence-backed starting point for the Gemini companion and
correct stale cross-ledger statements without changing application code,
configuration, tests, hosted state, or external accounts.

## Problem Evidence

- The parent WebMCP voice phase describes OpenAI Realtime/WebRTC, while the user
  selected Gemini Live based on reported free-tier availability.
- The existing parent release and live-tool text contains earlier blocked-route
  wording even though a later same-tab live rehearsal succeeded partially.
- The successful rehearsal is not a formal E1–E8 or Packet 6.4 audit.
- The collaboration ledger accepts the local hackathon UX cut but keeps live
  evidence and release actions separately authorized.
- A fresh child ledger is needed so a future worker does not infer permission
  to implement every phase at once.

## Design

Phase 0 records facts, provenance, inference, open decisions, and explicit
boundaries. It preserves the original OpenAI plan as superseded history, adds
the Gemini decision and candidate model, links the child ledger from both
parents, and identifies the exact source/deployment identity that a future
live audit must verify. It does not add an implementation prompt for Phase 1;
the first handoff remains Phase 0-only.

## Likely Files

The Phase 0 handoff allowlist is documentation-only:

- `docs/codex-feature/README.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/MASTER.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/UPDATE_PROTOCOL.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/phases/00-index.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/phases/01-baseline-and-live-evidence.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/antigravity-first-implementation.md`
- `docs/codex-feature/civicflow-webmcp-v1/MASTER.md`
- `docs/codex-feature/civicflow-webmcp-v1/phases/00-index.md`
- `docs/codex-feature/civicflow-webmcp-v1/phases/04-integration-and-live-site-tools.md`
- `docs/codex-feature/civicflow-webmcp-v1/phases/05-optional-voice.md`
- `docs/codex-feature/civicflow-webmcp-v1/phases/06-polish-release-submission.md`
- `docs/codex-feature/civicflow-collaboration-ux-v1/MASTER.md`
- `docs/codex-feature/civicflow-collaboration-ux-v1/phases/00-index.md`
- `docs/codex-feature/civicflow-collaboration-ux-v1/phases/06-document-readiness-release.md`

No source, test, package, hosting, or environment file is allowed.

## Tasks

### Packet 0.1 — inventory and baseline identity

- Read the product brief, approved plan, parent ledgers, current review, and
  actual repository paths.
- Capture branch, exact HEAD, staged/unstaged status and diff, repository
  instructions, package scripts, and current deployment references.
- Separate coordinator-observed evidence from facts independently verified by
  this worker.

### Packet 0.2 — child ledger and parent routing

- Write the child master, update protocol, phase index, and complete phase docs.
- Link the child ledger from the repo index and both parent masters.
- Record Gemini Live as the selected runtime provider and OpenAI Realtime as
  superseded history.
- Preserve undo deferral, same-tab retention limits, human-only submission,
  and external-action gates.

### Packet 0.3 — evidence and quality closure

- Record the observed Subhav/Optum/coverage/documents/review journey with
  revisions, visible effects, and user-reported final-step distinction.
- Correct stale live/deployment wording only where supported by evidence.
- Run placeholder, Markdown/format, `git diff --check`, and status/diff checks.
- Return the docs for parent Codex review; do not proceed to Phase 1.

## RED tests/checks

This documentation-only phase has no product-code RED test. The documented
ledger-preparation RED evidence was the missing child ledger and
stale/contradictory provider/live wording identified before the documentation
packet was created. This review records:

- the exact ledger-preparation `rg`/file-existence evidence showing the child
  files were absent or incomplete;
- any stale parent statements found by targeted searches; and
- a failed placeholder scan only if a real placeholder exists, never a
  fabricated failure.

Do not claim a source-test failure or invoke `npm run verify` as a Phase 0
implementation RED/Green substitute.

## GREEN implementation boundary

GREEN means all required docs exist, internal links resolve to intended files,
provider history is preserved, observed versus unobserved evidence is explicit,
all later phases remain planned, and the handoff is Phase 0-only. No source
implementation, dependency change, model call, live API call, secret access,
or remote action is part of GREEN.

## Verification commands

Run from the repository root:

```bash
rg -n "T[B]D|T[O]DO|implement [l]ater|f[i]ll in|\.\.\." docs/codex-feature/civicflow-gemini-companion-v1
rg -n "civicflow-gemini-companion-v1|Gemini Live|OpenAI Realtime|E1–E8|Packet 6\.4" docs/codex-feature/README.md docs/codex-feature/civicflow-webmcp-v1 docs/codex-feature/civicflow-collaboration-ux-v1
git diff --check
npm run format:check
git status --short --branch
git diff --stat
git diff -- docs/codex-feature
```

If a repository Markdown checker exists, run it without rewriting unrelated
files. Do not stage the docs. `npm run verify` is not required for a docs-only
Phase 0 unless the parent explicitly requests a regression check; if run,
record it as baseline verification rather than implementation evidence.

## Acceptance Criteria

- The child ledger has all required files and all eight planned implementation
  phases after the Phase 0 entry.
- The parent README routes readers to the child ledger.
- Both parent ledgers link the child and reflect the Gemini decision without
  deleting the OpenAI Realtime history.
- Parent live status distinguishes deployment and partial same-tab observations
  from formal E1–E8/Packet 6.4 acceptance.
- Candidate model and free-tier caveat are explicitly unverified until current
  official Google documentation is checked.
- The first handoff lists exact documentation files and authorizes Phase 0 only.
- No source/configuration/test file changes, secret access, remote mutation,
  commit, push, deploy, or live Gemini call occurred.
- The parent coordinator can independently review the exact docs diff and issue
  a separate Phase 1 prompt.

## Non-Goals

No UI, WebMCP bridge, Gemini session, broker, microphone, text agent, schema,
dependency, deployment, live Site Tools audit, commit, push, or release package.

## Review Risks

- Replacing OpenAI history rather than marking it superseded would lose the
  rationale and prior safety gates.
- Treating user-reported completion as independently observed would overstate
  the live gate.
- Updating a stale parent statement with an unverified deployment identity could
  create a false public claim.
- A broad first prompt could accidentally authorize production implementation;
  the prompt must remain restricted to this exact documentation allowlist.

## Evidence record

- **Attempt date and timezone:** 2026-08-28, Asia/Kolkata (IST).
- **Baseline repository, branch, and HEAD:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, `main`, `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`.
- **Baseline status/diff:** `main` at the recorded HEAD with no staged changes; the expected documentation-only working-tree changes were already present: eight modified tracked docs and twelve untracked child-ledger docs. No repository-local `AGENTS.md` was present.
- **MODEL:** `gpt-5.6-luna` via native `luna_max`.
- **REASONING:** `max`.
- **ROUTING RATIONALE:** the task reconciles multiple durable ledgers and live evidence while preserving provider, privacy, and no-submission invariants, so a fresh high-rigor documentation owner is appropriate.
- **ESCALATION CONDITION:** stop on material baseline drift, unexplained dirty overlap, contradictory source evidence, need for source implementation, external mutation, secret access, or a request to authorize a later phase from this handoff.
- **Allowed files:** documentation paths listed above; no source or test path.
- **Actual changed files:** the final dirty set contains `docs/codex-feature/README.md`; all twelve files under `docs/codex-feature/civicflow-gemini-companion-v1/`; `docs/codex-feature/civicflow-webmcp-v1/MASTER.md`; `docs/codex-feature/civicflow-webmcp-v1/phases/00-index.md`; `docs/codex-feature/civicflow-webmcp-v1/phases/04-integration-and-live-site-tools.md`; `docs/codex-feature/civicflow-webmcp-v1/phases/05-optional-voice.md`; `docs/codex-feature/civicflow-webmcp-v1/phases/06-polish-release-submission.md`; `docs/codex-feature/civicflow-collaboration-ux-v1/MASTER.md`; and `docs/codex-feature/civicflow-collaboration-ux-v1/phases/00-index.md`. Every path is documentation-only and allowlisted.
- **RED evidence:** ledger-preparation evidence recorded the absent child ledger and stale provider/live wording before the documentation packet existed. No product-code RED was run, and this review did not fabricate one.
- **GREEN evidence:** the child ledger and Phase 0-only handoff are complete; provider choice, evidence provenance, phase graph, security boundaries, and external gates are explicit. Phase 0 is validated; Phases 1–8 remain planned.
- **Focused checks:** `git diff --check` passed; `npm run format:check` passed; the child-ledger placeholder scan returned no matches; the targeted decision/status scan was internally consistent; the relative-link checker covered 34 Markdown files and found 0 missing links; final status/diff inspection found no path outside the allowlist.
- **Independent reviewer:** current coordinating Codex task performed the evidence and diff review; no worker prose was treated as acceptance.
- **Status decision:** `validated` after the documentation-only evidence, status, link, format, diff, and scope gates passed.
- **Risks/unknowns:** exact Gemini Live model/transport/free-tier terms and Sites session-broker capability remain open and must be verified in Phase 3; no live Gemini call or credential access occurred during this ledger update; the partial Site Tools run is not complete E1–E8/Packet 6.4 evidence.

## Explicit boundaries

This phase authorizes no commit, no push, no deploy, no Site save, no live
Gemini session, no secret or credential access, no Devpost mutation, and no
production code. A new prompt is required for Phase 1 after parent acceptance.
