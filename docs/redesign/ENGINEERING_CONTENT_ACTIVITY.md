# Engineering, Content, and activity redesign

27 October 2026. Implemented on `codex/whole-app-redesign` against the preserved working-tree baseline. This is the domain implementation record; final whole-app verification is recorded by the lead in `CHANGELOG_AND_JOURNEYS.md`.

## What changed and why

The previous Engineering pages put most information into one long stack of sections. Content used broad, unframed writing areas, while activity history was a bare list. These pages now give each task a clear place: a focal summary, quiet supporting facts, a glass work panel, or a divided record list. Shared workspace components, cards, fields, selects, and buttons own the treatment. Domain CSS owns layout only. No new AI requests were introduced. Content’s explicit command saves use Soft Ascent after a confirmed response and Red Offset for a confirmed rejection. Uncertain delivery and background autosave stay silent.

### Engineering

| Route                             | New experience                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/engineering`                    | Focused time is the focal card. The time window sits beside it; active days, evidence, and open projects are visible separately. Rhythm, current projects, recent evidence, and context/activity breakdowns form a compact two-column workspace. Detailed project, technology, context-count, and evidence-type analytics remain under **Explore the details**. |
| `/engineering/projects`           | Persistent Engineering navigation, status filter, clear New project action, and a divided project list inside a shared glass panel.                                                                                                                                                                                                                             |
| `/engineering/projects/new`       | **What are you building?** asks for name, context, status and optional description. A separate tools panel preserves the searchable/custom technology picker. **Links, dates & notes** reveals optional detail.                                                                                                                                                 |
| `/engineering/projects/[id]/edit` | Same grouped form; saved optional details start expanded. Existing values and unsaved-change protection are preserved.                                                                                                                                                                                                                                          |
| `/engineering/projects/[id]`      | Back link and edit/archive/restore actions, a compact facts panel, tools/resources/notes, evidence and session panels.                                                                                                                                                                                                                                          |
| `/engineering/evidence`           | Clear page hierarchy, Add evidence action, and a contained chronology. Each record retains its expandable notes, linked source information, arrival motion and edit action.                                                                                                                                                                                     |
| `/engineering/evidence/new`       | A focused **What changed?** form, using shared fields and native select treatment. All type/date/project/session/details fields remain.                                                                                                                                                                                                                         |
| `/engineering/evidence/[id]/edit` | Same shared form and existing update action.                                                                                                                                                                                                                                                                                                                    |

A user can enter Engineering, pick up an open project, record work in the existing timer, add evidence, and return to a concise overview. Deeper analytics no longer compete with the next action. No project metadata is silently assigned to historical sessions. Technologies remain project associations, and overlapping technology time is labeled.

### Content

| Route                                | New experience                                                                                                                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/content`                           | Continue making is a focal card with its current and next stage. The searchable work library, recent ideas, and releases each have a distinct panel. **Include archived**, **Older work**, and **Back to latest** expose existing query/pagination capabilities. |
| `/content/[id]`                      | A shared glass brief contains the working title, purpose, audience and optional notes. Variant selection stays visible. Writing and progress are grouped into adjacent cards on desktop and stack on phones. Related records and release results follow.         |
| `/content/[id]/variants/[id]/script` | A shared glass editor chrome aligns with app gutters. Save uses the shared button. The approved rich document editor, toolbar, line guide, table/image controls, find/replace, import/export and printing retain their implementations.                          |

The journey remains **working idea → variant → writing/production → release → observed results**. A new work asks for a working title, optional purpose and first format. Creation, variant, release and observation forms use shared underline controls and action buttons. Each release retains separate channel, date, URL and manual readings. Multiple variants, multiple destinations, version conflict recovery, idempotent commands, autosave, navigation guards and owned-image behavior are preserved.

Archive inclusion and pagination are query controls over saved data. Visible item counts are never presented as whole-library totals. Existing record corrections and history remain reachable through the original dialogs and links.

### Sessions and other domains

| Route             | New experience                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sessions`       | Focused time, session count and active days for the current view; text search, domain filter, and date-grouped session records. A clear Start a session / Current session action opens the existing controller. |
| `/domains/[slug]` | Summary facts for the latest 50 records, a session panel, and an activity panel. Built-in domain aliases continue redirecting to their dedicated areas.                                                         |

History explicitly describes its 100-session source window; filtered metrics describe only that view. Completed focused time excludes unfinished sessions. A completed record still opens the existing details drawer. Search examines titles, activities, domains, outcomes, notes, project names and content titles locally within the loaded history.

## Protected implementation and retained behavior

No dashboard feature, approved Season opening/onboarding, global timer controller, shared SessionRow, session lifecycle service, financial calculation, schema, authorization boundary or content persistence service was changed. The new appearance is opt-in through the relevant route workspace. Existing timer controls and rows may inherit the workspace's button variables only when displayed inside these new pages; the dashboard does not opt in.

The optional project-field disclosure keeps its children mounted, so saved values and native form data survive collapse. E2E project creation now explicitly opens that disclosure before filling a live URL.

## Validation at domain handoff

- `pnpm typecheck`: passed at the final owned-code check.
- Focused ESLint over all owned routes/features: passed after removing one unused icon import.
- `pnpm exec vitest run src/features/engineering src/features/content src/features/sessions/details/components/duration-picker.component.test.ts`: **9 files / 49 tests passed**, **4 files / 23 integration tests skipped** because their opt-in database flags were not enabled.
- Changed files formatted with Prettier.
- Stable optimized-server browser verification passed **10 behavioral cases**: Engineering sessions/context, unsaved-change guards and evidence expansion; Content focus/restart and released thumbnails; script editing/navigation, Word import/export, owned images/tables/undo, uncertain-save/conflict recovery; and idea → variant → focus → three-channel release → observed results.
- Earlier development-server runs were interrupted by memory-triggered restarts. The passing results above came from stable sequential runs on port 3028.
- Final visual/browser matrix **passed** at 1440px and 390px across 11 route compositions, including the script editor. It also verifies session search/no-results/clear, review finalization, source inspection/focus restoration, and finale replay. The phone session-grid overflow found in the earlier pass is corrected.
- **26 final captures** are saved under `docs/redesign/screenshots/`; finite animations are settled for capture. Images were visually inspected, including the corrected phone history, card hierarchy, control spacing, source drawer, and editor chrome.
- Combined focused tests after the Review/finale work: **11 files / 54 tests passed**, **5 files / 39 guarded integration tests skipped**.

No paid model calls or personal-record changes were used for this implementation.

## Screenshots

| Journey              | Desktop                                                  | Phone                                                  |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Engineering overview | [Open](screenshots/engineering-overview-desktop.png)     | [Open](screenshots/engineering-overview-phone.png)     |
| Project details      | [Open](screenshots/engineering-project-desktop.png)      | [Open](screenshots/engineering-project-phone.png)      |
| Project form         | [Open](screenshots/engineering-project-form-desktop.png) | [Open](screenshots/engineering-project-form-phone.png) |
| Evidence             | [Open](screenshots/engineering-evidence-desktop.png)     | [Open](screenshots/engineering-evidence-phone.png)     |
| Content desk         | [Open](screenshots/content-desk-desktop.png)             | [Open](screenshots/content-desk-phone.png)             |
| Content workspace    | [Open](screenshots/content-workspace-desktop.png)        | [Open](screenshots/content-workspace-phone.png)        |
| Script editor        | [Open](screenshots/content-script-desktop.png)           | [Open](screenshots/content-script-phone.png)           |
| Session history      | [Open](screenshots/session-history-desktop.png)          | [Open](screenshots/session-history-phone.png)          |

Screenshots contain disposable fixture records. They do not represent personal account data.
