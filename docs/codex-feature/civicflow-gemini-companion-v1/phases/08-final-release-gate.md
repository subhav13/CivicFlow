# Phase 7 — final review, exact-source release, and submission gate

## Status

`planned`. This is a release checklist, not an authorization to mutate GitHub,
Sites, Gemini, or Devpost.

## Goal

Independently confirm that the selected CivicFlow release is reproducible,
truthful, secure, accessible, and traceable to one exact source/deployment
identity before any separately authorized external action.

## Problem Evidence

- Local implementation, deployment, live Site Tools, and Gemini evidence can
  refer to different commits or versions.
- The current live rehearsal is partial; it does not complete parent E1–E8 or
  Packet 6.4 by itself.
- Hackathon claims, screenshots, and video need an evidence-backed review.
- Last-minute voice changes could destabilize the proven P0 path.

## Design

An independent reviewer inspects actual Git status/diff, reruns clean-checkout
verification, compares all ledgers and claims, verifies no submission or secret
path, and records GO/NO-GO. Only after GO may the coordinator request separate
commit, GitHub connector push, Sites deployment, real Gemini audit, video
publication, or Devpost submission actions.

## Likely Files

- `docs/codex-feature/civicflow-gemini-companion-v1/MASTER.md`
- `docs/codex-feature/civicflow-gemini-companion-v1/phases/00-index.md`
- phase evidence documents
- parent WebMCP/collaboration release documents
- `docs/release/civicflow-release-evidence.md`

No source change is allowed in final review. A defect returns to its owning
phase rather than being fixed inside this gate.

## Tasks

### Packet 7.1 — independent local review

- Capture exact branch, HEAD, status, staged/unstaged diff, and changed-file
  allowlist.
- Run clean install, full verify, secret scan, accessibility/responsive,
  reduced-motion, no-submit, and exact-visible-tab checks.
- Review model/transport/configuration claims against current official docs.
- Confirm undo remains deferred and cross-tab sync remains unclaimed.

### Packet 7.2 — exact-source release preparation

- Match local source identity to any authorized GitHub/Sites release identity.
- Check public URL, reload/deep link, tool discovery, human portal, and voice
  mode against the exact deployment only after authorization.
- Prepare commit/push/deploy/rehearsal plans without executing them.

### Packet 7.3 — final claim and submission review

- Map README, demo, screenshots, video, judging criteria, and Devpost claims
  to evidence rows.
- Confirm no unverified live Gemini or E1–E8 claim is presented as fact.
- Record GO/NO-GO and unresolved limitations; request separate authorization
  for each external action.

## RED tests/checks

- Any failing local gate, unexplained dirty overlap, source/deployment mismatch,
  exposed secret, direct mutation path, submission tool, accessibility blocker,
  or unsupported public claim is NO-GO.
- A real Gemini live audit is NO-GO if model/quota/transport/cleanup/tool use
  or exact-source identity is not evidenced.
- A voice failure must produce the explicit voice-off/P0 fallback, not a
  weakened acceptance claim.

## GREEN implementation boundary

GREEN is an independently accepted evidence package and release decision. It
does not itself perform external mutation. Any source defect is routed back to
its phase; any missing authority is reported as blocked.

## Verification commands

```bash
npm ci
npm run verify
npm run scan:secrets
git diff --check
git status --short --branch
git rev-parse HEAD
```

Add the exact supported live Site Tools/Gemini rehearsal commands and evidence
only after their separate authorization and exact deployment identity exist.

## Acceptance Criteria

- One exact source identity under review and one matching deployment identity
  for every public claim.
- Full local gates pass from a clean reproducible checkout.
- Human portal and ChatGPT Site Tools work without Gemini.
- If included, Gemini text/voice uses current WebMCP, visible confirmation,
  accessible feedback, secure cleanup, and no submission/attestation function.
- README, license, diagrams, demo/video, privacy, limitations, and judging
  mapping are truthful and evidence-linked.
- Independent reviewer records GO; otherwise P0/voice-off is the release.

## Non-Goals

No last-minute feature, direct bug fix, model substitution, unapproved live
session, commit, push, deploy, public upload, or Devpost submission.

## Review Risks

- Exact deployment matching is easy to assume and hard to prove; record every
  identity explicitly.
- A live model can act differently from mocks; inspect actual tool calls and
  visible revisions.
- Submission pressure can weaken security or accessibility gates; use the cut
  rule and ship proven P0.

## External boundaries

This phase remains pending until the coordinator separately authorizes each
commit, push, Sites save/deploy, real Gemini session, public video/upload, and
Devpost action. No authorization is inherited from the existence of this plan.
