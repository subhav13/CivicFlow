# First implementation handoff — Phase 0 only

> Despite this historical filename, the requested route for this handoff is a
> native Codex `luna_max` task. This prompt authorizes documentation/source
> closure only. It does not authorize Phase 1, Phase 2, or any production code.

```text
MODEL: gpt-5.6-luna
REASONING: max
ROUTING RATIONALE: Phase 0 reconciles multiple durable ledgers, source identity, partial live evidence, and provider/privacy decisions; a fresh high-rigor native Luna Max documentation owner is the smallest safe route.
ESCALATION CONDITION: Stop and return to the coordinator if the baseline differs materially, an unexplained dirty overlap exists, source evidence contradicts a frozen invariant, a source/configuration/test edit is needed, official-provider facts cannot be stated honestly, or any secret/live/remote action is requested.

You are the Phase 0 documentation owner for CivicFlow's Gemini Live companion.
Work only in:
  /Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow

Do not implement production code. Do not invoke OMP, Antigravity, Gemini as a
worker, Cursor, or another coding agent. Do not access secrets or credentials,
make a Gemini call, use a microphone, mutate GitHub/Sites/Devpost, commit,
push, deploy, save a Site version, create a branch, or run destructive Git
commands. Do not stage files. Do not broaden this task into Phase 1 or Phase 2.

Required baseline audit:

1. Read current repository instructions, if any.
2. Capture:
     git status --short --branch
     git branch --show-current
     git rev-parse HEAD
     git diff --stat
     git diff --cached --stat
3. Confirm the expected baseline is main at
   3fff4b7c75c726b21803a2a3e10fabd8c560cdd8 with no staged changes and only
   the expected documentation-only ledger paths dirty or untracked. If the HEAD
   differs, or any dirty path is outside the documentation allowlist, stop and
   report exact evidence.
4. Read the product brief, approved implementation plan, parent WebMCP
   ledger/active phases, collaboration UX ledger/review, and the actual
   repository package/scripts. Treat sources/ as read-only.

Evidence inputs to reconcile:

- the six-section synthetic CivicFlow product brief;
- existing parent WebMCP state/tool/no-submit/Sites contracts;
- existing collaboration operation/activity/progress/persistence contracts;
- accepted local hackathon evidence (270 unit, 90 contract/integration, 32
  Playwright, build/format/lint/typecheck/secret-scan pass) as historical
  evidence to be rerun later, not as new Phase 0 implementation evidence;
- partial same-tab live observations: Subhav Mathur age 27 spouse/applying,
  Optum $1,000 monthly, No current coverage for Maya/Subhav, human synthetic
  Acme Dental proof, Review & Sign navigation, and the user-reported final
  human step;
- earlier wrong-tab explanation for the apparent no-update/empty-activity
  observation; cross-tab sync remains a hackathon non-goal;
- existing OpenAI Realtime/WebRTC voice plan, which must be preserved as
  superseded history rather than erased;
- current user decision: Gemini Live selected based on reported free-tier
  availability, with candidate model
  gemini-2.5-flash-native-audio-preview-12-2025 subject to official recheck.

Exact documentation allowlist — edit only these paths:

- docs/codex-feature/README.md
- docs/codex-feature/civicflow-gemini-companion-v1/MASTER.md
- docs/codex-feature/civicflow-gemini-companion-v1/UPDATE_PROTOCOL.md
- docs/codex-feature/civicflow-gemini-companion-v1/phases/00-index.md
- docs/codex-feature/civicflow-gemini-companion-v1/phases/01-baseline-and-live-evidence.md
- docs/codex-feature/civicflow-gemini-companion-v1/antigravity-first-implementation.md
- docs/codex-feature/civicflow-webmcp-v1/MASTER.md
- docs/codex-feature/civicflow-webmcp-v1/phases/00-index.md
- docs/codex-feature/civicflow-webmcp-v1/phases/04-integration-and-live-site-tools.md
- docs/codex-feature/civicflow-webmcp-v1/phases/05-optional-voice.md
- docs/codex-feature/civicflow-webmcp-v1/phases/06-polish-release-submission.md
- docs/codex-feature/civicflow-collaboration-ux-v1/MASTER.md
- docs/codex-feature/civicflow-collaboration-ux-v1/phases/00-index.md
- docs/codex-feature/civicflow-collaboration-ux-v1/phases/06-document-readiness-release.md

Inspect the already-created child phase documents 02 through 08 read-only to
confirm that they remain `planned` and contain no implementation authorization.
Do not create, edit, or advance those later phase documents during this
handoff. They require separate phase-specific prompts after Phase 0 review.

Required decisions to record:

- one application state and one mutation surface;
- human UI, ChatGPT Site Tools, and Gemini converge through current WebMCP;
- assistant code never imports application commands or the store;
- voice and text share one Gemini Live session/UI;
- mutation calls require visible confirmation; read/navigation may execute;
- attestation and submission are human-only and never tools/functions;
- Gemini Live replaces OpenAI Realtime for new runtime planning, while the
  OpenAI design remains marked superseded;
- candidate model, free-tier quota, preview status, data-use terms, and exact
  transport must be reverified from current official Google documentation;
- synthetic-only data is mandatory because free-tier content may be used to
  improve Google products;
- no standard API key in browser/build/logs, explicit-click microphone only,
  media cleanup at every terminal state, and no raw media/transcript/args in
  persistence;
- collaboration UX feedback precedes Gemini and reuses the existing surfaces;
- same-tab sanitized activity retention is allowed; cross-tab sync is not;
- voice remains optional and is cut/disabled if local or separately authorized
  live gates fail; undo remains deferred.

Evidence wording rules:

- distinguish facts verified in this task, coordinator-observed facts,
  user-reported facts, inference, and unresolved unknowns;
- do not call partial live observations a complete E1-E8 or Packet 6.4 gate;
- do not claim the candidate model, free tier, transport, or Sites broker is
  currently available without a current official verification;
- preserve exact historical commit/deployment records but identify which
  identity is current and which records are historical.

Quality checks:

  rg -n "T[B]D|T[O]DO|implement [l]ater|f[i]ll in|\.\.\." docs/codex-feature/civicflow-gemini-companion-v1
  rg -n "civicflow-gemini-companion-v1|Gemini Live|OpenAI Realtime|E1–E8|Packet 6\.4" docs/codex-feature/README.md docs/codex-feature/civicflow-webmcp-v1 docs/codex-feature/civicflow-collaboration-ux-v1
  git diff --check
  git status --short --branch
  git diff --stat
  git diff -- docs/codex-feature

Run any existing Markdown/link checker without rewriting unrelated files. Do
not run external calls or mutate the repository beyond the allowlist.

Required handoff back to the coordinator:

- exact baseline and final branch/HEAD/status/diff;
- exact changed documentation files;
- source inventory and evidence classification;
- child and parent ledger status changes;
- checks and exact results;
- unresolved model/transport/hosting/quota decisions;
- confirmation that no code, test, dependency, secret, live Gemini, Site,
  GitHub, Devpost, commit, push, deploy, or staged change occurred;
- explicit statement: "Phase 0 is ready for Codex review; Phase 1 and later
  implementation were not started."

Stop after this report. Wait for independent Codex review and a separate
Phase 1-specific prompt. Do not continue to production implementation.
```

## Handoff status

The prompt above is intentionally narrower than the child phase graph. It was
the only first implementation handoff, and Phase 0 is now independently
validated. Phase 1 must receive a new prompt; this file is not an all-phases
authorization.
