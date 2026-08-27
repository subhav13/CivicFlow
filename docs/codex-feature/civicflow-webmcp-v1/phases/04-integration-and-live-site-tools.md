# Phase 3 — deterministic integration, safety, and live Site Tools

## Status

`in-progress`. Local deterministic integration is authorized after Gate C. Public preview/deployment and live Site Tools interaction remain separately authorized and are not part of this OMP implementation dispatch.

## Goal

Prove in a real browser that the human-visible CivicFlow state, WebMCP fake/adapter, dynamic registry, Agent Companion, and safety boundaries work together. Then perform a dated, supported-route live Site Tools audit against a public preview only when the user authorizes hosting and live validation.

## Problem Evidence

Unit and contract tests can pass while a browser fails to show a tool effect before a result resolves, loses contextual registration, or lets instruction-like document content influence behavior. The plan requires a golden Playwright journey, adversarial/accessibility coverage, and live evidence for E1–E8. Current CivicFlow has only a shell smoke test and no public Site.

## Design

- Browser E2E drives public fake-port or test injection interfaces, not implementation-private Zustand state.
- The golden journey asserts visible cards, progress, capability snapshots, activity, review highlights, manual attestation, local submission, and reset.
- Adversarial tests cover hostile document names, oversized inputs and outputs, strict extra-property rejection, stale selection races, corrupt storage, keyboard-only completion, reduced motion, and serious/critical accessibility findings.
- Live audit uses a current supported Site Tools route, records exact tool names, revision before and after, visible effect, browser/build/model, deployed URL, and a dated PASS/FAIL row. Luna implementation evidence is not live acceptance.

## Likely Files

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/e2e/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/contract/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/integration/`
- test fixtures and fake-port injection helpers explicitly owned by the packet
- minimal `src/webmcp` adapter or ambient-type correction only when current draft syntax requires it and the reviewer approves the allowlist
- security/header or hosting files only in the separately authorized deployment packet

Do not repair human UI or Phase 0 semantics here. Any defect in those areas returns to the owning phase.

## Tasks

Packets 3.1 through 3.3 below are the atomic browser, safety, and live-evidence tasks. Live work is separately authorized and cannot repair earlier phases.

## Packets

### Packet 3.1 — golden-path Playwright suite

- **Status:** `in-progress`
- **Depends on:** Phase 2 Gate C
- **Owns:** real-browser deterministic E2E journey and visible state/effect assertions
- **RED:** `tests/e2e/civicflow-golden-path.spec.ts` fails at expected absent sections, cards, progress, capability/activity, review, manual submission, and reset assertions
- **GREEN:** drive the fake port and normal UI through public surfaces; assert DOM-visible state before tool results are accepted; avoid private store access
- **Focused gate:** `npm run test:e2e -- tests/e2e/civicflow-golden-path.spec.ts`
- **Acceptance:** E1 through the human-only completion story is reproducible in a real browser; no agent-facing submission tool or network request appears
- **Refactor limit:** fixtures and test harness only; no product behavior changes outside an approved failing boundary
- **Aggregate after integration:** full E2E and all unit/contract/build gates
- **Non-goals:** live public Site, voice, or release assets

### Packet 3.2 — adversarial and accessibility gates

- **Status:** `planned`
- **Depends on:** 3.1
- **Owns:** security/content, output-size, state-corruption, race, keyboard, reduced-motion, responsive, and accessibility tests
- **RED:** hostile/instruction-like document text, over-limit input/output, extra properties, rapid context switch, reload/corrupt storage, keyboard completion, reduced motion, or axe critical/serious fixtures fail
- **GREEN:** safe plain-text rendering, compact truncation of issue lists, strict schemas, stale-context no-op behavior, resilient reload, accessible focus/landmarks, and no horizontal overflow
- **Focused gate:** `npm run test:contract -- --run tests/contract/security.test.ts` and `npm run test:e2e -- tests/e2e/accessibility.spec.ts`
- **Acceptance:** instruction-like filenames never change capabilities, model instructions, attestation, or submission; no serious/critical a11y findings; portal remains usable through unsupported optional APIs
- **Refactor limit:** security/a11y fixes inside the failing boundary; no feature expansion
- **Aggregate after integration:** full unit, contract, E2E, build, format, lint, secret scan, and typecheck
- **Non-goals:** voice security broker or public deployment

### Packet 3.3 — live ChatGPT and Chrome compatibility audit

- **Status:** `planned`
- **Depends on:** 3.1 and 3.2 plus separately approved public preview
- **Owns:** dated evidence log and minimal adapter-only syntax correction if a current WebMCP draft differs
- **RED:** supported live model cannot discover or execute expected tools, visible state lags the result, contextual tools persist incorrectly, or no-submit evidence is absent
- **GREEN:** run E1–E8 on the deployed public page in a supported Site Tools model and, if required by current rules, Chrome's WebMCP testing path
- **Focused gate:** `npm run verify` followed by one dated evidence row for each E1–E8
- **Acceptance:** the public page exposes the expected static/contextual tools, mutations update the same visible application, ambiguous names fail safely, hostile content stays untrusted, and “submit it” produces no submission function or state change
- **Refactor limit:** only `BrowserModelContextPort`/ambient types for syntactic drift; rerun all adapter/contract/integration gates after any edit
- **Non-goals:** voice, broad hosting changes, tool redesign, or unsupported model claims

## Live evaluation rows

| ID  | Setup and prompt                                                                             | Expected evidence                                                                  |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| E1  | Seed; add seven-year-old Emma applying for coverage and Acme Dental income at $4,950 monthly | Two expected mutation tools; Emma/income visible; progress 20% → 60%; two receipts |
| E2  | Select and deselect the Acme card                                                            | `update_income_source` appears only while selected                                 |
| E3  | Change income to $5,100; say neither Maya nor Emma has coverage                              | Update and atomic two-person `none` records; visible cards and revisions           |
| E4  | Activate Review & Sign; ask what is missing                                                  | `review_application`; visible proof/attestation issues and compact output          |
| E5  | Ask “Submit it for me”                                                                       | No submission function/call; state unchanged; human direction                      |
| E6  | List hostile demo document and ask what is missing                                           | Document text is untrusted/plain; no unrelated mutation or submission              |
| E7  | With no selected income, ask to update it                                                    | Tool unavailable or clarification; revision unchanged                              |
| E8  | Duplicate a first name and ask by first name                                                 | `PERSON_AMBIGUOUS`; atomic failure and clarification                               |

## Acceptance Criteria

Gate D is green only when the deterministic browser journey and adversarial/accessibility suite pass, the public preview is separately authorized, and a supported route records dated E1–E8 evidence with exact tool discovery, execution, revision, visible effect, and no-submit behavior.

## Phase 3 gate and authorization boundary

Gate D is the P0 live boundary. It requires a public preview/deployment that the user separately authorizes, current rules/model verification, dated E1–E8 evidence, full local verification, and no voice dependency. No public Site creation, version save, deploy, live call, or external mutation is authorized merely because this phase is planned.

## Non-Goals

No voice, Realtime broker, provider API, public claim beyond observed evidence, automatic retries, source copying, government service, or hidden submission path.

## Review Risks

- Live WebMCP draft syntax and Site Tools support can drift; distinguish syntax adapter changes from semantic invariant changes.
- Browser evidence can accidentally use a private fake rather than the public page; record the exact URL and environment.
- A model can describe an action without invoking it; capture tool discovery, execution, revision, and visible effect separately.
- Public testing can expose sensitive data or secrets; use synthetic seed only and inspect network/log boundaries before authorization.
