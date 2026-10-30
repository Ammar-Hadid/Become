# Reviews and Season finale redesign

## Intent

A review should let you find the recorded facts, inspect their sources, and add your own meaning without reading one long unstructured page. The finale should keep the feeling of closing a chapter while making its position, next step, and exits clear. These changes use the same shared glass cards, controls, fields, drawer, spacing, and restrained motion as the new workspaces.

## Routes and journeys

| Surface                                      | What changed                                                                                                                                                                                                        | Journey                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/reviews`                                   | Four period cards make week, month, Season, and year explicit entry points. A separate saved-review panel contains drafts and finalized editions, with shared period filters and older-reading navigation.          | Choose a period or return to a saved reading.                                                                                                    |
| `/reviews/[timeframe]/[startOn]`             | The period identity and actions sit in an elevated glass masthead. A contents rail leads to separate glass chapters. The heading size, body spacing, and numbered chapter hierarchy are calmer.                     | Read the overview → choose a chapter → inspect the facts or keep a moment → write an optional reflection → save or finalize.                     |
| Source inspection                            | Replaced the feature's custom modal/backdrop/focus code with the actual shared Drawer. Kept source definition, qualifications, links, totals, warnings, pagination, fingerprint-change recovery, errors, and retry. | Inspect a metric → read qualifying source records → open a source or close with Escape and return focus to the original control.                 |
| Reflection                                   | Shared textareas and existing shared save/finalize controls appear within the reflection chapter. Optional carry/leave details and record limits remain disclosed.                                                  | Write your interpretation separately from the facts. Save a draft, or preserve the evaluated reading and your words as an edition.               |
| Unavailable review                           | Shared workspace and panel, with clear retry, Home, and Reviews actions.                                                                                                                                            | Retry the unavailable record or continue using the app.                                                                                          |
| `/direction/seasons/[year]/[quarter]/finale` | Four existing passages are composed as shared glass cards. The ritual fills the available width with equal approved page gutters. Exit/finish controls use shared buttons.                                          | What you brought → what filled the days → what changed → what you take with you. Continue, choose a passage, defer, skip, or return from replay. |

Phones stack the reading navigation and content. Finale passages continue to use their existing distinct compositions: the beginning can pair direction with artwork, the days pair time with kept moments, results retain their domain lenses, and the ending presents the user's saved words.

## Preserved behavior

No Review service, query, schema, authorization check, fingerprint calculation, edition writer, or Season transition service was changed. Recorded facts, user judgments, verified quotes, generated material, and unavailable evidence retain their existing distinctions. Saved editions remain immutable; corrections still require the existing explicit amendment flow. Coverage and qualification notes remain accessible.

The finale keeps the existing lease, recovery, idempotent commands, four-passage sequence, focus movement, preview versus preserved-edition labels, replay behavior, and nonblocking defer/skip navigation. Completing the finale does not finalize a written review or conclude goals/experiments. The approved Season opening, character onboarding, and dashboard transition entry were not edited.

## Sound and motion

Saved-review filters and deliberate result-domain changes use the shared `controlConfirmed` cue. Finale passage changes use that same cue after a confirmed command (or immediately in local replay); confirmed completion invokes the existing `seasonMilestone` cue. A Finale-scoped shared sound provider reads the existing user mute preference. There is no sound on passive reading, chart motion, or automatic hydration.

Cards use approved materials. Existing precise passage/navigation motion, source drawer presence, focus handling, and reduced-motion behavior are retained. No motion delays a mutation or exit.

## Validation

- Repository type check passed after both phases.
- ESLint passed for Review UI, finale components, and changed Content dialog consumers.
- Focused Review tests: **2 files / 5 tests passed**; **16 guarded database tests skipped**.
- The existing full Review suite is restricted to a dedicated `become_phase7_*` PostgreSQL database. The available application database is not that fixture database, so its guard was preserved.
- The separate local-only browser matrix **passed** on the stable optimized server. It uses its own disposable signup and owned records and verifies review finalization, source Drawer focus/escape, finale passage navigation/replay, and responsive compositions at 1440px and 390px.
- Final screenshots were inspected for hierarchy, overflow, control spacing, and material consistency. The source drawer uses its own shared glass material without additional nested ambient backgrounds.

No model calls were introduced, so these changes add no AI usage cost. Browser fixtures only create and delete the test's own account and records.

## Screenshots

| Journey          | Desktop                                               | Phone                                               |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Review history   | [Open](screenshots/review-history-desktop.png)        | [Open](screenshots/review-history-phone.png)        |
| Review reading   | [Open](screenshots/review-reading-desktop.png)        | [Open](screenshots/review-reading-phone.png)        |
| Source drawer    | [Open](screenshots/review-sources-desktop.png)        | [Open](screenshots/review-sources-phone.png)        |
| Finale beginning | [Open](screenshots/season-finale-desktop.png)         | [Open](screenshots/season-finale-phone.png)         |
| Finale results   | [Open](screenshots/season-finale-results-desktop.png) | [Open](screenshots/season-finale-results-phone.png) |

The fixture intentionally has no character artwork, so these images also show the honest no-artwork composition. Saved artwork remains supported by the existing artwork component.
