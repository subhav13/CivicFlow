# CivicFlow Devpost description draft

**Submission status: draft only. Do not submit.** The repository and demo
video links below are explicitly publication-pending because no eligible public
source URL or public YouTube upload exists yet. The owner-selected MIT license
is present in the published Sites package, but the Sites-managed repository is
not the eligible public-source destination required by the challenge. This
document is prepared for a later owner-authorized Devpost entry and does not
mutate Devpost.

## Links and release identity

- Live project: <https://civicflow.codesm.chatgpt.site> (documentation-only
  Sites version 11, source SHA `12360d10be1c6df8ada56bfccbefda2abc81629c`,
  environment revision 2; application behavior hosted-tested/user-confirmed
  on the accepted version 10 identity on 2026-08-31 Asia/Kolkata).
- Public code repository: **PUBLICATION PENDING — an eligible public GitHub,
  GitLab, or Bitbucket URL will be added only after the owner authorizes a
  commit and public push; the local candidate contains the owner-selected MIT
  license but has no public repository URL yet.**
- Public demo video: **PUBLICATION PENDING — a public YouTube URL will be added
  only after an owner-authorized upload verifies clear audio and duration under
  three minutes.**

The live URL identifies the documentation-only Sites version 11 publication;
its application behavior is unchanged from the accepted version 10 runtime.

## What did you build?

CivicFlow is a synthetic public-benefits workflow that lets a person and a
browser agent work on the same structured application state. The human can
complete six visible sections—About You, Household, Income, Current Coverage,
Documents, and Review & Sign. A WebMCP-capable browser discovers the seven
static tools first; the source catalog has exactly ten typed names in total, and
the remaining three contextual tools are registered when their current section
or selection applies. The optional Gemini Live companion can use that same
current WebMCP surface with visible button confirmation for mutations.

The demo deliberately stops at a fictional local workflow. The visible
**Submit Demo** action is human-only, writes local demo state, and says that no
network request was made. There is no government integration, eligibility
determination, real enrollment, real upload/OCR, or agent submission.

## Why is this a strong fit for WebMCP?

Structured application workflows are difficult for an agent when it has to
infer labels, sequence, relationships, and which record is currently selected
from a visual page. WebMCP lets CivicFlow expose the exact actions and schemas
that are safe for this synthetic workflow. The agent can ask for progress and
next actions, navigate to a section, add a household member or income source,
set current coverage, inspect demo document readiness, and review blockers.

The tool surface is contextual rather than a second hidden application API:
`update_household_member` appears only with a selected household member,
`update_income_source` only with a selected income source, and
`review_application` only in Review & Sign. The browser adapter registers tools
with `document.modelContext.registerTool` and their `execute` callbacks. This
keeps the agent's capabilities aligned with the visible state.

## How does this improve the experience?

The human keeps control of the workflow and sees every meaningful effect. A
read-only agent query can explain what remains without changing state. A
bounded mutation is schema-validated, dispatched through the same application
commands as the human UI, and reflected in visible activity, operation
progress, selected cards, and revision changes. The Gemini companion's
mutation path pauses at a confirmation card with **Save change**, **Need
correction**, and **Cancel** buttons; spoken text alone is not approval.

This is useful as a design pattern for complex forms: the agent can provide
structured assistance while the person can inspect, correct, or decline each
meaningful action. When WebMCP or the optional assistant is unavailable, the
ordinary labelled form remains usable.

## What can people and agents do together?

Together they can inspect the current synthetic application, ask for the next
bounded action, navigate to the relevant section, add a household member or
income source, set current coverage, inspect attached demo document metadata,
and review blockers. The person can select the record that gives the agent its
context, observe the agent's operation and visible effect, and decide whether
the optional assistant's proposed mutation should be applied. The person still
performs the final fictional local demo action through the visible human
control; no agent can submit or attest it.

## How did you implement WebMCP?

The implementation is split into focused boundaries:

1. `src/webmcp/tool-catalog.ts` owns the exact ten names, TypeBox schemas,
   descriptions, annotations, and static/contextual lists.
2. `src/webmcp/browser-model-context-port.ts` is the browser adapter. It
   feature-detects `document.modelContext`, registers tools with `execute`,
   reads the current tool list, executes a tool, and subscribes to tool-change
   events without crashing unsupported browsers.
3. `src/webmcp/registry-manager.ts` registers the seven static tools and
   refreshes the three contextual tools from the active section/selection.
4. `src/webmcp/tool-handlers.ts` validates inputs, resolves current synthetic
   records, dispatches existing application commands, and serializes bounded
   receipts. `src/webmcp/tool-lifecycle.ts` publishes applying/completed or
   failed operation state.
5. `src/assistant/current-tool-surface.ts` and
   `src/assistant/gemini-tool-bridge.ts` give the optional Gemini companion a
   current snapshot, argument validation, denied-intent filtering, and the
   visible confirmation boundary.

The optional hosted Gemini path is routed through
`/api/gemini/session`. `server/sites-worker.ts` and
`server/gemini-session-core.ts` keep `GEMINI_API_KEY` server-only and return a
short-lived constrained session credential. The client and the Worker use
explicit gates that are off by default. The accepted application behavior is
the version 10 runtime; the documentation candidate was published without
application-source changes as Sites version 11.

## Judging criteria map

### WebMCP Leverage

The project has a non-trivial ten-tool catalog, strict schemas, browser
registration through `document.modelContext`, contextual availability, shared
command/store execution, visible operation feedback, and an explicit no-submit
boundary.

### Execution

The six-section portal, deterministic synthetic seed, validation/recovery,
accessible manual fallback, optional assistant, and local install/build/test
commands form a coherent runnable experience. The accepted hosted URL is
traceable to the source/deployment identity above.

### Potential Impact

CivicFlow demonstrates how people could receive structured help with complex
forms without handing an agent an opaque click script or allowing it to make
unreviewed policy or submission decisions. The impact claim is exploratory;
this prototype does not integrate with a government program.

### Creativity & Ambition

The concept combines contextual WebMCP capabilities, visible shared state, and
an optional Gemini Live companion while preserving a conservative human-only
completion boundary. The synthetic scope makes the interaction safe to
rehearse and inspect.

## Privacy and limitations

Use synthetic data only. The app stores validated application state in browser
`localStorage`; it has no account, authentication, cross-device sync, custom
visitor identity, custom product analytics, or D1 schema. Phase 4C analytics
and D1 are deferred. Document readiness is an internal synthetic completeness
aid, not an official requirement or eligibility signal. Voice is optional and
provider/quota behavior outside the recorded evidence is unverified.

## Evidence and final gates

The claim matrix and exact evidence are maintained in
[`civicflow-release-evidence.md`](civicflow-release-evidence.md). Before any
submission, an independent Sol High reviewer must inspect the actual diff,
rerun the clean-install gates, verify the current official rules, confirm the
owner-selected MIT license is detectable in the public repository, and separately
verify the public YouTube video. The owner must then authorize each commit,
push, upload, and Devpost action. Until those actions occur, the repository,
video, and submission remain publication-pending.
