# Phase 5 — integration, accessibility, and hackathon gate

- **Status:** `validated`
- **Owner:** Codex self integration run (`gpt-5.6-terra`, `high`)
- **Final review:** independent Codex Sol High
- **Depends on:** Phases 1–4 `validated`
- **Produces:** local hackathon-ready evidence; no deployment

## Goal

Prove the feature coherently across desktop/mobile, keyboard/touch/reduced
motion, assistant disabled/error, confirmation, WebMCP preservation, and the
existing Sites build. Close only defects inside prior allowlists.

## Acceptance scenarios

### Layout and first use

1. Wide view shows rail + main and one bottom-right orb.
2. Narrow view has no horizontal scroll/covered primary navigation.
3. Open shows welcome without microphone request.
4. Chat connects without mic and sends through fake session.
5. Voice explicitly starts mic after connection.

### Minimized voice and speaker

1. Start fake mic, minimize, and prove capture remains active.
2. Orb exposes listening text/state and focusable stop.
3. Stop from minimized and prove tracks stop once.
4. Start fake provider audio, mute, and prove scheduled/new audio suppression.
5. Unmute and prove future-only audio; mic never changes.
6. Error/disconnect/dispose/pagehide still clean media.

### Confirmation and preservation

1. Trigger fake mutation confirmation while minimized.
2. Prove global modal visibility, focus, and explicit action.
3. Exercise Confirm, Need correction, Cancel, failure, delivery failure, and
   success focus through existing fakes.
4. Prove no submit/attest tool and no assistant application store/command import.
5. Prove human controls, progress, activity, and recovery remain usable.

### Disclosure and onboarding

1. Activity/tools/help/technical details start closed.
2. New activity updates summary without expanding.
3. Suggestions stage text without sending.
4. Coachmark is compact, dismissible, and not application-persistent.
5. Long content works at 200% zoom and small-height mobile.

## Allowed correction boundary

Tests named by earlier phases; earlier production allowlists only when a new RED
proves a defect; `src/styles.css` for bounded responsive/a11y corrections; this
phase and index evidence. No new feature, dependency, provider/server, WebMCP,
application schema, or release file.

## Required gates

```bash
npm run test:unit -- src/ui/agent-companion/AgentCompanion.test.tsx src/ui/agent-companion/AssistantPanel.test.tsx tests/unit/browser-media.test.ts tests/unit/assistant-controller.test.ts tests/unit/assistant-controller-confirmation.test.ts tests/unit/gemini-live-runtime.test.ts
npm run test:e2e -- tests/e2e/assistant-text-voice.spec.ts tests/e2e/responsive-shell.spec.ts tests/e2e/first-run-guide.spec.ts tests/e2e/adversarial-accessibility.spec.ts tests/e2e/reduced-motion.spec.ts
npm run verify
git diff --check
git status --short --branch
git diff --stat
```

Use accepted renamed equivalents only if recorded by a prior phase. Record
exact commands/counts/output and classify any unrelated failure; never omit it.

## Manual local visual checklist

Use deterministic local/fake mode only, not real mic/provider:

- desktop wide/laptop and mobile portrait/small-height landscape;
- idle/connecting/listening/thinking/speaking/muted/error states;
- popover/sheet scroll, safe areas, overlay order, and confirmation;
- focus order/visibility, Escape, names, status live regions, touch targets;
- 200% zoom, long transcript/tool labels, reduced motion;
- CivicFlow teal/indigo restraint and no persistent clutter.

If separately authorized Stitch references exist, compare only hierarchy/layout
against recorded screen IDs. Source/tests/ledger remain authoritative.

## Acceptance

- every MASTER feature criterion is demonstrated;
- focused and aggregate gates pass without skipped/weakened tests;
- final diff is allowlisted and preserves unrelated/user-owned work;
- final reviewer finds no P0/P1 issue against actual source;
- no live mic/provider, credential, Site/Devpost mutation, deploy, or install
  occurred; commit and push were separately authorized after local acceptance.

## Non-goals and stops

No production/live acceptance, deploy, submission, analytics, global rebrand,
wake words, background audio, or new application/tool capability. Stop on an
aggregate regression, unexplained staged/dirty file, live/external requirement,
or confirmation/submission/privacy/media-cleanup regression.

## Implementation record

- **Attempt:** 2026-08-30, Asia/Kolkata.
- **MODEL:** `gpt-5.6-terra`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** Aggregate verification was available locally and did
  not show rough or critical evidence requiring Terra subagent escalation.
- **ESCALATION CONDITION:** Native Luna Max may be dispatched only for an
  independently reproduced critical regression; no such dispatch occurred.
- **Aggregate evidence:** `npm run test:unit` passed 47 files and 473 tests;
  `npm run test:contract` passed 17 files and 153 tests; `npm run typecheck`,
  `npm run lint`, `npm run format:check`, `npm run scan:secrets`, `npm run
build`, `npm run test:e2e` (35 tests), and `git diff --check` passed.
- **Known non-blocking notes:** Build output retains the existing Vite native
  config and post-minification chunk-size warnings.
- **Regression evidence:** The focused assistant browser suite passed 2 tests,
  including an explicit greater-than-300px desktop surface height and
  above-launcher anchor assertion.
- **Local dev follow-up:** The live preview was served on `127.0.0.1` while
  `.env.local` allowlisted `localhost`, producing the generic connection
  failure before token issuance. Restarting with the matching exact origin
  restored the expected disconnected/choice state without weakening origin
  protection; no provider token was issued during this diagnosis.
- **Review state:** `validated`; the user reported local testing successful,
  final Sol review found no P0/P1 issue, and the complete release suite passed.
