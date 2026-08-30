# Luna Max review handoff — CivicFlow assistant UI refresh v1

> The filename preserves the repository's canonical ledger shape. This is not
> an Antigravity handoff. Use only the native Codex custom agent `luna_max` if a
> bounded independent review or critical correction is requested.

```text
MODEL: gpt-5.6-luna
REASONING: max
ROUTING RATIONALE: Luna Max is reserved for an independently reproduced rough or critical issue in the already implemented assistant ownership, voice/audio, floating shell, or disclosure work.
ESCALATION CONDITION: Do not edit unless the actual worktree and HEAD match the recorded baseline, the relevant RED test is reproduced, and the issue cannot be closed by a smaller safe correction; stop for any provider, WebMCP, confirmation, submission, persistence, dependency, live-call, deployment, commit, or push change.

Repository:
  /Users/SubhavMathur/Desktop/Subhav Main/AI Projects/CivicFlow

Codex has completed the bounded Phases 1–4 implementation in the current
worktree. Do not reimplement the plan or start a parallel writer. Inspect the
actual diff first, then review one phase at a time against its ledger document.
No Luna Max dispatch occurred during the Codex implementation because no rough
or critical blocker was observed.

Read repository instructions; this ledger's MASTER, UPDATE_PROTOCOL, index, and
Phase 1; the parent Gemini companion MASTER/UI/runtime phases; and the current
App, ApplicationShell, AgentCompanion, AssistantPanel, controller/runtime/media,
and named tests.

Recorded baseline:
- branch: main
- HEAD: f5ab396c3458d637449229944dc070f339ddde3a
- origin/main was current; git pull --ff-only returned Already up to date.
- the worktree is intentionally dirty with the source, test, and ledger paths
  listed by the coordinator; no files are staged.

Review objective:
- verify one mounted assistant panel and one controller subscription;
- verify the floating orb and adaptive popover/sheet preserve focus and page
  usability;
- verify explicit chat/voice entry, minimized microphone stop, and true speaker
  mute without changing microphone or transport state;
- verify closed Activity & tools, nested help/technical details, coachmark, and
  staged empty-chat suggestions;
- preserve confirmation, delivery failure, activity, WebMCP, submission, and
  terminal cleanup contracts.

Review allowlist:
- src/assistant/assistant-controller.ts
- src/assistant/browser-media.ts
- src/ui/agent-companion/AgentCompanion.tsx
- src/ui/agent-companion/AgentCompanion.test.tsx
- src/ui/agent-companion/AssistantComposer.tsx
- src/ui/agent-companion/AssistantPanel.tsx
- src/ui/agent-companion/AssistantPanel.test.tsx
- src/ui/agent-companion/VoiceControls.tsx
- src/ui/layout/ApplicationShell.tsx
- src/ui/layout/ApplicationShell.test.tsx
- src/styles.css
- the focused integration/E2E tests and this ledger's evidence sections

Do not touch application commands/store, provider protocol, Gemini session
server, WebMCP schemas/tools, confirmation policy, persistence policy, Sites
configuration, dependencies, credentials, or generated deployment output.
Do not use a real microphone, make a live provider call, deploy, save a Site,
branch, stage, commit, push, or mutate GitHub.

Required evidence:
1. Reproduce the relevant RED assertion if a defect is claimed.
2. Run focused GREEN tests and inspect the exact diff/status independently.
3. Run the declared aggregate gates unless a bounded correction narrows proof.
4. Record MODEL, REASONING, routing rationale, escalation condition, exact
   commands/results, changed paths, and unresolved risks in the active phase.

Constraints: App retains runtime lifetime; visibility owns no lifecycle; prefer
a local hook/provider over Zustand/persistence; preserve message assembly,
failure deduplication, confirmation delivery/revision/cancel, focus-after-
success, and speech cleanup; add no mutation surface or direct store import.

Commands:
  npm run test:unit -- src/ui/agent-companion/AgentCompanion.test.tsx src/ui/agent-companion/AssistantPanel.test.tsx tests/unit/browser-media.test.ts tests/unit/assistant-controller.test.ts
  npm run test:contract
  npm run typecheck
  npm run lint
  npm run format:check
  npm run scan:secrets
  npm run build
  npm run test:e2e
  git diff --check
  git status --short --branch
  git diff --stat

Return a review disposition, not a claim of completion. Mark a phase
`validated` only after independent review accepts the actual source, tests,
and diff. If no correction is needed, report that the phase is ready for
validation and stop; do not self-approve the feature.
```
