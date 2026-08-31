# CivicFlow

CivicFlow is a synthetic public-benefits workflow for exploring a practical
human-and-agent experience with WebMCP. A person can complete the same local
application that a browser agent can inspect and update through a bounded,
typed tool surface. The product is a research demo: it is not a government
service, an eligibility engine, or an enrollment submission.

> Release status: the Phase 5 documentation package is committed and published
> as Sites version 11 at <https://civicflow.codesm.chatgpt.site>. The
> application behavior remains the previously accepted Sites version 10
> implementation; this release added documentation and the MIT license only.

## What the demo shows

The useful unit is one shared workflow rather than a chat bolted onto a form:

```text
person in the portal ───────────────┐
browser agent through WebMCP ──────┼─ commands/store ─ visible UI
optional Gemini Live companion ────┘

human-only Submit Demo ─ local fictional completion
```

The human sees the application sections, selections, activity, operation
progress, validation messages, and effects. An agent can use the same current
state through structured tools instead of guessing at labels or click order.
Mutation inputs are schema-validated. The Gemini companion presents a visible
button-only confirmation before it applies a mutation; it cannot submit or
attest the application.

## Live judge path

The accepted hosted identity is:

- URL: <https://civicflow.codesm.chatgpt.site>
- source identity: `12360d10be1c6df8ada56bfccbefda2abc81629c`
- ChatGPT Sites version: `11` (documentation-only publication)
- recorded deployment environment revision: `2`
- evidence state: application behavior hosted-tested and user-confirmed in
  Sites version 10; version 11 published the documentation-only package on
  2026-08-31 (Asia/Kolkata)

Open the URL in ChatGPT's in-app browser, which supports WebMCP, or in Google
Chrome 149 or later with `chrome://flags/#enable-webmcp-testing` enabled. The
browser capability is optional for the human portal; when WebMCP is absent,
the regular form UI remains the manual fallback.

The URL above identifies the current Sites version 11 publication. Its
application behavior is unchanged from the accepted version 10 runtime; any
later source commit or Sites deployment needs its own exact identity and review
record.

## WebMCP surface

The source catalog defines exactly ten names in `src/webmcp/tool-catalog.ts`.
At runtime, a discovery starts with the seven static tools; only contextual
tools applicable to the current section or selected record are registered at
that moment. Selecting or opening the relevant context reveals the remaining
contextual tools. All registrations use `execute` handlers through the browser
adapter in `src/webmcp/browser-model-context-port.ts`.

| Tool                       | Surface    | Role                                          |
| -------------------------- | ---------- | --------------------------------------------- |
| `get_application_progress` | static     | Read completion percentage and section status |
| `navigate_to_section`      | static     | Navigate the visible workspace                |
| `get_next_actions`         | static     | Read the next bounded application actions     |
| `add_household_member`     | static     | Add a synthetic household member              |
| `update_household_member`  | contextual | Update the selected household member          |
| `add_income_source`        | static     | Add a synthetic income source                 |
| `update_income_source`     | contextual | Update the selected income source             |
| `set_current_coverage`     | static     | Set synthetic current-coverage records        |
| `list_uploaded_documents`  | static     | Read demo document metadata and readiness     |
| `review_application`       | contextual | Review the active Review & Sign section       |

The three contextual tools are not hidden alternate commands. Their
availability follows visible state: selecting a household member enables
`update_household_member`, selecting an income source enables
`update_income_source`, and opening Review & Sign enables
`review_application`. The registry manager registers and unregisters those
tools as the context changes.

There is no WebMCP `submit_application` or attestation tool. The visible
**Submit Demo** control is deliberately human-only and fictional.

## Local setup

Use a current Node.js/npm installation compatible with the checked-in
`package-lock.json`.

```bash
npm ci
npm run dev
```

The Vite development server defaults to `http://localhost:5173`. The local
portal does not require WebMCP or Gemini. For browser-agent testing, use a
WebMCP-capable browser as described above.

### Optional local Gemini configuration

`.env.example` documents the current variables. Copy it to a local env file
only when you have separately authorized a local voice audit; keep the
credential blank until that audit is authorized.

```text
GEMINI_API_KEY=
CIVICFLOW_LIVE_AUDIT=0
VITE_CIVICFLOW_LIVE_AUDIT=0
CIVICFLOW_VOICE_ENABLED=0
VITE_CIVICFLOW_VOICE_ENABLED=0
CIVICFLOW_ALLOWED_ORIGINS=http://localhost:5173
CIVICFLOW_LIVE_ORIGIN=http://localhost:5173
```

`GEMINI_API_KEY` is server-only. It must never be placed in a `VITE_*`
variable, committed, copied into documentation, or exposed in the browser
bundle. The local audit and voice gates are off by default. The hosted Worker
uses `CIVICFLOW_VOICE_ENABLED=1` only with a non-empty allowlisted origin; it
does not honor the local audit bypass.

### Build and verification

The package scripts are the source of truth for local gates:

```bash
npm run format:check
npm run lint
npm run scan:secrets
npm run typecheck
npm run test:unit
npm run test:contract
npm run build
npm run test:e2e
npm run verify
```

`npm run build` creates the Vite client and the Worker-compatible server
artifact through `scripts/write-site-worker.mjs`; it does not save or deploy a
Site. `npm run verify` is the aggregate local gate. A clean-install candidate
must also run `git diff --check` and inspect `git status --short --branch`.
Exact Phase 5 candidate results are recorded in
[`docs/release/civicflow-release-evidence.md`](docs/release/civicflow-release-evidence.md).

## Runtime and hosting boundaries

- `src/application/*` owns the local application state and command receipts.
- `src/webmcp/*` owns tool schemas, registration, validation, execution, and
  contextual availability.
- `src/assistant/*` owns the optional Gemini transport, current tool-surface
  mapping, confirmation, and media lifecycle.
- `server/sites-worker.ts` routes `/api/gemini/session` before the SPA asset
  fallback. `server/gemini-*` issues a constrained ephemeral session using a
  server-only credential.
- `.openai/hosting.json` identifies the ChatGPT Sites project used by the
  accepted deployment. Saving or deploying a new version is an owner action,
  not part of this documentation candidate.

The hosted session route returns JSON with `Cache-Control: no-store`, checks
the request origin and method, limits the request body and session rate, and
returns only an ephemeral access token and expiry. The provider credential is
not part of the client contract.

Gemini is optional. The production client gate is explicit and defaults off;
the public Site evidence above records the previously accepted v10 gate. This
package does not make a new live provider call or change hosted settings. If
voice is unavailable, the text/manual WebMCP path remains the demonstrated
fallback.

## Privacy and security

Use synthetic values only. The deterministic seed includes clearly fictional
values such as `maya.carter@example.invalid`, `+1-555-0100`, `100 Demo Avenue`,
and `Demo City`; do not replace them with real applicant information.

The application stores its validated local application state in browser
`localStorage` under `civicflow.application.v1`. Reset restores the synthetic
seed. There is no account, authentication, cross-device state, fingerprinting,
or custom visitor identity. This release adds no transcript store, custom
product-event analytics client, analytics route, or D1 schema. Any Sites
platform visitor/page-view analytics is outside CivicFlow's application data
model and is not a claim about custom analytics.

When optional Gemini is enabled, microphone/text traffic follows the configured
Gemini Live path. Keep the interaction synthetic and review the provider's
current terms separately. CivicFlow's server keeps `GEMINI_API_KEY` out of the
browser; never paste a credential into an issue, screenshot, video, or this
repository.

## Accessibility and manual fallback

The portal uses labelled controls, section headings, keyboard-operable buttons,
status/live regions for operation feedback, and a focused reset confirmation
dialog. The assistant confirmation uses explicit buttons: **Save change**,
**Need correction**, and **Cancel**. The manual form path is always
available when WebMCP or voice is unavailable. The accepted local accessibility,
responsive, reduced-motion, confirmation, and no-submit checks are listed in
the release evidence and prior phase ledgers.

## Limitations and deferred work

This release intentionally does not provide:

- government integration, official program rules, eligibility determination,
  benefits advice, real enrollment, or an external submission;
- real file upload, document bytes, OCR, classification, or document
  transmission;
- authentication, account identity, cross-device synchronization, or a
  remote application database;
- agent submission or attestation tools;
- custom product analytics, D1, a dashboard, or persistent visitor identity;
- a provider fallback or a guarantee of Gemini quota, model availability, or
  unverified provider behavior.

Phase 4C custom analytics/D1 is explicitly deferred. The synthetic document
readiness view mirrors only the demo's internal completeness rule; it is not a
government document requirement or eligibility signal.

## Challenge judging map

The mapping below is an evidence-backed rehearsal guide, not an acceptance
decision.

| Criterion             | CivicFlow evidence to inspect                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebMCP Leverage       | A ten-name typed catalog (seven static plus applicable contextual tools), `document.modelContext.registerTool` through the browser adapter, contextual registration, command/store execution, and visible activity/progress |
| Execution             | Six-section human workflow, deterministic synthetic seed, validation/recovery, local setup/build/test gates, and accepted Sites v10 URL                                                                                     |
| Potential Impact      | A bounded example of people and agents coordinating structured application work without making policy or eligibility claims                                                                                                 |
| Creativity & Ambition | Shared human/agent state plus optional Gemini Live companion and contextual capabilities, with a clear human-only submission boundary                                                                                       |

The official submission description must answer why the use case fits WebMCP,
how the experience improves, what people and agents do together, and how
WebMCP was implemented. A draft is prepared at
[`docs/release/civicflow-devpost-draft.md`](docs/release/civicflow-devpost-draft.md).

## Release and publication status

The application runtime behavior is traceable to source SHA
`0632c5d503a98b9d37e2450f2e9c1f3265698930`, originally accepted as Sites
version 10. The Phase 5 documentation and license package is source SHA
`12360d10be1c6df8ada56bfccbefda2abc81629c`, committed and published as the
documentation-only Sites version 11 at the same public URL.

The owner selected MIT, and the published package includes a standard root
`LICENSE` with the project-level notice. The eligible public-source repository
URL, public YouTube demo URL, and Devpost submission are publication-pending;
the license still needs to be made detectable in that authorized public
repository. Those are external gates and must not be represented as completed
proof.
