# CivicFlow runtime architecture

This document describes the accepted CivicFlow runtime without changing it.
The architecture is intentionally small: human controls, browser WebMCP, and
the optional Gemini Live companion converge on the existing application
commands and store. Analytics observes the hosted page only; it does not own
application state.

## Identity and evidence boundary

The hosted behavior referenced here is the already accepted deployment:

| Identity                      | Value                                      |
| ----------------------------- | ------------------------------------------ |
| Source commit                 | `0632c5d503a98b9d37e2450f2e9c1f3265698930` |
| Sites version                 | `10`                                       |
| Recorded environment revision | `2`                                        |
| Public URL                    | <https://civicflow.codesm.chatgpt.site>    |
| Evidence date                 | 2026-08-31, Asia/Kolkata                   |

The Phase 5 release documents were committed and published as the
documentation-only Sites version 11 from source SHA
`12360d10be1c6df8ada56bfccbefda2abc81629c`. They do not change the application
behavior represented by the accepted version 10 identity above. Local test
evidence and hosted evidence remain separate below.

## Data flow

```text
┌───────────────────┐       ┌───────────────────────────┐
│ Human form/UI     │──────▶│                           │
└───────────────────┘       │                           │
                            │ application commands     │
┌───────────────────┐       │ and Zustand store        │       ┌──────────────┐
│ Browser agent     │──────▶│                           │──────▶│ Visible UI   │
│ document.modelContext│    │                           │       │ progress,   │
└───────────────────┘       └───────────────────────────┘       │ activity,   │
             ▲                              ▲                  │ effects     │
             │                              │                  └──────────────┘
┌───────────────────┐                       │
│ Optional Gemini   │──current tool surface┘
│ Live companion    │   + confirmation UI
└───────────────────┘

┌──────────────────────────────┐
│ Human-only Submit Demo       │──local fictional completion; no network
└──────────────────────────────┘

┌──────────────────────────────┐
│ Sites built-in page/visitor  │──platform observation; no custom app events
│ analytics                    │
└──────────────────────────────┘
```

No agent or assistant path imports application mutation functions directly.
The WebMCP handler owns validation and composes an existing application
command; the Gemini bridge invokes the current WebMCP surface. The visible
human interface remains the source of status and confirmation feedback.

## Module boundaries

| Boundary          | Source owner                                                          | Responsibility                                                                                               | Explicit non-responsibility                              |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Application state | `src/application/*`                                                   | Validated state, command transitions, receipts, local persistence, operation/activity state                  | Provider calls, WebMCP registration, rendering           |
| Domain            | `src/domain/*`                                                        | Deterministic progress, review, guidance, and synthetic document-readiness selectors                         | Government policy, eligibility, network access           |
| WebMCP            | `src/webmcp/*`                                                        | Tool catalog, schemas, browser registration, contextual lifecycle, validation, execution, serialized results | Direct Gemini calls, D1, custom analytics                |
| Assistant         | `src/assistant/*`                                                     | Current tool snapshot, Gemini transport, confirmation, microphone/audio lifecycle                            | Direct application mutation or submission                |
| Client entry      | `src/main.tsx` and `src/app/client-voice-gate.ts`                     | Explicit production/local assistant gate and application startup                                             | Credential handling                                      |
| Sites Worker      | `server/sites-worker.ts` and `server/sites-gemini-session-adapter.ts` | API routing before SPA assets and hosted session composition                                                 | Application state, transcript storage, client secrets    |
| Gemini session    | `server/gemini-session-core.ts` and `server/gemini-local-session.ts`  | Origin/method/body/rate checks and server-only ephemeral-token issuance                                      | Long-lived credentials in the browser, business commands |
| Human review      | `src/ui/sections/ReviewSection.tsx`                                   | Attestation checkbox, local Submit Demo button, reset dialog                                                 | WebMCP submit/attestation capability                     |

## WebMCP registration

`src/webmcp/browser-model-context-port.ts` is the only application adapter
that references `document.modelContext`. It feature-detects the API, registers
definitions using the WebMCP `execute` callback, reads the current registered
tools, executes a selected tool, and subscribes to `toolchange`. Unsupported
browsers receive an empty/absent capability view and retain the manual portal.

`src/webmcp/use-webmcp-registry.ts` creates the registry manager. The manager
registers the static surface once, then refreshes contextual tools as the
current section or selected record changes. It uses generation checks and
abort controllers so stale registrations do not remain authoritative.

The source catalog contains exactly ten tools:

| Name                       | Registration | Current behavior                                 |
| -------------------------- | ------------ | ------------------------------------------------ |
| `get_application_progress` | static       | Read deterministic progress and section status   |
| `navigate_to_section`      | static       | Navigate the visible section                     |
| `get_next_actions`         | static       | Read at most three bounded next actions          |
| `add_household_member`     | static       | Validate and add a synthetic member              |
| `update_household_member`  | contextual   | Update the selected member                       |
| `add_income_source`        | static       | Validate and add a synthetic income source       |
| `update_income_source`     | contextual   | Update the selected income source                |
| `set_current_coverage`     | static       | Validate and set synthetic coverage records      |
| `list_uploaded_documents`  | static       | Read attached demo metadata and readiness        |
| `review_application`       | contextual   | Read review issues while Review & Sign is active |

The contextual rules are visible and deterministic:

- a selected household record enables `update_household_member`;
- a selected income record enables `update_income_source`; and
- the active Review & Sign section enables `review_application`.

There is no `submit_application` or attestation tool. The exact count and
names above are source claims from `src/webmcp/tool-catalog.ts`, not a claim
about any browser's current support beyond the recorded hosted evidence.

## Tool execution and visible state

Read-only handlers validate an empty strict input object, derive a bounded
result from the current store, and preserve the application revision. Mutation
handlers validate TypeBox/Ajv input, resolve natural names against the current
synthetic records, dispatch an existing application command with source
`webmcp`, and serialize a receipt. `runWebMcpMutation` publishes begin/applying
before the callback, then complete or fail with the resulting revision and
recovery information. The store's activity and operation state drive visible
feedback.

The Gemini companion creates a `CurrentToolSurface` from the same WebMCP port.
Its bridge snapshots current tools before execution, filters denied intents,
validates arguments against the current schema, and classifies mutation calls.
For an assistant mutation, the controller emits a pending confirmation and
the UI offers **Save change**, **Need correction**, and **Cancel**. Only
the explicit button action retries execution with `confirmed: true`. Spoken
text is not treated as confirmation. A denied submission or attestation name
never reaches execution.

## Hosted Gemini session path

When the optional assistant is enabled, the browser runtime requests
`POST /api/gemini/session` with an empty JSON body. The Sites Worker routes that
path before SPA fallback through `createSitesGeminiSessionAdapter`; other
`/api/*` paths return a no-store JSON 404, and non-API paths serve assets with
an `index.html` fallback for client routes.

`server/sites-worker.ts` supplies the hosted handler with:

- `GEMINI_API_KEY` from the Worker environment only;
- `CIVICFLOW_ALLOWED_ORIGINS`, parsed as exact HTTP(S) origins;
- `CIVICFLOW_VOICE_ENABLED`, which must be `1` and have a non-empty origin
  allowlist; and
- `auditEnabled: false`, because the local audit bypass is not honored by the
  hosted Worker.

The core handler fails closed when disabled, rejects an absent/unlisted origin,
non-POST requests, non-JSON bodies, oversized bodies, invalid JSON, and a
rate-window overflow. The issuer asks the provider for a constrained,
short-lived ephemeral session and returns only `accessToken` and `expiresAt`
with `Cache-Control: no-store`. The provider credential is never included in a
client response or Vite `VITE_*` variable.

The public v10 session endpoint and assistant were accepted in the prior phase
evidence. This Phase 5 package does not issue a new provider call, inspect a
credential, alter the environment, or claim unverified model/quota behavior.

## Persistence, privacy, and analytics

The application validates and stores the synthetic application in browser
`localStorage` under `civicflow.application.v1`. It has no account, auth,
remote application database, cross-device synchronization, fingerprinting, or
custom visitor identity. The phase-4 decision explicitly defers custom
analytics and D1. No `src/analytics/*`, analytics route, D1 binding, or custom
event schema is part of this release. Sites platform visitor/page-view
analytics, if shown by the hosting platform, is not CivicFlow application
telemetry and is not used to infer user identity or product events.

The seed and demo document names are synthetic. The app must not be used with
real applicant information. Optional Gemini traffic is provider-bound only
when its explicit gate is enabled; provider terms and retention are external
to this codebase and are not silently inferred here.

## Human-only completion boundary

`src/ui/sections/ReviewSection.tsx` renders the attestation checkbox and
**Submit Demo** button. The command stores `submitted_demo` in local validated
state, locks ordinary mutations, and displays “Synthetic demo submitted
locally. No network request was made.” Reset requires the visible confirmation
dialog and restores the deterministic seed. This is a fictional research
completion, not an official application, and no agent or assistant tool can
invoke it.

## Evidence and limitations

The exact source and hosted evidence mapping is maintained in
[`../release/civicflow-release-evidence.md`](../release/civicflow-release-evidence.md).
The package distinguishes local tests, hosted checks, user confirmation,
deferred work, and unsupported claims. In particular, it does not claim
government integration, eligibility, real enrollment/upload/OCR,
authentication, cross-device state, custom analytics/D1, agent submission, or
unverified provider behavior.
