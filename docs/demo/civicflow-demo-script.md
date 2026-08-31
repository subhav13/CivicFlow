# CivicFlow judge rehearsal script

This is a deterministic rehearsal for the accepted synthetic CivicFlow demo.
It is written for a judge with WebMCP enabled and a human alongside the
agent. Use the exact hosted identity in the release evidence; do not enter
real applicant data. The rehearsal is longer than the public video cut so a
judge can inspect each boundary.

## Preflight

1. Open <https://civicflow.codesm.chatgpt.site> in ChatGPT's in-app browser,
   or use Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
2. Confirm the page is anonymous and the CivicFlow portal is visible. The
   current hosted identity is source commit
   `12360d10be1c6df8ada56bfccbefda2abc81629c`, Sites version `11`, environment
   revision `2`; it is a documentation-only publication of the application
   behavior accepted on version `10`.
3. Start from the deterministic Maya Carter seed. If the prior rehearsal
   left local state behind, use Review & Sign → **Reset demo** → **Confirm
   reset**. Never use real names, addresses, income, or documents.
4. Keep the browser's agent activity panel and CivicFlow's visible activity
   feedback in view. The UI, not an agent transcript, is the source of truth
   for visible effects.

## Rehearsal checkpoints

### 1. Human portal and accessibility fallback

Narrate: “CivicFlow is a fictional synthetic research workflow. The person
can use the portal normally, with no WebMCP or voice requirement.”

- Visit the six sections in order: About You, Household, Income, Current
  Coverage, Documents, and Review & Sign.
- Point out labels, headings, keyboard-operable controls, live status feedback,
  and the local-only framing in Review & Sign.
- For a no-WebMCP fallback, open the same app in an ordinary browser or
  disable WebMCP. The form remains usable; the Site Tools capability view can
  be empty.

Evidence state: `local-tested` for the UI and accessibility behavior;
`hosted-tested` for the accepted URL only. See EV-01 and EV-02 in the release
evidence.

### 2. Discover the bounded WebMCP surface

Narrate: “Instead of guessing click paths, an agent receives typed tools with
explicit schemas and execution callbacks.”

- Ask the WebMCP-capable agent to list the currently available CivicFlow
  tools. A fresh discovery should show the seven static tools:
  `get_application_progress`, `navigate_to_section`, `get_next_actions`,
  `add_household_member`, `add_income_source`, `set_current_coverage`, and
  `list_uploaded_documents`.
- Explain that the source catalog contains exactly ten names in total. The
  three contextual tools are registered only when their current section or
  selection applies; selecting/opening that context reveals them. Do not
  expect all ten to appear in one discovery snapshot. Confirm the full catalog
  names are:
  `get_application_progress`, `navigate_to_section`, `get_next_actions`,
  `add_household_member`, `update_household_member`, `add_income_source`,
  `update_income_source`, `set_current_coverage`,
  `list_uploaded_documents`, and `review_application`.
- There is no `submit_application` or attestation tool.

Evidence state: `local-tested`, owned by
`src/webmcp/tool-catalog.ts` and the browser adapter
`src/webmcp/browser-model-context-port.ts`. A live browser's discovery should
be recorded separately before being presented as hosted evidence.

### 3. Read-only query

Narrate: “The agent can read the current bounded state without changing it.”

- Call `get_application_progress` with `{}`.
- Call `get_next_actions` with `{}`.
- Call `list_uploaded_documents` with `{}` and point out that document names
  are untrusted text and the result reports synthetic readiness only.
- Confirm the application revision and visible activity do not claim a
  mutation for these queries.

Evidence state: `local-tested`; no eligibility or government conclusion is
derived from progress, guidance, or document readiness.

### 4. Visible agent mutation and operation feedback

Narrate: “A structured mutation becomes a visible application change, not an
opaque chat side effect.”

- Ask the agent to add the synthetic household member:

  ```json
  {
    "firstName": "Jordan",
    "lastName": "Carter",
    "ageYears": 8,
    "relationship": "child",
    "applyingForCoverage": true
  }
  ```

- Before the call completes, point to the visible applying/progress state and
  the Site Tool activity entry.
- Confirm the member card is selected/revealed and the application revision
  advances only after a successful command receipt.
- If the agent provides an unknown person for `add_income_source`, show the
  structured failure and recovery prompt; do not let it guess a name or mutate
  state.
- Add a synthetic income source only after resolving the owner explicitly:

  ```json
  {
    "ownerName": "Maya Carter",
    "employerName": "Acme Dental",
    "amount": 2400,
    "frequency": "monthly"
  }
  ```

Evidence state: `local-tested` for command, validation, lifecycle, recovery,
and visible effect. The values are synthetic and only illustrate the schema.

### 5. Button-only confirmation in the Gemini companion

Narrate: “The optional Gemini companion uses the same current WebMCP surface;
it cannot turn a spoken phrase into silent approval.”

- On the accepted v10 Site, open the assistant if the previously accepted
  public gate is available. The prior evidence records a successful public
  assistant check; Phase 5 does not make a new provider call.
- Use text or voice to propose a bounded mutation, such as updating the
  selected household member. Let the assistant summarize the complete draft.
- Wait for the visible confirmation card. Use **Save change** to execute,
  **Need correction** to revise, or **Cancel** to decline. Do not say that a
  spoken “yes” alone applies the action.
- Point out that the assistant has no Submit Demo or attestation capability.

Evidence state: `user-confirmed`/`hosted-tested` for the previously accepted
public assistant state; `local-tested` for the confirmation policy and
controller tests. If the endpoint, quota, browser, or microphone is
unavailable, skip voice, use text/manual WebMCP, and label the fallback rather
than claiming provider behavior.

### 6. Contextual tool changes

Narrate: “The tool surface follows the visible context, so update tools are
available only when their target is selected.”

- Select Jordan's household card. Observe `update_household_member` appear.
- Select the income card. Observe `update_income_source` appear instead.
- Open Review & Sign. Observe `review_application` appear.
- Return to another section and clear the selection. Confirm the contextual
  tools are unregistered while the static set remains.
- Do not use a stale contextual tool; the bridge rechecks the current surface
  before execution.

Evidence state: `local-tested`, owned by
`src/webmcp/registry-manager.ts`, current-surface tests, and assistant surface
tests. The contextual transition itself must be live-tested against the exact
deployment before being called hosted evidence.

### 7. Human-only local completion and reset

Narrate: “Submission is intentionally outside WebMCP. This button completes a
fictional local demo only.”

- Navigate to Review & Sign and show the synthetic attestation copy.
- Resolve any visible blocking issues in the human UI, then tick the
  attestation checkbox.
- Click the visible **Submit Demo** button. Point to the message:
  “Synthetic demo submitted locally. No network request was made.”
- Explain that the submitted demo is locked until the human selects **Reset
  demo** and then **Confirm reset**. Confirm the Maya Carter seed returns.

Evidence state: `local-tested`; `src/ui/sections/ReviewSection.tsx` and
application command tests own this boundary. It is not a real submission,
government enrollment, attestation service, upload, or network request.

## Fallback and stop rules

- If WebMCP is unavailable, continue with the manual six-section portal and
  label Site Tools as unavailable.
- If Gemini is disabled, unavailable, over quota, or fails its origin/session
  gate, continue with text/manual WebMCP and do not infer provider success.
- If a mutation fails, show its structured error and recovery. Never claim a
  change that the receipt and visible revision do not support.
- Do not type real applicant information, expose a credential, capture raw
  provider transcripts in evidence, or present the local Submit Demo as an
  official action.
- Do not add claims about eligibility, government integration, real upload/OCR,
  authentication, cross-device state, custom analytics/D1, or agent
  submission.

For the 2:30 public video cut, use the timed storyboard in
[`civicflow-video-storyboard.md`](civicflow-video-storyboard.md). For exact
claim ownership and current publication blockers, use
[`../release/civicflow-release-evidence.md`](../release/civicflow-release-evidence.md).
