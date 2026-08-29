# Phase 6 — release package and hackathon evidence

## Status

`planned`. Entry requires the selected P0/voice decision and Phase 5 local
Gate E. This phase prepares artifacts locally; it does not publish them.

## Goal

Make the CivicFlow repository and demo understandable, reproducible, and
honest for a hackathon judge without overstating Gemini, WebMCP, accessibility,
or deployment evidence.

## Problem Evidence

- The parent release plan identifies README, license, architecture, setup,
  testing, deployment, screenshots, video, and judging mapping as pending
  release work.
- Voice may be disabled or only locally/mocked if the bounded live gate is not
  authorized or does not pass.
- Current live Site Tools observations are partial and must not be presented as
  a complete E1–E8 audit.

## Design

Produce a public-facing README, an agreed license, architecture/data-flow
diagram, setup/test/build/deploy instructions, Gemini configuration guidance
without secrets, synthetic-only/free-tier privacy warning, accessibility notes,
known limitations, judging-criteria mapping, screenshot checklist, demo script,
and video storyboard. Every claim links to a test or dated evidence row.

The package distinguishes:

- normal human portal behavior;
- ChatGPT Site Tools behavior;
- mocked Gemini companion behavior;
- live Gemini behavior, only if Gate E is accepted; and
- planned/deferred features such as undo or cross-tab sync.

## Likely Files

- `README.md`
- `LICENSE` only after the owner confirms the license choice; parent default is
  MIT if no other choice is documented
- `docs/architecture/civicflow-gemini-flow.md` or an equivalent approved docs
  path
- `docs/demo/civicflow-gemini-demo-script.md`
- `docs/demo/civicflow-gemini-video-storyboard.md`
- `docs/release/civicflow-release-evidence.md`
- screenshots/video checklist files only; no video upload

Do not edit source files to make documentation claims pass.

## Tasks

### Packet 6.1 — repository documentation

- Explain local prerequisites, `npm ci`, `npm run verify`, build, and the
  existing Sites deployment route without embedding secrets.
- Explain WebMCP tool discovery, current ten-tool surface, shared state, human
  confirmation, and no-submit boundary.
- Explain Gemini Live selection, candidate-model verification requirement,
  free-tier data-use caveat, synthetic-only use, disabled-by-default behavior,
  and text fallback.

### Packet 6.2 — diagrams and demo evidence

- Draw the human/ChatGPT/Gemini → WebMCP → store → visible UI flow.
- Include operation/activity/progress feedback and confirmation boundary.
- Write a short demo script showing text, voice if proven, visible change,
  recovery, accessibility fallback, and human-only Review & Sign.
- List screenshots and exact evidence IDs; do not fabricate live screenshots.

### Packet 6.3 — reproducibility and claims review

- Verify fresh checkout/install/build/test commands in a safe temporary work
  area where permitted.
- Run secret scan and inspect the actual diff/status.
- Map each README/demo/judging claim to accepted local or live evidence.
- Record known limitations: cross-tab sync out of scope, undo deferred,
  synthetic data, live E1–E8 status, Gemini quota/model status, and voice cut
  rule.

## RED tests/checks

- Fresh-checkout commands fail if required docs/scripts/license are absent.
- Claim review fails if a document says voice is live without Gate E evidence,
  calls partial Site Tools evidence complete, or implies agent submission.
- Secret scan fails if credentials appear in docs/assets/build output.
- Link/Markdown checks fail for missing internal references or placeholders.

## GREEN implementation boundary

GREEN is a local documentation/evidence package only. It must not upload video,
publish documentation, mutate Devpost/GitHub/Sites, access secrets, or alter
product behavior.

## Verification commands

```bash
npm ci
npm run format:check
npm run lint
npm run scan:secrets
npm run typecheck
npm run test:unit
npm run test:contract
npm run build
npm run test:e2e
npm run verify
git diff --check
git status --short --branch
```

Also run any repository Markdown/link checker that already exists. Record exact
counts and fresh-checkout location without deleting user data.

## Acceptance Criteria

- README/license/diagrams/setup/test/deploy/demo/privacy/accessibility/
  limitations/judging artifacts exist locally and are internally consistent.
- Claims distinguish proven, mocked, partially observed, deferred, and
  unsupported behavior.
- No secret, raw transcript/audio/tool argument, real data, or unsupported
  submission/eligibility claim appears.
- Fresh-checkout verification and the complete local suite pass.
- No external artifact upload or account mutation occurred.

## Non-Goals

No new feature, source fix, live Gemini call, public voice enablement, video
upload, GitHub push, Sites save/deploy, Devpost mutation, commit, or secret
access.

## Review Risks

- Documentation can outrun evidence, especially when Gemini is mocked.
- A license is an external legal choice; stop if MIT is not acceptable or
  already documented.
- Diagrams can accidentally imply direct Gemini-to-store mutation; show the
  WebMCP bridge explicitly.
- A polished video can conceal missing live evidence; preserve the claim table.

## External boundaries

All publication, commit, push, deployment, live call, video upload, and
Devpost actions require separate explicit authorization and final review.
