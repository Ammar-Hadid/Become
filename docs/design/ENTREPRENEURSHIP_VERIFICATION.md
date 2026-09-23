# Entrepreneurship verification ledger

Implementation branch: `refactor/entrepreneurship`. Browser checks use disposable accounts and the isolated local `become_entrepreneurship_ux_test` database. Provider responses are mocked or seeded review proposals; no live OpenAI request is part of these checks.

The workspace base below is `/entrepreneurship/explorations/:nicheId`. Direct access never requires a prior stage. Shared typography values remain unchanged.

## Reachable flows

| Flow                                    | Destination                                                                       | States and behavior checked                                                                                              | Evidence                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Exploration creation and navigation     | `/overview`                                                                       | Create, seven direct destinations, responsive shell, legacy query preservation                                           | `e2e/entrepreneurship-journey.spec.ts`                                             |
| Exploration lifecycle                   | Launcher and overview                                                             | Pause, resume, stop, independent scope and historical company evidence                                                   | `shared/services/business.integration.test.ts`; `e2e/explorations.spec.ts`         |
| People, businesses and segments         | `/audience`                                                                       | Search, attach, inspect, full detail, independent archives, duplicate identities                                         | Audience integration; Entrepreneurship and secondary browser suites                |
| Outreach and replies                    | `/outreach`                                                                       | Complete scoped counts, search before pagination, batch idempotency, correction and source identity                      | Synthesis volume integration; business integration; Entrepreneurship browser suite |
| Follow-ups                              | `/outreach?view=follow-ups`                                                       | Explicit due dates and resolution, archived company history, no implicit follow-up from debrief text                     | Business integration; guide lifecycle browser suite                                |
| Conversation inbox and transcript       | `/conversations`                                                                  | 100 conversations, 100-message transcript, latest 50, older excerpt links, independent debrief candidates                | Synthesis integration; large collection browser journey                            |
| Live conversations                      | `/conversations/:id/conduct`                                                      | Free-form start, participant messages, paused/resumable state, pinned guide edition and debrief                          | Conversation integration; guide lifecycle browser suite                            |
| Historical conversation summaries       | `/conversations/:id`                                                              | Kept distinct from recorded message transcripts                                                                          | Conversation query contract and large collection browser journey                   |
| Interview guides                        | `/conversations/guides`                                                           | Prose, optional question blocks, stable question identity, whole-document save/reload, conflicts, prose-only publication | Guide utility tests; synthesis integration; guide and collection browser journeys  |
| Evidence journal                        | `/evidence`                                                                       | 100 observations, text search including child observations, lazy child loading, source/observation distinction           | Audience and synthesis integration; rendered collection journey                    |
| Observation history                     | `/evidence/observations/:id`                                                      | Corrections, withdrawal, attribution, original revision identity and source changes                                      | Business/audience integration; secondary browser suite                             |
| Findings and questions                  | `/so-far-we-know/review`                                                          | Facts, interpretations, decisions, contradictions, hypotheses and questions; explicit source reconciliation              | Snapshot and synthesis integration                                                 |
| Manual publication                      | `/so-far-we-know/history`                                                         | Frozen revisions and independent unpublished state; no provider call                                                     | Snapshot and synthesis integration                                                 |
| Problems and assessments                | `/so-far-we-know/problems/:id`                                                    | Source links, scoped judgments, corrections, archived history and evidence-linked synthesis membership/freshness         | Business/audience and synthesis integration; market-voice browser journey          |
| Offers and audience tests               | `/offers`                                                                         | Search before pagination, older problem-linked offers, specific recipients, separate audience responses                  | Synthesis, business and audience integration; Entrepreneurship browser suite       |
| Offer revisions and receipts            | `/offers/:id`                                                                     | Captured accepted terms, recurring quotes, recipient-specific outcomes, receipt correction/withdrawal                    | Business integration; Finance attribution and secondary browser journeys           |
| Session capture and Finance             | Contextual entry points                                                           | Authoritative session completion, optional capture, one Finance fact with explicit attribution                           | Business integration; Entrepreneurship and secondary browser suites                |
| Global history and legacy detail routes | `/entrepreneurship/history` and existing record paths                             | Retained correction/archive meaning; scoped destinations from exploration context                                        | Route inventory and secondary browser suite                                        |
| Nexo settings                           | `/settings/nexo`                                                                  | Version concurrency, immutable configuration revisions, profile assignment and secret availability                       | Synthesis integration; shared responsive browser suite                             |
| Nexo generation                         | `/so-far-we-know`                                                                 | Explicit request only, idempotency, bounded input, citation allowlist, malformed/refused output, failures and discard    | Adapter/unit and synthesis integration                                             |
| Nexo review and acceptance              | `/so-far-we-know`                                                                 | Editing, acceptance without credentials, source correction freshness, frozen editions, no automatic refresh              | `e2e/nexo-review.spec.ts`; synthesis integration                                   |
| Shared motion and layers                | Shared controls and shell                                                         | Rapid reopen, nested Escape/scroll lock/focus, reduced-motion changes, confirmed record arrival                          | `e2e/motion-system.spec.ts`                                                        |
| Other Become domains                    | Home, Engineering, Finance, Content, Direction, Reviews, sessions, Settings, COTS | Responsive layout, working controls, nested layers and no page errors                                                    | `e2e/shared-motion-regression.spec.ts`                                             |

## Recorded checks

- Full unit suite: 345 passed; 149 database-dependent tests intentionally skip without their explicit integration flags.
- Entrepreneurship and Nexo with integration flags: 69 passed across 12 files.
- 27 distinct Chromium browser journeys passed across the audit batches: 7 existing Entrepreneurship journeys, 2 workspace/large-collection journeys, 2 exploration lifecycle journeys, 2 guide journeys, 6 motion checks, 1 Nexo review, 5 correction/session/receipt journeys, and 2 shared-domain regressions.
- Large fixtures include 300 outreach records, 100 conversations, 100 evidence records, and a 100-message conversation. Older records remain searchable and directly accessible.
- Full ESLint and TypeScript checks passed.
- Viewport matrix: 320, 390, 768, 1024 and 1440px, plus short-screen checks at 1280×600 and 390×600. Navigation scrolls independently while account and timer controls remain accessible; stopped exploration titles retain their space. Browser screenshots are kept under `test-results/` in named audit directories.

The production build passed, including TypeScript and route generation. The build used an isolated temporary copy and production-safe test configuration; it did not deploy the application or alter the running development server.

## Preserved rendered references

These screenshots come from the final local Chromium viewport and large-collection journeys, using disposable fixture data:

- [Overview at 1440px](entrepreneurship/overview-desktop.png)
- [Overview at 390px](entrepreneurship/overview-mobile.png)
- [Conversation with long names and source URLs at 1440px](entrepreneurship/conversation-desktop.png)
- [Free-form guide writing](entrepreneurship/guide-writing.png)
- [Pinned interview guide on mobile](entrepreneurship/guide-conduct-mobile.png)
- [Nexo proposal review](entrepreneurship/nexo-review.png)
- [Short-screen navigation and anchored controls](entrepreneurship/short-desktop-navigation.png)

The viewport matrix and large-collection traces remain in `test-results/final-acceptance/`. Other successful journeys are recorded in `test-results/final-acceptance-completion/`, `test-results/final-lifecycle-verified/`, `test-results/final-verified-shell/` (Nexo review), and `test-results/final-rendered-verification/` (all three final exploration and shared-layout checks passed). The count above uses successful individual journeys rather than treating an interrupted or failed batch as an all-pass run. Test artifacts are not committed as application source; selected rendered references are preserved here.

Browser runs use one worker and frozen application source. Earlier attempts exposed stale test selectors and optional Season-arrival setup races, which were repaired. Long-running development-worker memory exhaustion also interrupted audit attempts; final shared checks use a fresh development server. Provider tests remain mocked and review proposals remain disposable fixture data.
