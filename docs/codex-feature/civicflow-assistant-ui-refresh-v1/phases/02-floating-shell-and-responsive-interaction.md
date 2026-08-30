# Phase 2 — floating shell and responsive interaction

- **Status:** `validated`
- **Owner:** Codex self implementation (`gpt-5.6-terra`, `high`)
- **Review:** independent Codex Sol High
- **Depends on:** Phase 1 `validated`
- **Produces:** application-first layout and one adaptive assistant surface

## Goal and design

Remove the permanent rail and replace it with a CivicFlow orb opening one
desktop popover/mobile sheet. Keep the Phase 1 experience mounted.

- Change wide `.workspace-grid` to section rail + main.
- Place launcher outside column calculation but inside the page lifecycle.
- Use one semantic component instance; CSS adapts it across widths.
- Desktop is non-modal so application remains operable. Mobile may use a
  backdrop, but confirmation remains the only blocking mutation surface.
- Use native CSS and small inline SVG/CSS only; no icon/component dependency.

## Likely files

- `src/ui/layout/ApplicationShell.tsx`
- `src/ui/agent-companion/AgentCompanion.tsx`
- `src/ui/agent-companion/AssistantPanel.tsx`
- focused launcher/surface components under `src/ui/agent-companion/`
- `src/styles.css`

## Packets

### 2.1 — grid and launcher

- RED: wide viewport has two workspace columns and no companion aside.
- Add one 56–64px bottom-right launcher with name, focus, expanded, controls,
  and textual state.
- Prove footer/navigation is not covered.

### 2.2 — adaptive surface

- RED: opening renders exactly one assistant surface.
- Desktop target 400px, constrained height/internal scroll.
- Mobile full-width safe-area sheet, maximum 88dvh, no horizontal overflow.
- Close and `Escape` minimize without resetting experience.

### 2.3 — focus, confirmation, and state

- ordinary close focus returns to orb; success focus stays on application;
- pending confirmation cannot be closed away or buried;
- map truthful states to text and restrained visuals;
- reduced motion removes continuous animation.

## RED/GREEN commands

```bash
npm run test:unit -- src/ui/agent-companion/AgentCompanion.test.tsx src/ui/agent-companion/AssistantPanel.test.tsx
npm run test:e2e -- tests/e2e/responsive-shell.spec.ts tests/e2e/assistant-text-voice.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/adversarial-accessibility.spec.ts
npm run typecheck
npm run build
git diff --check
```

Add RED for unique surface, semantics, focus, responsive geometry, and no
horizontal scroll with deterministic viewports.

## Acceptance

- no permanent right rail/hidden duplicate;
- one launcher and one surface at all widths;
- released application width and reachable navigation;
- 44px touch targets, keyboard focus, close/Escape, and reduced motion pass;
- global confirmation priority remains intact;
- no dependency, provider/tool/persistence, or external change.

## Non-goals and stops

No true mute, minimized mic semantic change, final guide/activity content,
Stitch import, global restyle, or deploy. Stop if overlay/inert/focus cannot
preserve confirmation or the orb covers primary controls at supported sizes.

## Implementation record

- **Attempt:** 2026-08-30, Asia/Kolkata.
- **MODEL:** `gpt-5.6-terra`.
- **REASONING:** `high`.
- **ROUTING RATIONALE:** The launcher and responsive shell were deterministic
  CSS/React changes covered by existing unit and browser tests.
- **ESCALATION CONDITION:** Escalate to native Luna Max only for a rough or
  critical focus, overlay, or responsive regression that survives a bounded
  local correction.
- **RED:** Launcher semantics and two-column workspace assertions failed before
  the shell change; the existing browser test also expected an always-visible
  panel.
- **GREEN:** `ApplicationShell` now renders the assistant outside the workspace
  grid; one 60px-class orb opens a desktop popover or mobile bottom sheet with
  focus/Escape behavior and no horizontal overflow.
- **Follow-up visual correction:** Browser inspection reproduced a 42px used
  height caused by the inherited sticky `top` constraint on the absolute
  surface. Adding `top: auto` and `height: fit-content` restored the full
  400px popover; live metrics measured 655px content-fit height with 653px
  scroll content anchored above the launcher.
- **Focused evidence:** Responsive shell, assistant surface, reduced-motion,
  and accessibility browser tests passed; full E2E passed 35 tests after the
  correction.
- **Regression evidence:** The focused browser suite now asserts the desktop
  surface exceeds 300px height and remains above the launcher; 2 tests passed.
- **Review state:** `validated`; final Sol review accepted responsive geometry,
  semantics, focus, and application-first layout.
