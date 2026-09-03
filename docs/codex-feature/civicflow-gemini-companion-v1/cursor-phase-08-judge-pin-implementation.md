# Cursor implementation packet — Phase 8 judge-only companion PIN

## Routing record

```text
MODEL: cursor-grok-4.6-xhigh
REASONING: xhigh
ROUTING RATIONALE: The user explicitly selected Cursor Grok 4.6 XHigh for a security-sensitive bounded implementation, and `cursor-agent --list-models` confirmed that exact identifier.
ESCALATION CONDITION: Stop on any non-clean baseline outside the plan docs, need for real secret access, incompatible interface expansion, failing unrelated regression, permission expansion, commit/push/deploy request, or inability to prove that denial precedes provider issuance.
PERMISSION ENVELOPE: Read the CivicFlow repository; edit only the Phase 8 likely files and focused tests; run non-destructive focused tests and repository verification commands. No external credentials, network calls, commit, push, deployment, Sites/Devpost mutation, or live Gemini call.
```

## Required read order

1. `MASTER.md`, `UPDATE_PROTOCOL.md`, and `phases/00-index.md` in this ledger.
2. `phases/09-judge-companion-pin.md` in full.
3. Current implementations and tests for the session core, local issuer, Sites
   Worker, assistant runtime/client/controller, AssistantPanel, companion
   styling, and environment examples.
4. Current branch, HEAD, status, and diff. The only expected pre-existing
   changes are this Phase 8 ledger packet. Stop on any other dirty path.

## Implementation contract

Follow RED-GREEN-REFACTOR. First demonstrate focused tests failing for the
missing behavior, then implement the smallest design in the phase document.
Preserve all current public WebMCP/manual behavior, token expiry, confirmation,
media cleanup, and no-submit boundaries.

The PIN is server-held configuration. The browser may transmit the judge's
entered value over HTTPS only when requesting a session, and may retain it only
in memory for the active Live lifecycle/reconnect. It must never be bundled,
persisted, logged, echoed, added to activity/transcripts, or placed in test or
documentation as a real value. Use obvious placeholders only.

Authentication and failed-attempt limiting must finish before
`issueEphemeralSession` can execute. Hosted voice fails closed if the configured
PIN is absent. The accessible PIN prompt appears only when Live changes from
off to on; cancel and failure keep Live off; microphone permission follows a
successful connection.

## Verification and handoff

Run the smallest focused RED/GREEN commands first, then:

```bash
npm run format:check
npm run scan:secrets
npm run typecheck
npm run test:unit -- --runInBand
npm run test:contract -- --runInBand
npm run build
git diff --check
git status --short
```

Run targeted assistant Playwright coverage if the existing scripts support a
bounded target without a live credential. Do not broaden permissions to force
a test through.

Return: exact starting HEAD/status; RED evidence; files changed; design summary;
focused and aggregate GREEN evidence; final diff stat/status; security and
accessibility self-review; remaining limitations. Do not commit, push, deploy,
touch real secrets, or make a live provider call.
