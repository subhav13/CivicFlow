# CivicFlow public demo video storyboard

Historical target duration: **2 minutes 30 seconds**. The finished public video
is <https://youtu.be/OoCD4bAo9EA>, titled
`CivicFlow DEMO: A WebMCP Powered Public Benefit Portal`, with a verified
duration of **2 minutes 19 seconds**. The challenge requires a public YouTube
video shorter than three minutes, with clear audio, showing the functioning
project and how WebMCP is used.

Use synthetic data only. Record clean narration or captions. Do not add
third-party copyrighted music, trademarks/marks, stock footage with unclear
rights, real applicant information, or unsupported product claims. Keep the
browser URL, tool names, visible operation feedback, and human-only boundary
legible on screen.

## Timed cut

| Time            | Narration / audio                                                                                                                                 | On-screen action                                                                                                                                                                                         | Claim/evidence label                                                                                                                                           | Fallback cut                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0:00–0:12 (12s) | “CivicFlow is a synthetic research demo for people and agents working together on a structured application workflow.”                             | Open the current CivicFlow Site and show the six-section portal.                                                                                                                                         | `hosted-tested` / `user-confirmed`: application behavior accepted on Sites v10; current Site carries a documentation-only Phase 5 publication.                 | Use a local build and label it `local-tested`; do not imply it is the hosted version.                      |
| 0:12–0:30 (18s) | “A person can complete the portal manually, while an agent receives explicit tools instead of guessing at the UI.”                                | Move through About You, Household, Income, Coverage, Documents, and Review & Sign; show labelled controls and progress.                                                                                  | `local-tested`: human portal, validation, accessibility, synthetic seed.                                                                                       | Keep the human-only portal journey; omit unsupported-browser claims.                                       |
| 0:30–0:50 (20s) | “WebMCP defines a ten-name catalog: seven static tools are available now, while contextual tools appear when their section or selection applies.” | Ask the WebMCP-capable agent to discover the current tools; show the seven static names and note that the source catalog has three contextual tools on demand, plus the absence of `submit_application`. | `local-tested`: `src/webmcp/tool-catalog.ts` and browser adapter.                                                                                              | Show the source catalog in the repository instead of claiming that all ten appear in one live snapshot.    |
| 0:50–1:10 (20s) | “The agent can read progress and next actions without changing the application.”                                                                  | Call `get_application_progress`, `get_next_actions`, and `list_uploaded_documents`; show read-only results.                                                                                              | `local-tested`: strict read queries, synthetic document readiness, unchanged revision.                                                                         | Show a local/fake WebMCP port and label it; do not call it hosted evidence.                                |
| 1:10–1:32 (22s) | “For a bounded mutation, the structured command produces visible operation feedback and a state change.”                                          | Call `add_household_member` for synthetic Jordan Carter; show applying/progress, Site Tool activity, selected card, and updated revision.                                                                | `local-tested`: command/store/lifecycle and visible effect.                                                                                                    | Use the human form to add Jordan and explain the matching WebMCP path verbally.                            |
| 1:32–1:48 (16s) | “Tools also follow context: selecting a member, income source, or Review & Sign exposes only the relevant update/review tool.”                    | Select a household member, then income, then Review & Sign; show the contextual tool list changing.                                                                                                      | `local-tested`: registry manager contextual registration.                                                                                                      | Use a source/test overlay and say the live transition requires separate deployment evidence.               |
| 1:48–2:08 (20s) | “The optional Gemini companion uses that same current surface. A mutation pauses for a visible button decision, not a spoken approval.”           | On the current Site if the prior gate is available, propose a synthetic update by text or voice; show the confirmation card, then click **Save change**.                                                 | `hosted-tested` / `user-confirmed` for the accepted v10 assistant behavior; current publication is documentation-only; `local-tested` for confirmation policy. | Use the local text/manual WebMCP path; state that voice is optional and not revalidated in this recording. |
| 2:08–2:22 (14s) | “Submit Demo is deliberately human-only and fictional.”                                                                                           | Open Review & Sign, show attestation wording, click the visible **Submit Demo**, and show “No network request was made.”                                                                                 | `local-tested`: ReviewSection and no-submit tests.                                                                                                             | Show the copy and button without clicking if the rehearsal state is not complete.                          |
| 2:22–2:30 (8s)  | “No government integration, eligibility decision, real upload, or agent submission is claimed.”                                                   | Show the reset dialog, then the title card with the live URL, public repository, video link, and limitations.                                                                                            | `deferred`/`unsupported`: explicit scope boundary.                                                                                                             | End on the source/evidence document with the same limitation text.                                         |

Total target: **150 seconds**. Keep the final file below 180 seconds even after
title cards or transitions.

## Recording checklist

- Narration or captions clearly explain what WebMCP contributes; silence or
  music alone is not sufficient.
- The finished video is public at <https://youtu.be/OoCD4bAo9EA> and is 2:19
  long; keep it public and unchanged through the judging period.
- Confirm the runtime and any shown tool calls match one exact source/deployment
  identity. Keep the accepted v10 application behavior distinct from the
  documentation-only Phase 5 publication.
- Keep all names, addresses, employer names, amounts, and document labels
  synthetic. Do not show credentials, `.env` values, or raw provider tokens.
- Do not show third-party logos, marks, copyrighted music, or other material
  without permission.
- Show the confirmation buttons, the human-only Submit Demo wording, and the
  no-network message; do not edit them out for pace.
- If WebMCP, Gemini, microphone, quota, or the hosted URL fails, use the
  documented fallback and label the evidence as local/manual. Never narrate an
  unverified provider result.

The full deterministic rehearsal is in
[`civicflow-demo-script.md`](civicflow-demo-script.md); claim ownership and
publication gates are in
[`../release/civicflow-release-evidence.md`](../release/civicflow-release-evidence.md).
