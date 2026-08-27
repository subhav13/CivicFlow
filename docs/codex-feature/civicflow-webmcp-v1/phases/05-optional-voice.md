# Phase 4 — optional Realtime voice differentiator

## Status

`planned` and intentionally optional. Entry requires Gate D. If the voice path misses its declared cut date or any security/cost/live gate, mark it `deferred`, set the public voice mode to `off`, and ship the proven P0 without destabilizing it.

## Goal

Let an explicitly started embedded voice session discover and call the same current WebMCP tools that ChatGPT sees, with coherent transcript/status and safe failure behavior. Voice is an adapter over WebMCP, not a second command layer or parallel product.

## Problem Evidence

The product brief's differentiator is voice using `document.modelContext.getTools()` and `executeTool()` against the same live UI. The plan requires current-tool refresh, serialized function calls, a protected WebRTC session broker, media cleanup, and an explicit cut rule. No voice or server code exists in the current repository, and the normal portal must remain independent of it.

## Design

- `CurrentToolSurface` snapshots the latest WebMCP registrations, executes by exact registered name, subscribes to changes, and has no application command imports.
- The provider-neutral bridge maps each current tool to a Realtime function definition, preserves its name/description/schema, parses JSON once, refreshes before execution, sends the exact returned WebMCP string as function output, and serializes calls per session. It never adds submission.
- A same-origin SDP broker is disabled by default. If separately authorized, it accepts bounded POST `application/sdp` from the expected origin, uses fixed server-owned model/voice/instructions, keeps the standard API key server-side, maps safe errors, applies rate/spend controls, and redacts logs.
- The browser requests microphone access only after an explicit click. It shows off/connecting/listening/thinking/speaking/error states, allows stop, stops all tracks on disconnect/teardown/page hide/fatal error, and keeps transcript/audio in memory only.
- A fallback speech/typed route is contingency only. It still uses `CurrentToolSurface`, and it is implemented only after an explicit decision to cut Realtime while retaining a voice differentiator.

## Likely Files

- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/types.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/webmcp-current-tool-surface.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/webmcp-voice-bridge.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/realtime-client.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/voice-controller.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/agent-companion/VoiceControls.tsx`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/server/realtime-session-core.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/server/sites-realtime-session-adapter.ts`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/tests/contract/`
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/voice/` tests
- `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow/src/ui/agent-companion/` tests

Configuration files and `.openai/hosting.json` are allowed only in the explicitly authorized broker/hosting packet. Never inspect or print secret values. No live call is part of implementation acceptance until Packet 4.4 authorization.

## Provider-neutral contracts

```ts
type ProviderFunctionTool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

interface CurrentToolSurface {
  snapshot(signal?: AbortSignal): Promise<RegisteredToolRef[]>;
  execute(
    name: string,
    argumentsJson: string,
    signal?: AbortSignal,
  ): Promise<string>;
  subscribe(listener: () => void): () => void;
}

interface VoiceSession {
  connect(signal?: AbortSignal): Promise<void>;
  disconnect(): Promise<void>;
  replaceTools(tools: ProviderFunctionTool[]): Promise<void>;
  sendFunctionOutput(callId: string, output: string): Promise<void>;
  requestResponse(): Promise<void>;
  onEvent(listener: (event: VoiceEvent) => void): () => void;
}
```

## Tasks

Packets 4.1 through 4.5 below are the atomic voice tasks. Packet 4.5 remains intentionally deferred unless the explicit Realtime cut decision is made.

## Packets

### Packet 4.1 — CurrentToolSurface and protocol-level voice bridge

- **Status:** `planned`
- **Depends on:** Gate D and Phase 2 tool surface
- **Owns:** current WebMCP snapshot/execute adapter and provider-neutral function-call bridge
- **RED:** tool mapping, initial/changed snapshots, invalid arguments, missing contextual tool, call serialization, abort, exact output round trip, and no-submit function-list tests fail
- **GREEN:** map current registrations, refresh on change, find the latest tool before execution, return a synthetic safe error for invalid JSON or missing tool, and pass the unchanged WebMCP string to the session
- **Focused gate:** `npm run test:contract -- --run tests/contract/webmcp-voice-bridge.test.ts`
- **Acceptance:** no application command imports, no direct store access, no submission function, serial calls, and disconnected sessions abort pending work
- **Refactor limit:** protocol mapping only; no media, broker, or UI changes
- **Non-goals:** live OpenAI call, microphone, deployment, or fallback speech

### Packet 4.2 — secured Realtime SDP broker

- **Status:** `planned`
- **Depends on:** 4.1 and an explicitly selected hosting adapter
- **Owns:** provider-neutral session core and small Worker-compatible ESM adapter
- **RED:** disabled mode, method/content-type/body/origin/same-site, upstream failure, rate-limit, safe-error, secret-leak, and log-redaction tests fail
- **GREEN:** fixed-config same-origin `POST /api/realtime/session` broker that rejects when disabled, bounds SDP at 100 KiB, validates origin, keeps the key server-side, returns `application/sdp` with `Cache-Control: no-store`, and maps safe error codes
- **Focused gate:** `npm run test:contract -- --run tests/contract/realtime-session-api.test.ts` and `npm run scan:secrets`
- **Acceptance:** browser cannot choose model, voice, instructions, modalities, or tools; raw SDP/audio/transcript/key/full upstream body never enters logs; mocked success returns answer SDP; rate/spend controls are verified before enablement
- **Refactor limit:** broker security and provider adapter only; no application data storage
- **Non-goals:** live call, hosting deployment, or portal changes without authorization

### Packet 4.3 — WebRTC client and companion controls

- **Status:** `planned`
- **Depends on:** 4.1 and 4.2
- **Owns:** explicit-start media client, status/transcript controls, stop/retry, teardown and page-hide cleanup
- **RED:** tests fail for microphone-before-click, SDP exchange, data-channel events, status transitions, permission denial, disconnect/track cleanup, page hide, retry, and portal usability after error
- **GREEN:** isolated client/controller and accessible controls that leave P0 usable after any optional failure
- **Focused gate:** `npm run test:unit -- --run src/voice/realtime-client.test.ts src/voice/voice-controller.test.ts src/ui/agent-companion/VoiceControls.test.tsx`
- **Acceptance:** no microphone before explicit click; all terminal states stop tracks; transcript is in-memory and reset on reload/reset; unavailable voice leaves the portal functional
- **Refactor limit:** lifecycle and UI state only; no tool semantics or server changes
- **Non-goals:** live spend, public enablement, or fallback implementation

### Packet 4.4 — authorized live voice audit and cut decision

- **Status:** `planned`
- **Depends on:** 4.3, separate live-call/deploy authorization, and spend/rate controls
- **Owns:** bounded E3, E5, and ambiguity audit plus explicit include/cut decision
- **RED:** voice fails to use current WebMCP tools, visible UI differs from ChatGPT path, ambiguity is not recoverable, dynamic tools are stale, or “submit it” exposes a function
- **GREEN:** one bounded authorized session passes golden income/coverage correction, contextual disappearance, ambiguity, tool-error recovery, and no-submit prompts within the agreed cost/time limit
- **Focused gate:** `npm run verify` plus dated evidence for E3, E5, and ambiguity, rate-limit check, and spend-cap check
- **Acceptance:** the bridge calls the same current tools, media/status/transcript are coherent, no submission function exists, and the voice claim is backed by evidence; otherwise voice is cut and P0 remains intact
- **Refactor limit:** adapter/config corrections proven by the live evidence only
- **Non-goals:** unlimited sessions, public voice by default, or rescuing a failing voice path by weakening P0

### Packet 4.5 — fallback voice or typed routing, conditional

- **Status:** `deferred` until Packet 4.4 explicitly cuts Realtime while retaining a voice differentiator
- **Depends on:** formal cut decision and enough schedule after P0
- **Owns:** feature-detected SpeechRecognition/typed input, provider-neutral tool routing, and speech synthesis cleanup
- **RED:** fallback attempts direct commands, stale tools, parallel calls, unsupported speech crashes, or synthesis survives stop/error
- **GREEN:** transcript routes through `CurrentToolSurface`; unsupported browsers expose typed mode; speech stops cleanly
- **Focused gate:** `npm run test:contract -- --run tests/contract/fallback-tool-router.test.ts`, `npm run test:unit -- --run src/voice/fallback-controller.test.ts`, and `npm run verify`
- **Acceptance:** P0 tests remain unchanged and no alternate mutation path exists
- **Refactor limit:** fallback only; do not implement preemptively when Realtime is retained
- **Non-goals:** parallel Realtime and fallback products or unapproved provider APIs

## Acceptance Criteria

Gate E is green only for an authorized, secure, cost-bounded voice path that discovers and executes current WebMCP tools with clean media lifecycle and no submission function. If those conditions are not met by the cut date, the accepted outcome is voice disabled and P0 preserved.

## Phase 4 gate

Gate E is either a fully evidenced, authorized voice path with security and cost controls or an explicit cut to `VITE_VOICE_MODE=off`. A deferred voice path does not block the P0 human portal, WebMCP surface, live Site Tools evidence, or release.

## Non-Goals

No default microphone access, raw provider key in the client, client-selectable model/config, direct application commands, hidden submission, unbounded cost, unsupported live call, or voice requirement for normal portal use.

## Review Risks

- Tool snapshots can race with model function calls; refresh and serialize every call.
- WebRTC and microphone APIs vary by browser; failure must leave P0 usable.
- A broker can leak keys or sensitive media in logs; security tests and secret scans are mandatory.
- Voice can consume schedule or budget; use the fixed cut rule rather than destabilizing P0.
