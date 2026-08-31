# CivicFlow release evidence

## Status

**Phase 5 documentation package; independently accepted and published as Sites
version 11.** This record covers Phase 5 Packets 5.0–5.4 only. The owner
selected MIT, and the published package includes a standard root `LICENSE` with
the project-level notice. The authorized Sites commit, managed-source push, and
deployment are recorded below; eligible public-source publication, video,
Devpost, and future live-provider actions remain separate external gates.

Evidence labels used here:

- `local-tested`: source-backed automated or local-browser evidence;
- `hosted-tested`: an observed check against an exact hosted identity;
- `user-confirmed`: the owner's recorded public UI confirmation;
- `deferred`: intentionally excluded from this release; and
- `unsupported`: a claim that must not be made about CivicFlow.

## Exact identities

### Accepted deployed runtime

| Field                         | Value                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Branch                        | `main`                                                                                                 |
| Source commit                 | `12360d10be1c6df8ada56bfccbefda2abc81629c`                                                             |
| ChatGPT Sites version         | `11` (documentation-only publication)                                                                  |
| Recorded environment revision | `2`                                                                                                    |
| Public URL                    | <https://civicflow.codesm.chatgpt.site>                                                                |
| Evidence date                 | 2026-08-31, Asia/Kolkata                                                                               |
| Result                        | Documentation-only publication succeeded; application behavior remains the version 10 accepted runtime |

This identity describes the current Sites publication. Hosted application
claims remain grounded in the version 10 checks recorded in the Phase 4 ledger;
version 11 adds only the Phase 5 documentation and license package.

### Phase 5 source/publication candidate

| Field               | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Starting branch     | `main`                                                                                                        |
| Starting HEAD       | `0632c5d503a98b9d37e2450f2e9c1f3265698930`                                                                    |
| Starting worktree   | Clean; `main` was 17 commits ahead of intentionally unpushed `origin/main`                                    |
| Candidate changes   | Documentation-only, committed as `12360d10be1c6df8ada56bfccbefda2abc81629c`, limited to the Phase 5 allowlist |
| Deployment identity | Sites version `11`, environment revision `2`, same public URL                                                 |
| Candidate evidence  | Recorded below; independent Sol High review is GO for local packets and external publication gates remain     |

Do not use the documentation-only version 11 publication as new evidence for
application behavior beyond the already accepted version 10 runtime.

## Official requirements checked

Accessed 2026-08-31 (Asia/Kolkata):

- [WebMCP Challenge page](https://webmcp.devpost.com/)
- [WebMCP Challenge official rules](https://webmcp.devpost.com/rules)

The pages currently require a working live URL accessible in ChatGPT's in-app
browser or Chrome with WebMCP enabled; an English text description explaining
WebMCP fit, user experience, people/agent collaboration, and implementation; a
public GitHub, GitLab, or Bitbucket repository containing source, assets, and
instructions with a detectable open-source license visible at the repository
top/About section; and a public YouTube demo under three minutes with clear
audio showing the functioning project and WebMCP use. The video must not use
third-party trademarks or copyrighted music/material without permission. The
project must remain available for judging through the judging period.

The rules also say that a pre-existing project must be meaningfully extended
with WebMCP during the submission period and that the entry should document
the distinction with dated commit history or equivalent evidence. The deadline
shown by the challenge page/rules is September 3, 2026 at 1:00 p.m. PDT
(September 4, 2026 at 1:30 a.m. IST). Recheck both pages immediately before any
publication or submission; this local record is not a substitute for current
Devpost entry state.

## Claim and evidence matrix

This matrix was built before the release artifacts were authored. Every public
claim in the README, demo script, storyboard, and Devpost draft must stay
within these rows.

| ID    | Claim                                                                         | State                                             | Exact owner/evidence                                                                                                                                       | Limitation                                                                                               |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| EV-01 | CivicFlow is a deterministic synthetic workflow demo                          | `local-tested`                                    | `src/domain/index.ts`, `createDemoApplicationSeed`; accepted local unit/contract/E2E ledgers                                                               | Not a government service, policy engine, or eligibility decision                                         |
| EV-02 | Exactly ten WebMCP tools are catalogued                                       | `local-tested`                                    | `src/webmcp/tool-catalog.ts`, `CIVICFLOW_TOOL_NAMES` and `TOOL_CATALOG`                                                                                    | No submit or attest tool                                                                                 |
| EV-03 | Browser registration uses WebMCP `execute`                                    | `local-tested`                                    | `src/webmcp/browser-model-context-port.ts`, `src/webmcp/use-webmcp-registry.ts`                                                                            | Feature-detects `document.modelContext`; manual UI remains available without it                          |
| EV-04 | Seven tools are static and three are contextual                               | `local-tested`                                    | `STATIC_TOOL_NAMES`, `CONTEXTUAL_TOOL_NAMES`, and `src/webmcp/registry-manager.ts`                                                                         | Contextual tools follow current section/selection                                                        |
| EV-05 | Agent mutations use existing commands/store and visible lifecycle state       | `local-tested`                                    | `src/webmcp/tool-handlers.ts`, `src/webmcp/tool-lifecycle.ts`, accepted collaboration/UI tests                                                             | Direct WebMCP execution is visible through activity/progress; assistant mutations are confirmation-gated |
| EV-06 | Gemini assistant uses the current WebMCP surface and button-only confirmation | `local-tested` + `hosted-tested`/`user-confirmed` | `src/assistant/current-tool-surface.ts`, `src/assistant/gemini-tool-bridge.ts`, `src/assistant/assistant-controller.ts`; accepted Phase 2/4 evidence       | Optional; no new provider call in Phase 5 and no guarantee of provider/quota behavior                    |
| EV-07 | Hosted session is server-issued and credential-safe                           | `local-tested` + `hosted-tested`                  | `server/gemini-session-core.ts`, `server/gemini-local-session.ts`, `server/sites-worker.ts`; accepted broker 200/no-store and setup evidence               | `GEMINI_API_KEY` is server-only; no value is recorded here                                               |
| EV-08 | Worker routes `/api/gemini/session` before SPA fallback                       | `local-tested` + `hosted-tested`                  | `server/sites-gemini-session-adapter.ts`, `server/sites-worker.ts`; Worker/session contract tests and Sites v10 evidence                                   | No custom analytics API route                                                                            |
| EV-09 | Human and agent paths converge on the same local application state            | `local-tested`                                    | `src/application/store.ts`, WebMCP handlers, portal/assistant tests                                                                                        | Browser-local persistence only; no cross-device sync or auth                                             |
| EV-10 | Submit Demo remains a human-only local fictional action                       | `local-tested`                                    | `src/ui/sections/ReviewSection.tsx`, application command/no-submit tests                                                                                   | No network request, government enrollment, agent submission, or attestation tool                         |
| EV-11 | Accepted deployed runtime is available at the public URL                      | `hosted-tested` + `user-confirmed`                | Application SHA `0632c5d503a98b9d37e2450f2e9c1f3265698930`, accepted Sites v10 checks, current docs-only Sites v11 publication, public URL, Phase 4 ledger | Version 11 adds documentation/license only; no new application UI proof is claimed                       |
| EV-12 | Sites platform traffic analytics is the only analytics scope                  | `deferred`                                        | Phase 4C decision in `civicflow-final-hardening-v1` ledger                                                                                                 | No custom analytics client, event route, D1, dashboard, or persistent visitor identity                   |
| EV-13 | Candidate setup/build/test gates are reproducible                             | `local-tested`                                    | Disposable exact candidate and command results in the verification section below                                                                           | Sol High accepted the local packets; external release gates remain                                       |
| EV-14 | Public source repository with detectable open-source license is ready         | `blocked`                                         | Owner-selected MIT root `LICENSE`; Sites-managed source push complete; official rules; no eligible public GitHub/GitLab/Bitbucket URL or push yet          | Publication-pending; public-repository detectability is not completed proof                              |
| EV-15 | Public YouTube demo is ready                                                  | `blocked`                                         | Official rules; no public URL or upload authorization exists                                                                                               | Storyboard only; publication-pending                                                                     |
| EV-16 | Devpost submission is ready                                                   | `blocked`                                         | No Devpost mutation authorized and no submission URL exists                                                                                                | Draft only; not submitted                                                                                |

The following are explicitly excluded as `unsupported`: government integration,
eligibility determination, official benefits advice, real enrollment, real
file upload, OCR, authentication, cross-device state, custom analytics, D1,
agent submission/attestation, and unverified provider behavior.

## Documentation RED evidence

The required presence check was run before authoring with the exact command:

```bash
missing=0
for file in README.md docs/architecture/civicflow-runtime.md docs/demo/civicflow-demo-script.md docs/demo/civicflow-video-storyboard.md docs/release/civicflow-release-evidence.md docs/release/civicflow-devpost-draft.md LICENSE; do
  if [[ -s "$file" ]]; then
    printf 'PRESENT %s\n' "$file"
  else
    printf 'RED missing-or-empty %s\n' "$file"
    missing=1
  fi
done
exit "$missing"
```

Observed exit code: **1**. Before this candidate was written, all six
non-license release artifacts and `LICENSE` were missing or empty. The owner
subsequently selected MIT and `LICENSE` was added; this historical RED result
does not describe the current artifact presence.

## Candidate verification

### Commands and result policy

The disposable candidate must run the repository's unchanged gates:

```bash
npm ci
npm run format:check
npm run lint
npm run scan:secrets
npm run typecheck
npm run test:unit -- --maxWorkers=1
npm run test:contract -- --maxWorkers=1
npm run build
npm run test:e2e
npm run verify
git diff --check
git status --short --branch
git rev-parse HEAD
```

`npm run verify` is the canonical aggregate gate. The explicit serial unit and
contract commands are retained for resource-safe count collection; they do not
replace the canonical result. If a parallel suite fails only because of proven
resource exhaustion, report that failure unchanged and rerun the exact suite
serially. Never relabel a canonical failure as a pass.

### Packet results

Observed 2026-08-31 (Asia/Kolkata) in disposable candidate
`/private/tmp/civicflow-phase5-candidate.ktA9d3`, cloned from the exact starting
HEAD above and populated with only the six allowlisted documentation files plus
the owner-selected `LICENSE`:

- `npm ci` — **PASS**; 299 packages installed. Non-blocking warnings: deprecated
  `whatwg-encoding@3.1.1`, deprecated `eslint@9.39.5`, and 80 packages seeking
  funding.
- `npm run format:check` — **PASS**; all files matched Prettier style.
- `npm run lint` — **PASS**; no diagnostics.
- `npm run scan:secrets` — **PASS**; no configured credential patterns found.
- `npm run typecheck` — **PASS** for both application and Node projects.
- `npm run test:unit -- --maxWorkers=1` — **PASS**; 53 files and 518 tests.
- `npm run test:contract -- --maxWorkers=1` — **PASS**; 19 files and 166
  tests.
- `npm run build` — **PASS**; Vite transformed 349 client modules and 6
  Worker modules. Generated files were `dist/client/index.html`, one client
  CSS asset, one client JavaScript asset, `dist/server/index.js`, and
  `dist/.openai/hosting.json`. Non-blocking warning: the 541.24 kB minified
  client chunk exceeds Vite's 500 kB advisory threshold.
- `npm run test:e2e` — **PASS**; 36 tests using 4 workers in 38.9 seconds.
  Non-blocking warning: `NO_COLOR` was ignored because `FORCE_COLOR` was set.
- `git diff --check` — **PASS**; no whitespace diagnostics.

The candidate's canonical aggregate `npm run verify` independently completed
**PASS** after the owner-selected `LICENSE` was added. It covered the same
format, lint, secret, type, unit, contract, build, and E2E gates: 53 unit
files/518 tests, 19 contract files/166 tests, and 36 E2E tests.

Generated-output audit:

- No credential value or configured secret pattern appeared in client or
  Worker output. The Worker bundle contains only the server-side variable name
  and code path for `GEMINI_API_KEY`; it does not contain a credential value.
- The production client bundle contains
  `VITE_CIVICFLOW_VOICE_ENABLED:"1"`, matching the tracked `.env.production`
  public-client gate used by the accepted hosted voice build. The Worker still
  requires its separate server-side voice flag and allowlisted origin.
- The generated Worker contains `/api/gemini/session` and no custom analytics
  or D1 route.

Final candidate status is clean `main` at HEAD
`12360d10be1c6df8ada56bfccbefda2abc81629c`; the seven allowlisted artifacts
are committed, pushed to the Sites-managed source repository, and published as
Sites version 11. EV-13 is locally evidenced, the owner license is present,
and independent Sol High review is **GO for local packets /
GO-with-external-gates for Phase 5**. An eligible public-repository URL/push,
public-repository license detectability, video, Devpost, and continued
judge-access gates remain open; this is not an external challenge-submission
GO.

## Artifact and security audit

Allowlisted candidate artifacts:

- `README.md`
- `docs/architecture/civicflow-runtime.md`
- `docs/demo/civicflow-demo-script.md`
- `docs/demo/civicflow-video-storyboard.md`
- `docs/release/civicflow-release-evidence.md`
- `docs/release/civicflow-devpost-draft.md`
- `LICENSE`

`LICENSE` contains the standard MIT text and the owner-selected project-level
notice. `.env.example` was audited and not changed because its blank
credential, disabled-by-default gates, origin names, and README guidance match.

The package contains no credential value, token, raw transcript, audio,
real-person data, custom analytics event, D1 schema, upload path, or submission
route. It names `GEMINI_API_KEY` only as a server-side variable. The static
secret scan must cover the candidate and generated build output while excluding
the repository's existing `.git`, `node_modules`, and generated directories as
defined by `scripts/scan-secrets.mjs`.

## No-submit and privacy findings

- WebMCP catalog and Gemini filtering contain no `submit_application` or
  attestation capability.
- Review & Sign's visible **Submit Demo** command is local, fictional, and
  displays that no network request was made.
- The application uses synthetic seed values and browser local storage only;
  do not enter real applicant data.
- Authentication, cross-device synchronization, custom identity, custom
  analytics, and D1 remain out of scope.
- Optional Gemini is gated and no Phase 5 live call occurred. Any provider
  behavior beyond the recorded Sites v10 checks is unverified.

## External release gates still unresolved

1. Owner separately authorizes push to an eligible public GitHub, GitLab, or
   Bitbucket repository and verifies the detectable license in the repository
   About section. The Sites-managed source push is not that public challenge
   repository.
2. Owner separately authorizes and uploads the under-three-minute demo to
   public YouTube, then records its real URL and audio/duration evidence.
3. Owner separately authorizes Devpost account/form mutation and final
   submission; the prepared draft is not a submission.
4. The public Site and judge access must remain available through the judging
   period. A product/build/environment change would reopen deployment review.

## Handoff state

This document records the independently accepted local package and its
documentation-only Sites publication. External challenge-submission GO remains
withheld. Independent reviewer routing and evidence:

```text
MODEL: gpt-5.6-sol
REASONING: high
ROUTING RATIONALE: final release acceptance requires independent comparison of the actual documentation diff, reproducible candidate, hosted evidence, security boundaries, and current submission rules
ESCALATION CONDITION: use Sol Max only if material contradictory or high-risk evidence survives the first review; otherwise return the defect or claim to its owning packet
```

The reviewer inspected the actual source checkout and candidate, reran the
gates, compared claims to EV-01–EV-16, verified the ten-tool,
browser-adapter, server-secret, no-submit, contextual, and 4C-deferred
boundaries, and preserved the distinction between the accepted application
behavior on source SHA `0632c5d503a98b9d37e2450f2e9c1f3265698930`/Sites v10 and
the documentation-only publication on source SHA
`12360d10be1c6df8ada56bfccbefda2abc81629c`/Sites v11. Do not record an
external-release GO until the remaining publication gates are handled by their
authorized owners; the local Sol High review is recorded above as
GO-with-external-gates.
