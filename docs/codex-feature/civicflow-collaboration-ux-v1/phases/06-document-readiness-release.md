# Phase 6 — document readiness and collaboration release validation

## Status

`validated` for local Packets 6.1–6.3. Starts after UX Gates C and E; UX Gate D
remains deferred because undo was not selected. Packet 6.4 (live Site Tools
evidence and deployment) remains pending separate explicit authorization.

## Goal

Explain synthetic document readiness without file ingestion, then close the selected collaboration release through full local, responsive, security, WebMCP, and—only if separately authorized—live Site Tools evidence.

## Problem evidence

- Documents currently expose safe metadata presets and attached records, but requirement coverage is implicit.
- The review selector checks proof of income when income exists; the Documents page does not present that relationship as an explicit satisfied/missing checklist.
- `list_uploaded_documents` returns attached document metadata and count but not the safe requirement status an agent needs for guided preparation.
- A local UI/tool GREEN cannot establish that the public deployed Site registers and executes the additive tool or shows the new collaboration states.
- The parent release ledger separately owns README, license, video, deployment hardening, and Devpost submission. This phase must hand accepted evidence back without duplicating release ownership.

## Design

- Add a pure document-readiness selector over existing application/document metadata. Requirements are synthetic and application-completeness-only.
- Initial requirement matrix:
  - proof of income is required when at least one income source exists;
  - identity, coverage, and other presets are optional demo support and never change eligibility/completion unless the parent domain already says so;
  - no-income state does not require proof of income.
- Render requirement cards with `Required`, `Attached`, `Missing`, or `Optional`, a short reason, and the existing human preset action where applicable.
- Extend existing `list_uploaded_documents` success data with `requirements` and `missingRequiredCount`; retain untrusted-content annotation and 1,500-character cap.
- Do not add a new document tool. Do not read file bytes, accept upload, classify, extract, or transmit.
- Final validation runs the selected release cut from a clean exact baseline. Live evidence is separately authorized and recorded against the exact source/deployment.

## Likely files

### Production

- new `src/domain/document-readiness.ts`
- `src/ui/sections/DocumentsSection.tsx`
- new `src/ui/documents/DocumentReadinessChecklist.tsx`
- `src/webmcp/tool-handlers.ts`
- `src/webmcp/tool-results.ts` only if compaction needs a generic safe ordering adjustment
- `src/styles.css`

### Tests

- new `src/domain/document-readiness.test.ts`
- `src/ui/sections/DocumentsSection.test.tsx`
- new `src/ui/documents/DocumentReadinessChecklist.test.tsx`
- `tests/integration/static-read-navigation-tools.test.ts`
- `tests/contract/tool-catalog.test.ts`
- `tests/contract/adversarial-security.test.ts`
- new `tests/e2e/document-readiness.spec.ts`
- all selected prior-phase tests through `npm run verify`

### Planning/evidence

- this phase document for packet and gate evidence
- parent integration/release ledger only after accepted evidence or separately authorized remote action

No application completion rule, document schema, file input, OCR, network, eligibility, new tool, voice, server, or hosting change is allowed by document-readiness packets.

## Tasks and atomic packets

### Packet 6.1 — pure document requirements and visible checklist

- **Depends on:** UX Gates C and E
- **RED:** unit/component tests require income/no-income/attached/missing/optional matrices, deterministic order, exact reasons, text-safe names, and no completion change for optional documents
- **GREEN:** add pure selector and accessible checklist; reuse existing attach commands/presets
- **Allowed production:** document-readiness domain module, Documents section, new checklist component, focused CSS
- **Allowed tests:** new selector/checklist tests and existing Documents section test
- **Focused command:** `npm run test:unit -- src/domain/document-readiness.test.ts src/ui/documents/DocumentReadinessChecklist.test.tsx src/ui/sections/DocumentsSection.test.tsx`
- **Acceptance:** proof requirement mirrors accepted review rule; optional metadata is never presented as eligibility evidence
- **Stop condition:** feature needs file bytes, a new domain completion rule, policy lookup, or network access

### Packet 6.2 — enrich existing document-list result

- **Depends on:** accepted Packet 6.1
- **RED:** integration/contract tests require compact requirement summaries, missing count, preserved attached documents, unchanged revision, strict input, untrusted annotation, and hostile display-name safety
- **GREEN:** compose the selector in `list_uploaded_documents`; compact optional requirement detail before envelope/attached document integrity
- **Allowed production:** tool handler; result compaction only when RED proves necessary
- **Allowed tests:** static read/navigation, tool catalog/results, adversarial security
- **Focused commands:** `npm run test:unit -- tests/integration/static-read-navigation-tools.test.ts`; `npm run test:contract -- tests/contract/tool-catalog.test.ts tests/contract/adversarial-security.test.ts`
- **Acceptance:** no tool-count change, no mutation/activity claim, ≤1,500 characters, and document display names remain untrusted text
- **Stop condition:** result cannot fit without removing required envelope fields or weakening hostile-text tests

### Packet 6.3 — selected-cut local acceptance

- **Depends on:** accepted Packet 6.2 and every included prior gate
- **RED:** identify any failing focused/aggregate/responsive/security/no-submit test from the exact intended source; return defects to their owning packet rather than broadening this packet
- **GREEN:** no product code unless an owning packet is reopened; run clean install/build/verify and inspect actual diff/status
- **Allowed production:** none unless a specific prior packet is formally reopened
- **Allowed tests/evidence:** full repository test suite, build artifacts, local browser evidence, ledger evidence updates
- **Focused gate:** `npm ci`, `npm run verify`, `npm run scan:secrets`, `git diff --check`, and repository status/diff review
- **Acceptance:** selected cut is coherent, reproducible, synthetic-only, no-submit, responsive, reduced-motion compatible, and free of unexplained dirty overlap
- **Stop condition:** any product defect, secret, unsupported claim, test failure, or baseline mismatch remains

### Packet 6.4 — separately authorized live evidence and parent handoff

- **Depends on:** accepted Packet 6.3 and explicit user authorization for each remote action
- **RED:** the exact public deployment does not expose the expected tools/states, or its source identity cannot be matched
- **GREEN:** save/deploy only the authorized exact source through the approved Sites route, then test with supported Sol/Terra Site Tools
- **Required live cases:** discover exact ten tools; read next actions; reproduce and recover from unknown-person income without mutation; add a member/income; observe visible lifecycle/effect/progress; navigate all six sections; inspect document requirements; verify no submit/undo tool; verify normal human UI without Site Tools
- **Evidence:** date/time/timezone, exact local/source/remote commit identities, Sites version/deployment, public URL, model/route, tool input class, compact result, visible effect, revision before/after, screenshots where materially useful, and failures/limitations
- **Acceptance:** every claimed live behavior is observed on the exact deployment; parent integration/release ledgers receive the accepted evidence and selected cut
- **Stop condition:** authorization is absent, exact source identity differs, supported model/tool access is unavailable, or any live case contradicts local acceptance

## Phase verification

Local Gate F:

```bash
npm ci
npm run verify
npm run scan:secrets
git diff --check
git status --short --branch
git rev-parse HEAD
```

Independent final review checks:

- selected phase statuses and evidence;
- original nine plus accepted additive tool only;
- no submit/undo capability;
- no real data/file/network path;
- exact responsive/reduced-motion behavior;
- current-session persistence wording;
- release claims against observed evidence;
- parent-ledger update completeness.

## Acceptance criteria

- Document readiness is deterministic, safe, and application-completeness-only.
- Existing document-list tool reports attachments and requirements compactly without mutation.
- Selected collaboration cut passes clean local verification and independent review.
- Live claims exist only after separately authorized exact-deployment testing.
- Parent ledger identifies the included collaboration phases and known limitations.
- Release/submission work can proceed through the parent Phase 5 owner without hidden dependencies.

## Non-goals

No real files, OCR, document classification, eligibility advice, remote storage, new document tool, automatic upload, README/license/video authoring, Devpost submission, voice, unapproved commit/push/deploy, or live testing.

## Review risks

- Document labels can imply government requirements. Use explicit synthetic-demo wording and mirror only internal completeness rules.
- Live evidence may drift from local source. Record exact source/version/deployment identity before claims.
- Final gate can become a hidden fix packet. Reopen the owning phase for any defect.
- Deadline pressure can encourage unsupported claims. Cut optional phases instead of weakening verification.

## Gate F local evidence and implementation record

- **Attempt date and timezone:** 2026-08-28, Asia/Kolkata (IST).
- **Exact baseline branch and HEAD:** `main`,
  `801a165ff8f115d6a4801b1f33d087508104ec04`.
- **Baseline status and user-owned changes:** the worktree intentionally
  carried accepted Phase 1–5 collaboration changes, tests, and ledgers. Those
  changes were preserved; no reset, clean, merge, rebase, branch switch, or
  destructive operation was used.
- **MODEL:** `google-antigravity/gemini-3.7-flash`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** one bounded OMP Gemini run covered the pure document
  selector, visible checklist, existing read-only tool enrichment, and local
  selected-cut verification; one same-route correction closed the missing inline
  human action without expanding the document-only boundary.
- **ESCALATION CONDITION:** stop on file bytes/upload/OCR/classification,
  eligibility or new completion rules, new tool/schema/key, unallowlisted file,
  hostile-text regression, payload overrun, or any commit/push/deploy/live/
  remote mutation.
- **Packet and allowed files:** Packets 6.1–6.3 were executed in one writer
  run under their documented allowlists. The correction was limited to the
  Documents section/checklist and focused tests. Packet 6.4 was explicitly not
  dispatched because live/deployment authorization was absent.
- **Actual changed files attributed to Phase 6:**
  `src/domain/document-readiness.ts`,
  `src/domain/document-readiness.test.ts`,
  `src/ui/documents/DocumentReadinessChecklist.tsx`,
  `src/ui/documents/DocumentReadinessChecklist.test.tsx`,
  `src/ui/sections/DocumentsSection.tsx`,
  `src/ui/sections/DocumentsSection.test.tsx`, `src/styles.css`,
  `src/webmcp/tool-handlers.ts`,
  `tests/integration/static-read-navigation-tools.test.ts`,
  `tests/contract/adversarial-security.test.ts`, and
  `tests/e2e/document-readiness.spec.ts`. Existing Phase 1–5 shared-file
  changes remain attributed to their earlier gates; no unallowlisted Phase 6
  production module was added.
- **RED command, expected failure, and observed failure:** Packet 6.1 RED
  recorded missing selector/checklist modules; Packet 6.2 RED recorded absent
  `requirements` and `missingRequiredCount` fields; Packet 6.3’s initial browser
  and aggregate checks were then run by the worker. Independent review found
  one concrete 6.1 integration gap—the checklist callback was not wired from
  `DocumentsSection`—and the correction RED reproduced the absent inline
  action before fixing it.
- **GREEN implementation summary:** added deterministic proof-of-income
  readiness that mirrors the accepted review rule, optional metadata statuses,
  an accessible checklist with the existing attach action, and compact
  requirement/missing-count data on the existing read-only document-list tool.
  Hostile display names remain inert text; no file input, bytes, network, new
  tool, eligibility claim, or application completion rule was introduced.
- **Focused command results:** independent Phase 6.1 unit gate passed 3 files/
  14 tests; Phase 6.2 integration gate passed 1 file/11 tests and the focused
  contract/security gate passed 2 files/19 tests; document-readiness E2E passed
  1 test. The inline-action correction passed 2 unit files/6 tests and 1 E2E
  test.
- **Clean-install result:** independent `npm ci` installed 299 packages and
  reported 0 vulnerabilities; deprecation warnings were non-blocking.
- **Aggregate gate result:** independent `npm run verify` passed formatting,
  lint, secret scan, typecheck, 33 unit files/260 tests, 10 contract files/88
  tests, production build, and 32 Playwright E2E tests. `git diff --check`
  passed.
- **Diff/status review:** branch and HEAD remained `main`/
  `801a165ff8f115d6a4801b1f33d087508104ec04`. The current dirty worktree is
  limited to the preserved Phase 1–5/ledger changes plus the Phase 6 allowlist;
  no commit, push, deploy, publish, Site save, live call, or hosted mutation
  occurred.
- **Independent reviewer and findings:** coordinator review verified the
  income/no-income/attached/missing/optional matrix, canonical order, proof
  parity with review completion, inline attach transition, strict empty input,
  unchanged revision/activity for list queries, ≤1,500-character output,
  untrusted display-name handling, no file/network path, and preservation of
  the exact tool catalog and no-submit behavior. One missing callback was routed
  through the same Gemini path; its focused and aggregate reruns are green.
- **Status decision:** **Local Gate F accepted; Phase 6 `validated` for
  Packets 6.1–6.3.** Packet 6.4 remains pending separate explicit
  authorization; no public/live release claim is made.
- **Risks, assumptions, and unresolved decisions:** document readiness is a
  synthetic completeness aid, not a government requirement or eligibility
  determination. The public deployment may still differ from this dirty local
  source until an authorized exact-version live check. Parent release packaging
  and any voice decision remain separately owned; Phase 4 undo remains deferred.

### Worker evidence

- Main Phase 6 run: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-021143-55320`
- Inline checklist correction: `/Users/SubhavMathur/.local/state/omp-codex-runs/CivicFlow/20260828-021922-56795`
