# Phase 5 — polish, release, and submission evidence

## Status

`planned`. This phase is not authorized to deploy or publish. It starts after
the P0 live decision, the explicit voice include/cut decision, and inclusion of
the reaccepted companion collaboration UX Gates A, B, C, and E plus retained
local Gate F when that selected enhancement cut is being released. The
optional Gemini Live companion's release artifacts and voice evidence are
owned by [its child ledger](../../civicflow-gemini-companion-v1/MASTER.md) and
must be accepted before this parent phase claims a voice-enabled release. Packets
M1–M2 closed the five judge-facing corrections; companion Phase 4 undo is
deferred for the current path, and companion live Packet 6.4 remains separately
authorized.

## Goal

Make the proven CivicFlow experience release-ready, verify responsive/accessibility and failure states, harden an authorized public Sites deployment, and assemble reproducible repository and hackathon evidence. Keep claims narrower than the evidence.

## Problem Evidence

The current repository is public-facing in intent but has no README, license, release checklist, public Site, video, or final evidence package. The approved plan requires a coherent visual/a11y pass, HTTPS and security checks, a fresh-clone reproduction, current Devpost verification, and independent final acceptance. Voice must remain removable without altering P0.

## Design

- Polish is constrained to responsive layout, loading/empty/error states, restrained motion, copy consistency, demo reset affordance, and an architecture panel that reflects real runtime state.
- Hosting uses ChatGPT Sites by default through the existing Vite capability path. `.openai/hosting.json`, Vite integration, headers, and environment configuration change only when deployment is separately authorized and the packet allowlist names them.
- Public deployment must be anonymous as intended, HTTPS, reload/deep-link safe, secret-free, and functional when WebMCP or voice is unavailable. Voice is disabled unless Gate E passed and the user explicitly authorizes public enablement.
- The repository package explains synthetic limitations, setup, tests, browser/Site Tools prerequisites, deployment boundary, known limitations, and the exact observed feature claims. A short public video demonstrates live WebMCP rather than slides alone only after current rules are reverified.
- An independent Sol reviewer compares the actual release commit, deployment identifier, public URL, video, and evidence rows before recording GO or NO-GO; when the selected cut includes companion Phase 5, the reviewer also carries forward its Gate E evidence and the explicit Phase 4 undo deferral.

## Likely Files

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/` and existing styles for bounded polish
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/e2e/` and accessibility fixtures
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/README.md`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/LICENSE`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/.openai/hosting.json` only after explicit Sites authorization
- Vite/security/environment files only when the authorized hosting packet requires them
- release evidence and video checklist files under an approved repository documentation path

Do not change Phase 0 contracts, WebMCP semantics, voice behavior, or product scope during polish. A functional defect returns to its owning phase.

## Tasks

Packets 5.1 through 5.4 below are the atomic polish, hosting, submission, and final-review tasks. Deployment remains separately authorized.

## Packets

### Packet 5.1 — visual, accessibility, and demo polish

- **Status:** `planned`
- **Depends on:** final P0-only or voice-enabled choice
- **Owns:** responsive refinement, loading/empty/error states, reduced motion, copy consistency, reset affordance, and screenshot-ready truthful architecture panel
- **RED:** `tests/e2e/accessibility.spec.ts` and `tests/e2e/responsive-visual.spec.ts` fail at required viewports, keyboard/a11y, state, or reset assertions
- **GREEN:** refine without scope expansion and keep all capability/activity content runtime-derived
- **Focused gate:** `npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/responsive-visual.spec.ts` and `npm run verify`
- **Acceptance:** 375px, 768px, and 1440px checks pass; six-section accessibility remains green; reset completes in one confirmation; reduced motion is honored
- **Refactor limit:** CSS/presentation and explicitly failing UI states only
- **Non-goals:** new tools, voice recovery, public deployment, or backend changes

### Packet 5.2 — public deployment hardening

- **Status:** `planned`
- **Depends on:** 5.1 and explicit deployment authorization
- **Owns:** ChatGPT Sites configuration, Worker-compatible hosting adapter, security headers, environment settings, rate/spend controls if voice is enabled, HTTPS smoke, deep-link/reload, and live WebMCP audit
- **RED:** authorized staging/public checks fail for HTTPS, headers, anonymous access, reload, secret absence, WebMCP/voice-disabled degradation, or live E1/E2/E5
- **GREEN:** deploy only a saved authorized version from the exact intended source state; verify public behavior and preserve normal UI without optional APIs
- **Focused gate:** `npm run verify`, `npm run scan:secrets`, and a dated deployment checklist covering HTTPS, headers, anonymous access, reload/deep-link, E1, E2, E5, and voice-disabled degradation
- **Acceptance:** public URL works without login; secrets are absent from build/network/logs; Site Tools and voice failure do not break the portal; current rules are reverified
- **Refactor limit:** hosting/security/configuration only; a provider change needs documented Sites incompatibility evidence and user approval
- **Non-goals:** unapproved deploy, public voice, custom domain, external database, or live claim without evidence

### Packet 5.3 — repository and submission package

- **Status:** `planned`
- **Depends on:** 5.2
- **Owns:** README, architecture/flow diagram, exact setup/test/deploy instructions, synthetic limitations, browser/Site Tools prerequisites, license, known limitations, video script, and judging checklist
- **RED:** a fresh clone cannot reproduce install/test/build, source/license is absent, video is missing or over the current rule, or claims cannot be traced to evidence
- **GREEN:** write public documentation and package the observed evidence without claiming unsupported voice, eligibility, government integration, or agent submission
- **Focused gate:** in a fresh checkout run `npm ci && npm run verify`; record PASS for setup reproduction, license, public repository, video access/audio/duration, and current Devpost requirements
- **Acceptance:** repository source and license are public; setup/test/build are reproducible; video is public, audible, within current duration, and demonstrates live WebMCP; limitations are explicit
- **Refactor limit:** documentation and release artifacts only
- **Non-goals:** source redesign, unverified claims, or external account mutations beyond authorized release

### Packet 5.4 — final independent acceptance

- **Status:** `planned`
- **Depends on:** 5.3
- **Owns:** final diff/status review, full gate rerun, clean public rehearsal, claim/evidence comparison, forbidden-scope check, and GO/NO-GO record
- **RED:** any P0 blocker, unresolved secret, submission capability, fake live claim, missing evidence row, failing gate, or unexplained dirty overlap
- **GREEN:** independent Sol reviewer runs the full clean-install suite and public rehearsal against the exact release URL and commit/deployment identifiers
- **Focused gate:** `npm ci && npm run verify && npm run scan:secrets`, followed by live E1, E2, E4, and E5 on the exact release URL
- **Acceptance:** no unresolved P0 blocker, no secret, no agent submission, no unsupported live claim, and one signed GO record with commit SHA, deployment ID, evidence links, and known limitations
- **Refactor limit:** reviewer may report or return the release to its owning packet; it must not silently broaden scope
- **Non-goals:** new features, last-minute voice rescue, unapproved deployment or push

## Acceptance Criteria

Gate F is green only when an independent reviewer accepts the exact release commit and deployment, fresh-clone verification passes, public source/license/instructions/video and current rules evidence exist, and every product claim is narrower than the recorded evidence.

## Phase 5 gate

Gate F is the final release boundary. It requires an independently accepted exact commit and deployment, full local verification from a clean clone, public source/license/instructions, current rules evidence, a truthful video, and a release decision that distinguishes P0 from any voice capability actually proven.

## Non-Goals

No release action is authorized by this document. Do not deploy, publish, push, save a Site version, change hosted environment variables, add a custom domain, access secrets, or make live calls without explicit user authorization and a packet-specific evidence record.

## Review Risks

- A polish pass can hide a functional regression; rerun full gates and the keyboard journey.
- Hosting configuration can leak a secret or break unsupported-browser degradation; inspect built output and public headers/network behavior.
- Current hackathon rules, Sites behavior, and WebMCP support may change; reverify immediately before submission.
- Video and README claims can outrun evidence; every claim must map to a dated test or live row.
- Last-minute voice pressure can destabilize P0; apply the cut rule and ship the proven boundary.
