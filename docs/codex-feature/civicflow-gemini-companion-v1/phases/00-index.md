# CivicFlow Gemini Live companion — phase index

## Current status

- **Feature status:** `in-progress` through the accepted local Phase 5 Packets
  5.1–5.3 over the mocked Gemini runtime; the real Packet 5.3 provider audit
  and Phases 6–8 remain pending a configured local credential or separate
  decision.
- **First handoff:** Phase 0 was documentation-only. Phase 1 Packets 1.1–1.3
  were separately authorized and are independently validated; later phases
  still require their own prompts.
- **Repository baseline:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`, branch `main`, HEAD `3fff4b7c75c726b21803a2a3e10fabd8c560cdd8`, clean at preflight.
- **Parent dependencies:** accepted core portal/WebMCP and selected local
  collaboration UX cut; formal live E1–E8/Packet 6.4 evidence remains tracked
  separately by the parent ledger.
- **Provider decision:** Gemini Live selected for the optional companion. The
  2026-08-28 preflight verified `gemini-3.1-flash-live-preview`, Preview,
  stateful WebSockets, ephemeral tokens, documented tool events, and the
  current free-tier/data-use caveat from official sources. Live quota,
  availability, and hosted session compatibility remain later-gate decisions.

## Phase routing

| Phase                                         | File                                                                                   | Status        | Entry                                            | Exit                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------ | --------------------------------------------- |
| 0 — baseline and live-evidence/source closure | [01-baseline-and-live-evidence.md](01-baseline-and-live-evidence.md)                   | `validated`   | recorded HEAD and allowlisted docs-only baseline | docs/evidence identity accepted by parent     |
| 1 — agent feedback and notification polish    | [02-agent-feedback-polish.md](02-agent-feedback-polish.md)                             | `validated`   | Phase 0 accepted                                 | Gate A: visible truthful same-tab feedback    |
| 2 — current tool surface and Gemini bridge    | [03-current-tool-and-gemini-bridge.md](03-current-tool-and-gemini-bridge.md)           | `validated`   | Gate A                                           | Gate B: exact current WebMCP mapping          |
| 3 — secure Gemini Live runtime                | [04-secure-gemini-live-runtime.md](04-secure-gemini-live-runtime.md)                   | `validated`   | Gate B and current docs verification             | Gate C: mocked secure session lifecycle       |
| 4 — unified voice/text companion              | [05-unified-voice-text-companion.md](05-unified-voice-text-companion.md)               | `validated`   | Gate C                                           | Gate D: accessible shared assistant           |
| 5 — integration, accessibility, and live gate | [06-integration-accessibility-live-gate.md](06-integration-accessibility-live-gate.md) | `in-progress` | Gate D                                           | Gate E: local proof and authorized live audit |
| 6 — release package                           | [07-release-package.md](07-release-package.md)                                         | `planned`     | P0 and voice include/cut decision                | Gate F: truthful reproducible package         |
| 7 — final release gate                        | [08-final-release-gate.md](08-final-release-gate.md)                                   | `planned`     | Gate F and external approvals                    | Gate G: exact-source independent GO           |

## Dependency graph

```text
Phase 0 source/evidence closure
  → Phase 1 activity/progress/notification polish
  → Phase 2 WebMCP surface and Gemini function bridge
  → Phase 3 secure Gemini Live runtime
  → Phase 4 unified accessible voice/text companion
  → Phase 5 local integration and separately authorized live audit
  → Phase 6 release package
  → Phase 7 final review, release, and submission gates
```

Phase 0 is validated by the documentation/source review recorded in its phase
document. Phase 1 is separately validated by the implementation and evidence
recorded in its phase document. Phase 2 is separately validated by the
provider-neutral bridge implementation and evidence recorded in its phase
document. Phase 3 is separately validated by the mocked secure session
boundary/lifecycle implementation and evidence recorded in its phase document.
Phase 4 is separately validated for the accessible shared companion UI and
controller integration over that mocked runtime, with evidence recorded in its
phase document. Later phase status does not change when this index is updated.
Undo from the collaboration ledger remains deferred and is not reintroduced
here.

## Gate summary

- **Phase 0 evidence gate:** source inventory, baseline identity, observed live
  evidence, stale-claim corrections, and parent-link review are complete.
- **Gate A:** operation/activity/progress/notification polish is visible,
  truthful, accessible, and same-tab testable.
- **Gate B:** current WebMCP tools are mapped exactly, refreshed dynamically,
  serialized, and returned without direct store/command access.
- **Gate C:** Gemini Live credential/session handling is secure in mocked tests,
  disabled by default, bounded, and media-clean.
- **Gate D:** one accessible text/voice panel shares a session and action path;
  text fallback and human confirmation remain complete.
- **Gate E:** local integration/security/a11y proof passes; live Gemini is a
  separately authorized bounded audit or voice is cut and disabled.
- **Gate F:** README/license/diagrams/demo instructions/evidence package pass
  fresh-checkout and claim-trace checks.
- **Gate G:** independent exact-source review accepts release identity and all
  externally authorized rehearsals; Devpost remains separately authorized.

## Phase 1 evidence pointer

The 2026-08-28 Phase 1 implementation was independently reviewed against the
accepted `main` baseline and is recorded in [02-agent-feedback-polish.md](02-agent-feedback-polish.md).
The local Gate A evidence is test-backed; it does not authorize Gemini bridge
or runtime work, voice/text companion work, live audit, hosting, release,
undo, cross-tab synchronization, new WebMCP tools, or external action.

The 2026-08-28 Phase 2 implementation was independently reviewed against the
same accepted `main` baseline and is recorded in
[03-current-tool-and-gemini-bridge.md](03-current-tool-and-gemini-bridge.md).
The local Gate B evidence is provider-neutral and fake-port only; it does not
authorize Gemini runtime/credentials, voice/text companion work, live audit,
hosting, release, undo, cross-tab synchronization, new WebMCP tools, or
external action.

The 2026-08-28 Phase 3 implementation was independently reviewed against the
same accepted `main` baseline and is recorded in
[04-secure-gemini-live-runtime.md](04-secure-gemini-live-runtime.md). The local
Gate C evidence is mocked and test-backed: it does not authorize a real Gemini
session, credential access, microphone use, hosting, deployment, live audit,
voice/text companion UI, release, undo, cross-tab synchronization, new WebMCP
tools, or external action.

The 2026-08-28 Phase 4 implementation was independently reviewed against the
same accepted `main` baseline and is recorded in
[05-unified-voice-text-companion.md](05-unified-voice-text-companion.md). The
local Gate D evidence is test-backed over the mocked Runtime Gate C: it does not
authorize a real Gemini session, credential access, microphone hardware,
hosting, deployment, live audit, release, undo, cross-tab synchronization, new
WebMCP tools, or external action.

The 2026-08-29 Phase 5 local Packets 5.1–5.3 implementation was independently
reviewed against the same accepted `main` baseline and is recorded in
[06-integration-accessibility-live-gate.md](06-integration-accessibility-live-gate.md).
The local integration, accessibility, privacy, exact-visible-tab, credential
broker, transport, media-cleanup, and UI-switch evidence is accepted over
mocks. The real provider audit remains unrun because no local credential was
configured; no live Gemini, hosting, deployment, quota/cost, release, or
external-action claim is made, and cross-tab synchronization remains unclaimed.

## Integration rules

- One writer per packet and one active writer for shared files.
- Existing ten WebMCP tools and collaboration contracts remain green.
- Assistant mutations use current WebMCP only and require visible confirmation.
- No phase can repair an earlier contract silently; return defects to the owning
  phase.
- Local tests and mocked Gemini events are not live-provider evidence.
- No remote action follows from a local phase gate.
