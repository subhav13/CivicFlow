# CivicFlow visible collaboration UX v1 — master ledger

## Ledger metadata

- **Feature:** CivicFlow visible collaboration, guidance, recovery, and trust UX
- **Version:** v1
- **Status:** `validated` for the selected local hackathon cut
- **Planning owner:** current coordinating Codex task; Phase 1 Packets 1.1–1.3, Phase 2 Packets 2.1–2.3, Phase 3 Packets 3.1–3.3, Phase 5 Packets 5.1–5.3, and local Phase 6 Packets 6.1–6.3 are implemented and independently reaccepted after the 2026-08-28 MSW remediation; companion Phase 4 remains deferred, live Packet 6.4 remains separately authorized, and CR-01/CR-07 remain documented non-blocking limitations for the hackathon cut
- **Planning model record:** GPT-5 Codex family; the exact deployment identifier is not exposed in this task context, so no exact implementer route is asserted
- **Last updated:** 2026-08-28
- **Repository:** `/Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow`
- **Clean pre-planning baseline:** branch `main`, commit `801a165ff8f115d6a4801b1f33d087508104ec04`
- **Parent ledger:** [CivicFlow WebMCP v1](../civicflow-webmcp-v1/MASTER.md)
- **Optional voice companion:** [CivicFlow Gemini Live companion v1](../civicflow-gemini-companion-v1/MASTER.md)
- **Live baseline:** `https://civicflow.codesm.chatgpt.site`

This ledger remains the durable plan and evidence record. The user explicitly
authorizes implementation phase by phase; that authorization does not cover
commits, pushes, Site saves, deploys, publishing, secret access, paid APIs, live
calls, or hosted mutations unless separately requested.

## Purpose

CivicFlow already proves that a normal human form and ChatGPT Site Tools can operate the same synthetic benefits application state. This feature makes that collaboration visible, understandable, recoverable, and reassuring. A person should always be able to answer four questions without opening developer tooling:

1. What is complete and what remains?
2. Is a human or an agent doing something now?
3. What changed, where did it change, and did it succeed?
4. If something failed or was wrong, what is the safest next action?

The target is a complete human-agent product experience rather than a larger form or a larger tool count. The design must preserve the existing one-state architecture, synthetic-only boundary, normal human interface, compact WebMCP results, and human-only submission.

## Current problem and evidence

### Verified strengths

- The portal has the six accepted sections: About You, Household, Income, Current Coverage, Documents, and Review & Sign.
- Human forms, WebMCP handlers, progress selectors, review selectors, local persistence, and the visible UI use the same application store and command boundary.
- Nine P0 Site Tools are live, including static read/navigation/mutation tools and contextual update/review tools.
- The Agent Companion truthfully lists current capabilities and newest-first human/agent activity.
- Submission remains a visible attested human action; no Site Tool exposes submission.
- The full local verification suite passed at the WebMCP compatibility baseline before this planning update.

### Observed gaps

- `ApplicationShell` renders a percentage bar and section completion labels, but the progress header is passive. It does not show completed-count, blocker-count, the next best action, or an operation lifecycle.
- Application commands and Site Tools are normally local and fast. The UI jumps directly from input to a final `Saved` or failure receipt, so the user often cannot tell which card or section changed.
- `ActivityEntry` records only a summary, source, and time. It has no status, section, affected entity, revision transition, recoverable next step, or undo relationship.
- The Agent Companion places useful activity below capability definitions and becomes a bottom-of-page drawer affordance on narrow screens. It does not act as a prominent collaboration status surface.
- The live Emma flow produced a recoverable `PERSON_NOT_FOUND` failure when income was requested before Emma existed. The result correctly avoided mutation, but it did not return a structured recovery step or present a visible “add the person first” action.
- A narrow-screen visual pass showed only the first portion of the six-step rail without a concise `step N of 6` indicator. Later sections were not immediately discoverable.
- “Saved in this browser” does not distinguish a successful save in the current session, restored local data, or a failed persistence write.
- Documents are safe metadata-only presets, but the UI and `list_uploaded_documents` do not explain requirement coverage and remaining gaps as a checklist.
- The existing parent release plan already calls for loading/empty/error states, restrained motion, reduced-motion support, and responsive verification. This ledger converts that broad polish requirement into implementation-ready contracts and packets.

### Primary external evidence

- [OpenAI Site tools guidance](https://learn.chatgpt.com/docs/webmcp) says people and agents work with the same live page and that the agent can inspect what changed. It also recommends narrow inputs, explicit side effects, verifiable results, and preservation of the normal human interface.
- [WebMCP Challenge rules](https://webmcp.devpost.com/rules) evaluate WebMCP leverage, execution, potential impact, and creativity equally. The minimum release cut therefore improves both the tool behavior and the visible human experience.

## Chosen scope

### P0 collaboration release

The minimum accepted enhancement includes:

- truthful operation lifecycle state for human and WebMCP mutations;
- sticky, responsive progress with completed count, blockers, and next action;
- visible affected-section/entity feedback and a bounded success/failure surface;
- structured recoverable tool failures, including the Emma-before-income case;
- one additive read-only `get_next_actions` Site Tool;
- an accessible collaboration timeline with source, status, section, and revision transition;
- narrow-screen access to all six sections, Back/Next controls, and reduced-motion behavior;
- precise current-session save feedback and restored/failed persistence wording.

### P1 recommended release

After P0 is independently accepted, the selected hackathon collaboration path
is now locally validated after the M1/M2 corrections and includes:

- narrow-screen access to all six sections, Back/Next controls, and reduced-motion behavior;
- a dismissible first-run guide with copyable Site Tool example prompts;
- precise current-session save feedback and restored/failed/unavailable persistence wording.

Still outstanding before final release validation:

- human-only undo of the most recent eligible application mutation (Phase 4,
  explicitly deferred);
- live Packet 6.4 exact-deployment Site Tools evidence, if authorized;
- post-action change summaries suitable for the demo video.

### Backlog

- a generic multi-operation plan/apply transaction;
- a page-embedded text agent or model backend;
- multilingual content;
- cross-device accounts or remote persistence;
- real document ingestion, OCR, or classification;
- broad scenario libraries.

### Optional Gemini companion

The user selected Gemini Live for a future embedded text/voice companion based
on reported free-tier availability that fits the hackathon constraint. The companion is owned
by the linked child ledger and is not part of this collaboration ledger's
accepted local implementation. It must consume this ledger's operation,
activity, progress, confirmation, accessibility, and same-state contracts;
voice/text must never create a second mutation surface. The candidate model,
transport, quota/data-use terms, secure session boundary, and live acceptance
remain open until current official Google documentation and the actual hosting
environment are verified. The child ledger's Phase 0 documentation/source
closure, separately authorized Phase 1 feedback/retention polish, and
separately authorized Phase 2 provider-neutral current-tool-surface/function
bridge are validated; later implementation phases require separate prompts.

## Non-goals and safety boundaries

- No eligibility calculation, coverage recommendation, benefit determination, government API, or real submission.
- No real PII, medical records, identity files, file bytes, OCR, document URLs, or network upload.
- No new database, authentication, remote account, analytics, telemetry, or background worker.
- No artificial multi-second loader or fake “AI thinking” stage. Motion reflects actual lifecycle state or brief orientation/change acknowledgement only.
- No hidden browser automation, agent attestation, agent submission, `submit_application`, or WebMCP undo capability.
- No change to the existing nine P0 tool names or their accepted mutation semantics. The only accepted additive tool is read-only `get_next_actions`.
- No general-purpose natural-language execution tool. Inputs stay narrow, closed, typed, and bounded.
- No persisted collaboration/UI history containing synthetic profile fields. Undo snapshots are memory-only and capped.
- Voice remains optional and independent. The selected provider is Gemini Live,
  but this feature does not implement or require the companion; it may consume
  the final WebMCP surface only after the child ledger's security,
  accessibility, and live gates pass.

## Primary use cases

1. **Manual applicant:** Maya completes sections by hand, always sees step count, blockers, save state, and the next section.
2. **Agent-assisted intake:** ChatGPT adds Emma or income, while CivicFlow immediately shows the active operation and highlights the changed record.
3. **Dependency recovery:** An income request for an unknown person returns a structured recovery action that tells the agent and user which details are needed first.
4. **Case review:** ChatGPT reads the next actions, opens a blocker, and the user can inspect why it is blocking without receiving an eligibility claim.
5. **Trust and correction:** The user sees a revision-linked change summary and can undo the newest eligible mutation through a visible human control.
6. **Document preparation:** The user sees which synthetic document requirements are satisfied and which remain, without uploading real content.
7. **Hackathon evaluation:** A judge can understand the human-agent collaboration within seconds, invoke tools, see effects, and complete a coherent <3-minute demonstration.

## Architecture decision

The existing application state and command facade remain authoritative. This feature adds an ephemeral collaboration layer around dispatch and WebMCP execution; it does not create a second application model.

```text
human form action ─────────────┐
                              ├─> OperationCoordinator ─> existing command/store facade
WebMCP tool execute callback ──┘            │                       │
                                           │                       ├─> validated application state
                                           │                       └─> local persistence
                                           ├─> operation status
                                           ├─> recent visible effect
                                           ├─> activity/change summary
                                           └─> bounded memory-only undo entry

pure progress/review selectors ─> next-action selector ─> progress UI + get_next_actions
document metadata ──────────────> requirement selector ─> Documents UI + list_uploaded_documents
```

The coordinator may publish a `validating` state before calling a synchronous command, but it must not add an artificial delay. Success acknowledgement may remain visible for a bounded period after the real operation completes. Failures remain until dismissed or superseded.

## Module boundaries

| Module                                  | Owns                                                                                | Must not own                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/domain/guidance.ts`                | Pure next-action and document-requirement selectors                                 | React, WebMCP, storage, clocks, animation                          |
| `src/application/operation-feedback.ts` | Operation lifecycle types, pure reducer, status transitions, recent-effect metadata | Application mutation semantics, DOM, timeouts                      |
| `src/application/undo.ts`               | Eligibility checks and validated newest-change restoration transition               | Arbitrary history travel, submission reversal, WebMCP registration |
| `src/application/store.ts`              | Coordinator methods, bounded activity/undo state, persistence status                | Tool-specific error wording, component rendering                   |
| `src/webmcp/tool-lifecycle.ts`          | Shared wrapper for tool start/success/failure publication                           | Business transitions, fake delays, global UI mutation              |
| `src/webmcp/recovery.ts`                | Compact mapping from known failures to recovery descriptors                         | Natural-language model calls, hidden automatic repair              |
| `src/webmcp/tool-catalog.ts`            | Additive `get_next_actions` schema and existing catalog                             | UI-only contracts or submission capability                         |
| `src/ui/progress/`                      | Responsive progress, next-action card, Back/Next affordances                        | Domain rule duplication                                            |
| `src/ui/feedback/`                      | Operation strip, change highlight, toast, recovery banner                           | Direct application mutation                                        |
| `src/ui/agent-companion/`               | Visible timeline and capability/activity presentation                               | Alternate activity storage                                         |
| `src/ui/onboarding/`                    | Dismissible first-run orientation and sample prompts                                | Agent invocation, credentials, persistent application data         |
| `src/styles.css`                        | Motion tokens, responsive presentation, reduced-motion overrides                    | State inference                                                    |

`App.tsx` remains orchestration-only. A new component may receive selected view models and callbacks, but business rules do not move into `App.tsx`.

## Concrete contracts

### Operation lifecycle

```ts
type OperationPhase = 'validating' | 'applying' | 'succeeded' | 'failed';

interface ActiveOperation {
  actionId: string;
  source: 'human' | 'webmcp';
  label: string;
  phase: OperationPhase;
  section: SectionId;
  toolName?: CivicFlowToolName;
  startedAt: string;
  completedAt?: string;
  beforeRevision: number;
  afterRevision?: number;
  affectedEntityIds: readonly string[];
  recovery?: RecoveryDescriptor;
}

interface RecentEffect {
  actionId: string;
  section: SectionId;
  entityIds: readonly string[];
  kind: 'created' | 'updated' | 'navigated' | 'undone';
  summary: string;
}
```

Valid transitions are `validating → applying → succeeded`, `validating → failed`, or `applying → failed`. A later operation supersedes a completed success acknowledgement. An active mutation disables only its originating control or affected card, not the whole application. Read-only queries and pure navigation never show a fake mutation spinner.

### Activity entry v2

```ts
interface ActivityEntry {
  id: string;
  summary: string;
  source: 'human' | 'webmcp';
  status: 'succeeded' | 'failed' | 'undone';
  section: SectionId;
  occurredAt: string;
  beforeRevision: number;
  afterRevision: number;
  affectedEntities: readonly ChangedEntitySummary[];
  recovery?: RecoveryDescriptor;
  undoId?: string;
}
```

Activity remains ephemeral, newest-first, and capped at 20. UI text uses compact entity summaries rather than entire application snapshots.

### Recovery descriptor

```ts
interface RecoveryDescriptor {
  section: SectionId;
  message: string;
  suggestedTool?: CivicFlowToolName;
  requiredFields?: readonly string[];
  focusTargetId?: string;
}
```

Initial mappings include:

- `PERSON_NOT_FOUND` during income → Household, `add_household_member`, first name, age, relationship, applying-for-coverage;
- stale household/income selection → the corresponding section and selection instruction;
- missing provider for covered status → Current Coverage and `providerName`;
- missing document proof → Documents and the proof-of-income preset;
- attestation required → Review & Sign and the visible human checkbox;
- application locked → Review & Sign with reset guidance and no automatic action.

### Next action

```ts
interface NextAction {
  id: string;
  priority: 1 | 2 | 3;
  section: SectionId;
  title: string;
  reason: string;
  suggestedTool?: CivicFlowToolName;
  requiredFields?: readonly string[];
}
```

`getNextActions(application)` is pure and deterministic. It returns at most three actions in canonical section order with blockers ahead of optional improvements. It never predicts eligibility or recommends a plan.

### Undo entry

```ts
interface UndoEntry {
  id: string;
  actionId: string;
  label: string;
  previousApplication: ApplicationState;
  afterRevision: number;
  createdAt: string;
}
```

Only the newest entry is undoable. Undo requires the current revision to equal `afterRevision`, the application to remain unsubmitted, and the snapshot to match the same schema/application ID. Restoration copies the previous fields but writes `revision = current.revision + 1`, validates, persists, appends an `undone` activity, clears incompatible selection/highlights, and removes the entry. Submission, reset, navigation, read-only tools, failed commands, and no-ops never create undo entries. Undo is not a Site Tool.

### WebMCP result extension

`ToolFailure.error` gains an optional bounded `recovery` object matching `RecoveryDescriptor` without `focusTargetId`. Existing callers that ignore it remain compatible. Serialization still caps the entire JSON string at 1,500 characters and drops optional detail before required envelope fields.

### Additive Site Tool

`get_next_actions` is static and read-only.

```json
{
  "name": "get_next_actions",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  "annotations": { "readOnlyHint": true }
}
```

Its successful result contains `percent`, `completedCount`, `totalSections`, `blockerCount`, `actions` capped at three, and `stateRevision`. The accepted capability count changes from exact nine to exact ten only after this ledger's Gate C is independently accepted. No existing tool is renamed or removed.

### Progress view model

```ts
interface ProgressViewModel {
  percent: number;
  completedCount: number;
  totalSections: 6;
  blockerCount: number;
  activeSection: SectionId;
  nextAction: NextAction | null;
  saveState: 'saved-this-session' | 'restored' | 'failed';
  savedAt?: string;
}
```

The full header is sticky at desktop/tablet breakpoints. Narrow screens show `Step N of 6`, percent, current label, and an all-sections control that exposes every section. Back and Next remain keyboard-accessible. The page does not infer completion from animation.

## User-visible behavior

### Startup

- Render the existing seed/restored application immediately.
- Run a one-time 160–240 ms staggered reveal of the disclosure, progress summary, navigation, and first panel.
- Do not show a spinner for synchronous local hydration.
- With `prefers-reduced-motion: reduce`, disable translation, scaling, shimmer, and count-up effects while retaining all status text.

### Mutation lifecycle

- On a human or WebMCP mutation, announce the real operation label through an `aria-live="polite"` region and display it near the progress header.
- The relevant button/card uses `aria-busy="true"`; unrelated navigation remains available unless the application is submitted.
- On success, update the progress number, highlight the affected card/section, and retain a dismissible result for approximately four seconds.
- On failure, retain an amber recovery banner until dismissed or replaced. No application revision changes.
- The final tool result and visible UI identify the same action ID and state revision.

### Timeline and trust

- Show the newest operation above the capability catalog.
- Each row exposes source, success/failure/undone state, section, time, and compact change summary.
- A human-only Undo button appears only on the newest eligible successful mutation.
- Capabilities remain dynamically derived; the UI never invents a tool that registration did not accept.

### Onboarding

- First visit shows a non-modal “Try CivicFlow with an agent” card.
- It contains three copyable prompts: add a household member, add income, and review missing items.
- Dismissal is session-only and does not alter application revision or require storage.
- The guide never opens ChatGPT, invokes a tool, or sends information automatically.

## Phase map

| Phase                                         | Document                                                                          | Status      | Entry gate                                | Exit gate                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------- | ----------- | ----------------------------------------- | ------------------------------------------------------- |
| 1 — feedback foundation                       | [01-feedback-foundation.md](phases/01-feedback-foundation.md)                     | `validated` | clean accepted baseline and plan approval | UX Gate A: deterministic lifecycle/store contracts      |
| 2 — visible progress and motion               | [02-visible-progress-and-motion.md](phases/02-visible-progress-and-motion.md)     | `validated` | UX Gate A                                 | UX Gate B: truthful accessible visible feedback         |
| 3 — guidance and recovery                     | [03-guidance-and-recovery.md](phases/03-guidance-and-recovery.md)                 | `validated` | UX Gate B                                 | UX Gate C: tenth read tool and recoverable Emma flow    |
| 4 — change history and undo                   | [04-change-history-and-undo.md](phases/04-change-history-and-undo.md)             | `deferred`  | UX Gate C                                 | UX Gate D: newest eligible change reversible by human   |
| 5 — mobile, onboarding, persistence clarity   | [05-mobile-onboarding-persistence.md](phases/05-mobile-onboarding-persistence.md) | `validated` | UX Gate C; Gate D explicitly cut          | UX Gate E: six-step narrow-screen and first-run clarity |
| 6 — document readiness and release validation | [06-document-readiness-release.md](phases/06-document-readiness-release.md)       | `validated` | UX Gates C and E; Gate D if included      | UX Gate F: selected cut fully verified and live-proven  |

## Release cut lines

- **Minimum credible collaboration release:** Phases 1–3 with CR-02 through CR-04 closed and Gates A–C independently reaccepted. This cut is accepted locally.
- **Recommended hackathon release:** Phases 1–3 plus Phase 5 and accepted local Phase 6 Packets 6.1–6.3 after CR-02 through CR-06 are closed. CR-01 and CR-07 are documented non-blocking hackathon limitations. Phase 4 undo is explicitly deferred; do not claim Gate D or expose undo controls. Packet 6.4 remains separately authorized.
- **Full planned release:** Phases 1–6, subject to the selected undo/live evidence decisions.
- **Voice:** independent decision after the selected collaboration cut. Voice cannot bypass or fork these contracts.

## Dependency and integration sequence

```text
clean baseline
  → lifecycle/reducer/store contracts
  → WebMCP lifecycle wrapper
  → progress + operation surfaces
  → next-action/recovery selectors
  → additive get_next_actions + failure recovery
  → minimum release gate
  → newest-change undo (optional cut)
  → mobile/onboarding/persistence clarity (Gate E accepted after M2)
  → document readiness (local Gate F accepted)
  → MSW remediation M1–M2
  → full local verification and independent reacceptance (complete)
  → separately authorized live Site Tools evidence (Packet 6.4)
  → separately authorized save/deploy/release work
```

One packet has one writer. Shared store/result/catalog changes finish and are independently reviewed before UI packets consume them. Phase 5 begins after Gate C while Phase 4 is intentionally cut, but two writers must not overlap `store.ts`, `App.tsx`, shared CSS, or shared test fixtures.

## Testing strategy and exact gates

Every packet follows RED → GREEN → bounded refactor → focused verification → `npm run typecheck` → independent diff review. No snapshot replacement, skipped test, watch mode, weakened assertion, artificial timer dependency, or `--passWithNoTests` is accepted.

### Required automated evidence

- Pure lifecycle reducer rejects invalid transitions and stale completions.
- Operation UI is truthful for human success, WebMCP success, validation failure, command failure, no-op, navigation, and read-only calls.
- Visible action ID/revision matches the serialized tool result.
- `PERSON_NOT_FOUND` leaves revision unchanged and returns the exact Household recovery descriptor.
- `get_next_actions` is strict, deterministic, read-only, compact, and never contains submit/eligibility language.
- Tool catalog contains the original nine plus exactly one accepted additive tool after Gate C.
- Undo restores only the newest eligible change, increments revision once, persists, rejects stale/submitted/reset histories, and is absent from the tool catalog.
- All six sections are reachable at 375 px, 768 px, and 1440 px with keyboard-only navigation.
- Reduced-motion mode removes nonessential motion without removing status text.
- Persistence feedback distinguishes current-session save, restored data, and save failure.
- Document readiness uses metadata only and renders user-controlled names as text.
- No network request occurs for application mutation or submission.

### Exact commands

Focused commands are specified per phase. Every phase exit also runs:

```bash
npm run format:check
npm run lint
npm run scan:secrets
npm run typecheck
npm run test:unit
npm run test:contract
npm run build
```

Minimum release Gate C and final Gate F additionally run:

```bash
npm run test:e2e
npm run verify
git diff --check
git status --short
```

Live WebMCP evidence is separate from local GREEN. It uses a supported Sol or Terra Site Tools route, the exact deployed version, and the parent ledger's E1–E8 discipline. A public save/deploy occurs only after explicit user authorization.

## 2026-08-28 cross-phase code review and remediation closure

The durable review record is
[Phase 1–6 code review](reviews/2026-08-28-phase-1-6-code-review.md). Before
remediation, the existing repository suite was green (260 unit, 88 contract, 32
Playwright tests), but the independent contract probe failed 7 of 7 assertions
and reproduced:

- post-commit abort reported as failure;
- WebMCP result/recent-effect action-ID divergence;
- missing activity for pre-dispatch recoverable failures;
- updates labeled as creations;
- false saved wording before a write;
- false restored wording after corrupt-state fallback; and
- document compaction dropping attachments before optional requirement detail.

The MSW hackathon disposition admitted the five normal-journey issues in CR-02
through CR-06 and rejected CR-01 and CR-07 as non-blocking for this cut. M1 and
M2 then closed the five admitted issues. The OMP Gemini 3.7 Flash High route and
independent acceptance are recorded in the review's remediation section:
focused 70-test coverage passed, `npm run verify` passed with 270 unit, 90
contract, and 32 Playwright tests, and the probe passed all five admitted
assertions. Gates A, B, C, E, and local F are accepted. Phase 4 remains
deferred, Packet 6.4 remains separately authorized, and no commit, push,
deploy, live call, or hosted mutation occurred.

## Execution and routing model

Packets 1.1 and 1.2 used the user-authorized OMP Antigravity Sonnet route `google-antigravity/claude-sonnet-4-6` at high reasoning. No quota exhaustion or fallback signal was observed. Immediately before each later dispatch, the coordinator must read the repository `AGENTS.md`, the `selecting-codex-models` skill, and the then-current canonical routing policy. The referenced `.agents/workflows/codex-model-selecting.md` file was not present during the planning turn, so a later dispatcher must resolve that absence instead of inventing a route.

Every controller, implementer, fixer, and reviewer dispatch must include:

```text
MODEL: exact available identifier
REASONING: exact supported effort
ROUTING RATIONALE: one sentence tied to observable task risk
ESCALATION CONDITION: one concrete stop condition
```

The implementer does not self-accept. A separate Codex reviewer inspects the actual diff/status and reruns focused gates. Commit, push, deploy, publish, live calls, and secret access remain separate user approvals.

## Risks and mitigations

| Risk                                                            | Mitigation                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Fake “AI working” animation misleads users                      | Drive status only from real handler/store events; forbid artificial delays         |
| Ephemeral feedback accidentally increments application revision | Keep collaboration state in `UiState`; assert revision invariants                  |
| Store becomes a monolith                                        | Put pure lifecycle, guidance, recovery, and undo logic in focused modules          |
| Undo restores an invalid or stale snapshot                      | Newest-only, exact-revision fence, schema/application-ID validation, revision +1   |
| Recovery text causes hidden automatic mutation                  | Recovery is descriptive; follow-up Site Tool invocation remains separate           |
| Tenth tool breaks exact-nine tests or dynamic registry          | Change catalog contract only in Phase 3 and preserve the original nine unchanged   |
| More UI obscures the form                                       | One compact status strip, one next-action card, progressive disclosure for history |
| Mobile motion harms accessibility/performance                   | CSS transforms/opacity only, short duration, reduced-motion gate                   |
| Tool result exceeds 1,500 characters                            | Cap actions at three and compact optional recovery detail first                    |
| Timeline leaks full synthetic profile fields                    | Store compact changed-entity summaries only; snapshots remain memory-only          |
| Deadline pressure destabilizes P0                               | Enforce release cuts; Phases 1–3 are the minimum complete stop                     |

## Assumptions

- CivicFlow remains a local synthetic demo with no account or server-side application state.
- The existing command receipts and changed-entity summaries remain the source for visible effects.
- Current WebMCP supports the existing `execute` adapter and additive static tool registration.
- The user wants collaboration improvements before deciding whether to implement optional voice.
- The existing release and submission ledger remains authoritative for repository license, README, video, and final Devpost work.

## Unresolved decisions

These do not block planning. Resolve them at the stated gate:

1. **Implementation route:** choose exact worker/reviewer models immediately before Phase 1 dispatch.
2. **Review remediation:** completed through the user-authorized OMP Gemini 3.7 Flash High route; M1 closed CR-02–CR-04 and M2 closed CR-05–CR-06. CR-01 and CR-07 remain documented non-blocking hackathon limitations.
3. **Undo inclusion:** explicitly deferred for the current path; cutting undo does not block remediation of the selected release cut.
4. **First-run guide default:** the guide starts expanded for the first session; this behavior was not reopened by the review.
5. **Live deployment:** obtain explicit authorization only after the selected local release cut is reaccepted; Packet 6.4 remains blocked and pending.
6. **Voice:** Gemini Live is selected for the optional companion based on
   reported free-tier availability; include or cut independently after the collaboration
   release is locally reaccepted and the child ledger's model/transport,
   security, accessibility, quota, and live gates pass. The earlier OpenAI
   Realtime design remains historical in the parent WebMCP ledger.

## Full-feature acceptance criteria

The selected collaboration release is accepted only when:

- the chosen release cut has passed every dependency gate;
- the original nine tools still pass their prior contracts and the additive tool, if included, is independently accepted;
- every application change is visible, attributable, revision-linked, and accessible;
- recoverable failures tell the user and agent the next safe step without mutating state;
- progress identifies completed count, blockers, and next action at desktop and narrow widths;
- no agent submission, eligibility claim, real-data path, fake loader, hidden repair, or network application mutation exists;
- the aggregate local verification passes from the exact intended source state;
- any live claim is tied to a separately authorized, exact deployment and dated evidence;
- the parent release ledger is updated with the selected collaboration cut before final submission packaging.

## Update routing

Use [UPDATE_PROTOCOL.md](UPDATE_PROTOCOL.md). Cross-feature decisions also update the parent ledger. Packet evidence belongs only in the active phase document. A worker handoff is a claim; only recorded diff, tests, and independent review move a phase status.

## Implementation handoff

Before implementation begins, the coordinator must convert the selected first packet into a dispatch containing:

- exact baseline commit and dirty-state inventory;
- exact model/reasoning/rationale/escalation record;
- the packet's allowed production and test files;
- the required failing test and expected RED observation;
- focused GREEN commands and aggregate gate;
- explicit no-commit/no-push/no-deploy/no-live-call/no-secret boundaries unless separately authorized;
- a final handoff containing actual changed files, RED/GREEN output, status/diff, risks, and unresolved findings.

The first implementation owner reads this master, the update protocol, the phase index, and `phases/01-feedback-foundation.md`. It must not implement UI motion, guidance, undo, documents, voice, or release work while Phase 1 is active.
