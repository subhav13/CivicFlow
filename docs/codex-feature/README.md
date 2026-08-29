# CivicFlow feature ledgers

This directory is the durable source of truth for CivicFlow implementation work.

- Read `civicflow-webmcp-v1/MASTER.md` first for the accepted core application, WebMCP, optional voice, release boundaries, and original phase evidence.
- Read `civicflow-collaboration-ux-v1/MASTER.md` before implementing the post-P0 visible-collaboration, guidance, recovery, undo, mobile, onboarding, or document-readiness enhancements.
- Read `civicflow-gemini-companion-v1/MASTER.md` for the optional Gemini Live text/voice companion, its WebMCP-only bridge, accessibility gates, and release boundaries. Its Phase 0 documentation/source closure, Phase 1 feedback/retention polish, and Phase 2 provider-neutral bridge are validated; Phase 3 and later implementation phases require separate prompts.

For each ledger, continue with its `UPDATE_PROTOCOL.md`, `phases/00-index.md`, and active phase document before changing the repository.

The ledgers preserve the accepted synthetic-only product boundary, one-state and one-capability-surface architecture, human-only submission boundary, dependency-ordered packets, focused tests, and independent acceptance evidence. They do not authorize commits, pushes, Site creation or deployment, live APIs, secrets, or hosted configuration changes.

## Ledger routing

| Ledger                                                                           | Owns                                                                                                                        | Current boundary                                                                                                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [CivicFlow WebMCP v1](civicflow-webmcp-v1/MASTER.md)                             | Core application, WebMCP tools, Sites, live Site Tools, historical OpenAI Realtime plan, and release ownership              | Preserve the original nine-tool contract and human-only submission; live E1–E8 remains evidence-gated.                                                  |
| [CivicFlow visible collaboration UX v1](civicflow-collaboration-ux-v1/MASTER.md) | Activity, operation feedback, progress, guidance, recovery, mobile, onboarding, persistence wording, and document readiness | Selected local hackathon cut accepted; undo remains deferred and live Packet 6.4 remains separately authorized.                                         |
| [CivicFlow Gemini Live companion v1](civicflow-gemini-companion-v1/MASTER.md)    | Optional text/voice Gemini Live runtime and its WebMCP-only assistant bridge                                                | Phases 0–2 are validated; Gemini model/transport/hosting/free-tier facts require current official verification, and Phase 3+ requires separate prompts. |

`sources/` mirrors and the attached planning documents are read-only references. New evidence belongs in the ledger according to `UPDATE_PROTOCOL.md`; do not silently rewrite an accepted decision or phase gate.
