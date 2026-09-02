# CivicFlow assistant UI refresh — phase index

- **Feature status:** `validated`
- **Planning baseline:** `main` at `f5ab396c3458d637449229944dc070f339ddde3a`
- **Execution:** Codex self implementation via `gpt-5.6-terra`, `high`; final review via `gpt-5.6-sol`, `high`; no Luna Max correction was required
- **Plan gate:** complete; Phases 1–5 validated

| Phase                    | Document                                                                                                 | Status      | Dependency                 | Exit gate                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ----------- | -------------------------- | --------------------------------------------------- |
| 0 — source sync and plan | this index, MASTER, protocol, handoff                                                                    | `validated` | clean latest `origin/main` | architecture, allowlists, RED/GREEN, route recorded |
| 1 — ownership            | [01-ownership-and-baseline-contracts.md](01-ownership-and-baseline-contracts.md)                         | `validated` | Phase 0                    | one owner/subscription                              |
| 2 — floating shell       | [02-floating-shell-and-responsive-interaction.md](02-floating-shell-and-responsive-interaction.md)       | `validated` | Phase 1 review             | no rail; accessible adaptive surface                |
| 3 — voice/audio          | [03-voice-continuity-and-audio-controls.md](03-voice-continuity-and-audio-controls.md)                   | `validated` | Phase 2 review             | minimized mic and true mute                         |
| 4 — disclosure/guide     | [04-progressive-disclosure-and-onboarding.md](04-progressive-disclosure-and-onboarding.md)               | `validated` | Phase 3 review             | supporting content closed; compact help             |
| 5 — acceptance           | [05-integration-accessibility-and-hackathon-gate.md](05-integration-accessibility-and-hackathon-gate.md) | `validated` | Phases 1–4 implementation  | focused gates plus full verify                      |

```text
Phase 0 plan
  → Phase 1 single ownership
    → Phase 2 floating presentation
      → Phase 3 voice/audio semantics
        → Phase 4 disclosure/onboarding
          → Phase 5 integrated acceptance
```

No phases combined for convenience. User local testing, final Sol review, and
the complete verification suite accepted each phase without a bounded
correction.

## Global preservation gate

- one runtime/controller, application state, and WebMCP mutation surface;
- visible mutation confirmation and human-only submission;
- current provider, broker, bridge, privacy, and media cleanup;
- existing npm/Vite/Sites setup and dependencies;
- no live call/mic, deployment, or unrelated remote mutation; commit and push
  require separate authorization, received from the user on 2026-08-30.

## Phase 0 evidence

- GitHub repo `subhav13/CivicFlow`, default `main`.
- remote tip and local HEAD were both `f5ab396c3458d637449229944dc070f339ddde3a`
  (`fix: close the assistant confirmation loop`).
- `git pull --ff-only` returned `Already up to date.`; pre-plan status was clean.
- source inspection found three-column layout, dual compact panel rendering,
  panel-local experience state, direct controller PCM playback, and expanded
  page onboarding.
- Stitch was not mutated; no CivicFlow Stitch project was established as an
  authoritative source.

## Implementation checkpoint

- The final review inspected the allowlisted source, test, and ledger changes
  against the planning baseline before staging.
- `npm run test:unit` passed 47 files and 473 tests; `npm run test:contract`
  passed 17 files and 153 tests; `npm run test:e2e` passed 35 tests.
- `npm run format:check`, `npm run lint`, `npm run scan:secrets`,
  `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- The only build notes are the repository's existing Vite native-config and
  post-minification chunk-size warnings.
- A focused browser geometry assertion now protects the corrected popover from
  collapsing below 300px or overlapping the launcher.
- The user completed local testing and reported the experience working; final
  Codex review found no P0/P1 issue, so every phase is `validated`.

## Speaking-orb release follow-up — 2026-09-02

- The floating companion orb now shows a provider-audio-driven glowing ring and
  three-bar wave while the agent is speaking; it is hidden at rest and falls
  back to a static cue under reduced motion.
- `npm run verify` passed after the change: 53 unit files/520 tests, 19
  contract files/166 tests, and 36 browser tests, plus secret scan, lint,
  typecheck, format, and build.
- The Sites source history was reconciled without force push. Sites version 14
  deployed merge commit `66467895827d5139bf0725dad49bcd8b5c7105d8` to
  `https://civicflow.codesm.chatgpt.site`. GitHub `main` now carries the same
  tree in connector commit `9520829d1f91d1dc45068597a38561fee8f67f4b`.
