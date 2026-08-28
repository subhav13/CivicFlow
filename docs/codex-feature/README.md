# CivicFlow feature ledgers

This directory is the durable source of truth for CivicFlow implementation work.

- Read `civicflow-webmcp-v1/MASTER.md` first for the accepted core application, WebMCP, optional voice, release boundaries, and original phase evidence.
- Read `civicflow-collaboration-ux-v1/MASTER.md` before implementing the post-P0 visible-collaboration, guidance, recovery, undo, mobile, onboarding, or document-readiness enhancements.

For either ledger, continue with its `UPDATE_PROTOCOL.md`, `phases/00-index.md`, and active phase document before changing the repository.

The ledgers preserve the accepted synthetic-only product boundary, one-state and one-capability-surface architecture, human-only submission boundary, dependency-ordered packets, focused tests, and independent acceptance evidence. They do not authorize commits, pushes, Site creation or deployment, live APIs, secrets, or hosted configuration changes.

`sources/` mirrors and the attached planning documents are read-only references. New evidence belongs in the ledger according to `UPDATE_PROTOCOL.md`; do not silently rewrite an accepted decision or phase gate.
