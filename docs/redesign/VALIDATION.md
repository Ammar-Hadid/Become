# Redesign validation

27 October 2026. Results apply to the redesign branch against the captured owner baseline. The checks below distinguish automated behavior from visual inspection and from protected code comparison.

## Build and static checks

| Check                    | Result                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Whole-app TypeScript     | Passed                                                                             |
| Whole-app ESLint         | Passed; generated Storybook output is excluded alongside other build artifacts     |
| Deterministic Vitest run | 80 files passed, 399 tests passed; 17 files / 164 opt-in integration tests skipped |
| Optimized Next.js build  | Passed compilation, TypeScript, page collection and static generation              |
| Storybook build          | Passed; existing large-chunk advisory remains                                      |
| Patch whitespace         | `git diff --check` passed                                                          |

Production build validation uses a syntactically valid HTTPS build-only origin and an external temporary media directory. Neither setting is published. Production's existing public-origin and external-media guards correctly rejected local development defaults on the first attempts; the guards were not weakened.

Browser verification uses the optimized build on localhost:3028 with local development authentication configuration and isolated temporary media. This removes development-server reloads during tests; it is not a deployment or an end-to-end test of public HTTPS infrastructure. Earlier concurrent development runs experienced memory-triggered Next restarts and database transaction-start timeouts. Stable sequential runs supersede those interrupted attempts.

## Focused database checks

- Finance: 25 integration tests passed using disposable users. New coverage checks complete filtered totals across cursor pages, currency and owner isolation, and date exclusion. Calendar-day unit coverage includes Amsterdam's 25-hour autumn DST day.
- Entrepreneurship focus summaries: the new local database regression passed for no sessions, paused focused time, another exploration, and another user. Its explicit Prisma SQL composition fixes an actual runtime failure without changing duration semantics.
- The guarded complete Reviews integration/browser suite was not run against the owner's ordinary local database. Its disposable-database requirement was preserved. A separate disposable-user browser journey validates review reading, reflection save, finalization, source inspection and finale replay.

## Browser journeys

| Group                               | Passing cases | Behavior covered                                                                                                                                                                                       |
| ----------------------------------- | ------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entrepreneurship                    |            10 | Empty and populated workspaces, 55 responsive checks, search/pagination, conversations, guides, provenance, corrections, offers, scoped history, timer completion, Nexo acceptance and frozen editions |
| Engineering                         |             3 | Project/session context, unsaved-change protection, independent evidence history and actions                                                                                                           |
| Content workspace                   |             2 | Focus completion/restart and variant-specific release thumbnails                                                                                                                                       |
| Content document editor             |             4 | Rich writing/navigation, Word import/export, owned images, tables, undo, uncertain saves and two-tab conflict choices                                                                                  |
| Content end-to-end                  |             1 | Idea → variant → focus → three release channels → observed results                                                                                                                                     |
| Finance and Settings                |            10 | Seven financial behavior journeys; personal account/security/dirty-form journey; repeated Nexo configuration saves; populated desktop/phone snapshots and filters                                      |
| Direction                           |             5 | Protected dashboard after navigation, narrow goal library, historical goal conclusion validation, repeat experiment semantics, uncertain lifecycle retry                                               |
| New simple goals and authentication |             4 | Multiple domain assignments through create/edit/refresh, 27 route/width checks, collapsed invalid-field recovery, sign-in desktop/phone layout                                                         |
| Creative/review visual journey      |             1 | Engineering, Content, scripts, session search/clear, review finalization/source focus and finale replay across desktop/phone                                                                           |
| Shared surfaces                     |             2 | Menu/dialog focus return, keyboard navigation, overflow, exact motion durations and approved onboarding entry on desktop and phone                                                                     |

These 42 selected cases passed across coordinated runs and targeted reruns. The final creative/review visual journey passed after the scoped phone and drawer corrections. Tests are run in Chromium; mobile coverage uses constrained viewports rather than claiming testing on physical phones or in every browser engine.

Browser fixture selectors were updated where the captured baseline already used newer dashboard/header/onboarding controls. New goal tests do not restore removed evidence authoring. Historical evidence is seeded through the authenticated command for its legacy integrity test. CSS duration assertions normalize equivalent seconds/milliseconds emitted by production minification without changing the expected durations.

## Visual checks and corrections

Representative empty, populated, list, form, detail, settings and reading screens were inspected at 1440px desktop and 390px phone widths; targeted layout assertions also use 320, 768 and 1024px. Final screenshots are saved under `docs/redesign/screenshots` with disposable records.

Inspection corrected ambient-background overflow, Direction filter width, phone ledger name wrapping, native-select double borders, search-icon spacing, Settings coverage-bar placement, session-history min-content width, source-drawer width/stacked backgrounds, and sign-in desktop composition. Independent review also found and corrected three malformed Content CSS variable references. Invalid optional sections now open for native validation, with a clear/collapse/submit browser regression.

Owner-only Image Direction was code-reviewed and preserves its existing owner authorization. Publishing and paid model/image generation were not exercised. No access rule was bypassed and no AI charge was incurred.

## Protection and recovery evidence

- All **1,572** baseline source/assets files in the original `Become` checkout matched the captured Git blob hashes after implementation. No original source file was missing or changed.
- The redesign diff contains no change under the dashboard, approved Season opening, discovery or living-onboarding implementations, nor their page entry points.
- New visual tokens are scoped to `.workspace`. Shared RecordDialog retains its default legacy trigger and shared RecordForm only adds sound within a workspace. Protected timer/session components were retained.
- A browser check compares dashboard card presentation before and after visiting the redesigned Direction route, guarding against shared CSS leakage.
- Five implementation commits separate the foundation, Finance/Settings, Entrepreneurship, creative/review workspaces, and Direction/authentication. Documentation and screenshots are a separate handoff commit. Compare against `codex/redesign-baseline-20261027` to review only this redesign.

The entire historical E2E catalogue was not run. The selected journeys cover the changed interactions; guarded database suites, unrelated historical design fixtures, real providers, deployment, and physical devices remain outside these claims.
