# CivicFlow Devpost submission draft

**Submission status: ready to paste; not submitted by this document.** The live
project, public source repository, MIT license, and public YouTube video are in
place. The owner must still review the fields below, fill the account-specific
items, save the Devpost form, and confirm that **My Projects** shows
**Submitted**, not draft.

## Links and release identity

- Live project: <https://civicflow.codesm.chatgpt.site/>
- Public code repository: <https://github.com/subhav13/CivicFlow>
- Public demo video: <https://youtu.be/OoCD4bAo9EA>
- Video title: `CivicFlow DEMO: A WebMCP Powered Public Benefit Portal`
- Video duration: `2:19`
- License: [MIT](../../LICENSE)

## Copy-ready form fields

- **Project name:** `CivicFlow: A WebMPC Public Benefit Portal`
- **Tagline:** `A shared public-benefits workflow where people and browser agents collaborate safely through WebMCP.`
- **Built with:** `WebMCP`, `TypeScript`, `React`, `Vite`, `Gemini Live API`,
  `ChatGPT Sites`, `Node.js`, `TypeBox`, `Vitest`, `Playwright`
- **Try it out:** `https://civicflow.codesm.chatgpt.site/`
- **Code repository:** `https://github.com/subhav13/CivicFlow`
- **Video:** `https://youtu.be/OoCD4bAo9EA`
- **License:** `MIT`
- **Submitter type:** `Individual` — confirm this matches your entry.
- **Country:** select your actual country in the form.
- **Developer account ID:** paste the account ID requested by the form.
- **Teammates:** add only people who actually contributed; otherwise leave
  empty.

Use the cover image at `docs/assets/civicflow-cover.jpg` as the gallery hero or
thumbnail candidate. It is a promotional overview, not a literal screenshot.

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
short-lived constrained session credential. The production client exposes the
companion only when the hosted feature is enabled, and the application remains
usable without voice.

## Challenges we ran into

The hardest part was not creating more tools; it was creating the right
boundary between assistance and control. The browser, manual form, and voice
companion all had to use one application state without giving the agent a
hidden path around validation or human review. Contextual tools also had to
appear and disappear as the visible selection changed, and the hosted voice
credential had to remain server-side.

We also had to make agent work legible. A successful tool call is not enough if
the person cannot see what changed. That led to the floating companion,
speaking cue, expandable tool list, operation status, and activity history.

## Accomplishments that we're proud of

- A browser agent can discover typed actions and operate the same six-section
  workflow as the person using the form.
- Seven static tools and three contextual tools keep the exposed capability
  surface focused on the current task.
- Voice and chat use the same WebMCP bridge, with visible button-only approval
  before companion mutations.
- The human-only **Submit Demo** boundary is explicit and tested; there is no
  agent submit or attestation tool.
- The project has a live judge path, public source, reproducible verification,
  a root MIT license, and a public 2:19 demo.

## What we learned

WebMCP is most useful when it is treated as part of the product contract, not
as an automation shortcut. Tool schemas, contextual availability, visible
receipts, and conservative confirmation rules make an agent easier to trust
because the person can understand and reverse course. We also learned that a
manual fallback matters: the page should remain a good form even when no agent
or voice provider is available.

## What's next

The next step would be usability testing with people who regularly navigate
complex public-service forms, followed by stronger accessibility evaluation
and reusable patterns for evidence, correction, and consent. Real government
program rules, identity, uploads, eligibility, and submission would require a
separate security, privacy, policy, and integration effort; they are not part
of this prototype.

## What changed during the hackathon?

During the challenge period, CivicFlow became a WebMCP-native shared workflow.
We added the typed ten-tool catalog, contextual registration, one command/state
path for people and agents, visible operation and activity evidence, the
Gemini voice/text companion, explicit mutation confirmation, the floating
speaking indicator, hosted session hardening, accessibility checks, and the
public release package. The Git history and phase ledgers document that work.

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

## Judge walkthrough

1. Open <https://civicflow.codesm.chatgpt.site/> in ChatGPT's in-app browser or
   Chrome 149+ with WebMCP testing enabled.
2. Open the floating **Agent Companion** and expand **Activity & tools** to see
   the current seven static capabilities.
3. Ask, “What is left in this application?” by voice or chat.
4. Ask for one bounded change, review the proposal, and click **Save change**.
5. Confirm that the visible form state and activity entry update together.
6. Continue manually to see that the portal works without an agent. The final
   **Submit Demo** action remains local, fictional, and human-only.

## Media checklist

- **Thumbnail/gallery hero:** `docs/assets/civicflow-cover.jpg` — promotional
  overview; crop to Devpost's preferred 3:2 ratio if the form preview needs it.
- **Product screenshot 1:** portal with **Agent Companion** open.
- **Product screenshot 2:** **Activity & tools** expanded so judges can see the
  current capability list.
- **Product screenshot 3:** a populated activity row after a confirmed human or
  agent action.
- **Video:** <https://youtu.be/OoCD4bAo9EA> — public and 2:19 long.

Use literal product screenshots for evidence and the supplied cover only as a
promotional visual. Do not add real applicant data, API keys, copyrighted
music, or third-party marks you do not have permission to use.

## Final submission checklist

- [x] Live project URL is publicly reachable.
- [x] GitHub repository is public and contains the root MIT license.
- [x] Public YouTube demo is 2:19, below the three-minute limit.
- [x] Project story answers WebMCP fit, UX improvement, people/agent
      collaboration, and implementation.
- [x] Source, assets, and local setup instructions are present.
- [ ] Add the final gallery images in Devpost.
- [ ] Fill country, developer account ID, and any teammate fields.
- [ ] Review for accuracy, save, and submit before the deadline.
- [ ] Confirm **My Projects** shows **Submitted**, not draft.
- [ ] Do not edit the submission, repository, video, or live Site after the
      deadline through the judging period unless organizers instruct otherwise.

The claim matrix and exact technical evidence remain in
[`civicflow-release-evidence.md`](civicflow-release-evidence.md). The Devpost
form mutation is intentionally left to the owner.
