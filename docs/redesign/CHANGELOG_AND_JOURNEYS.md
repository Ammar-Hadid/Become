# Become — complete experience redesign

27 October 2026 · `codex/whole-app-redesign`

Follow-ups: [first detail polish audit](POLISH.md) and [second detail polish audit](POLISH_2.md).

## Intent and scope

The redesign makes the next action and the relevant information easier to find while retaining the application's working capabilities. The owner's dashboard and approved Season onboarding supply the visual and interaction references. The two Finance renders guide the overview and transaction compositions; the real Become brand, actual records, domain navigation and financial semantics take precedence over mistakes or invented content in those renders.

The approved dashboard and Season opening/onboarding remain unchanged. All other product route families have a new composition or use the redesigned domain components. Historical candidate/review pages remain reference fixtures. [The complete route inventory](ROUTE_COVERAGE.md) records every product route pattern, including redirects and protected exceptions.

The original checkout is `/Users/elpridro/Documents/localDev/AI/Become` on `factor`. Work is isolated in `/Users/elpridro/Documents/localDev/AI/Become-redesign` on `codex/whole-app-redesign`. The original uncommitted implementation was captured before changes in `codex/redesign-baseline-20261027`, commit `66e55357132b15053744658becb0aa596448632d`. This baseline includes the owner's unfinished work, rather than reverting to an older committed application.

## Shared experience

| Change                                               | Why                                                                | Result                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Compact domain navigation and one clear page heading | Repeated headings and scattered links obscured the actual task     | A stable local navigation bar, page purpose and relevant action                                                                      |
| Distinct focal, metric, work and record compositions | One repeated gradient card gave every fact the same importance     | Elevated glass for focal content; quieter glass panels and divided records for sustained work                                        |
| Redesigned buttons                                   | The owner rejected the previous button treatment                   | Softly rounded controls, domain-accent primary actions, quiet secondary/ghost actions, consistent icon gaps and larger touch targets |
| Shared native fields and select geometry             | Per-feature controls accumulated inconsistent padding and chevrons | Actual shared Input, Textarea, NativeSelect and Button components; native labels, keyboard behavior and validation retained          |
| Optional detail disclosures                          | Forms presented every possibility at once                          | Start with the essential question, then open context, links or measurements when needed; drafts remain mounted                       |
| Consistent equal page gutters                        | Dense domains felt unrelated to the approved app shell             | Full available width, consistent side spacing and responsive stacking                                                                |
| Restrained feedback                                  | Successful actions should feel responsive without constant noise   | Existing Precision Light motion and sound provider, with selective navigation, opening, explicit-save and blocked-action cues        |

The new workspace layer is opt-in. It uses the real shared Card and control components rather than parallel feature-specific copies. Existing approved material tokens supply the glass and blur. New button values live in the owner-editable token file and apply to redesigned workspaces; protected screens retain their presentation. Icons have reserved space and never shrink into their labels. Native disclosure sections reveal invalid fields so validation cannot strand a hidden required field.

Motion never waits before saving or navigating. Reduced motion removes movement while preserving behavior. Sound respects the saved mute preference and existing repetition controls. No hover, typing, autosave or page-load sound was added. No new audio assets or feature-local synthesis were needed.

Implementation and shared admission details: [Workspace system](../design/WORKSPACE_SYSTEM.md). The owner explicitly waived the usual candidate approval step for this redesign; this does not change the approval rule for future work.

## New user journeys

### Finance

The overview starts with the current savings focus, then separates recorded position, money in and money out. Cash movement, recent transactions, attention items, upcoming expenses and reserve each have a recognizable place. Work and opportunities remain available without crowding the first reading.

Transactions follows the supplied ledger composition: summary cards above, a divided ledger beside filters on desktop, and legible stacked records on phones. Choose a period or day, account, movement type, counterparty or currency; apply the view; inspect or record a transaction. Totals describe the complete filtered result, not just the visible pagination page. No fictional bank card or live connection is shown.

Accounts retain reconciliation and historical balances. Savings keeps reserve, allocation and actual spending distinct. Recurring expenses retain confirmation, skip, pause and automatic-posting choices. Opportunities keep expected value separate from received income, with the existing explicit work-source handoff.

Full route-by-route details: [Finance](FINANCE.md).

### Entrepreneurship

Start with a question or return to the current exploration. Its overview shows a deterministic next action and direct destinations for audience, outreach, conversations, evidence and offers. All workspaces remain directly accessible; the sequence does not lock capabilities behind artificial steps.

Add people or businesses → record outreach → hold a conversation, freely or with a saved guide → keep useful evidence → review what is known → test an offer. Optional conversation setup, management and context sit behind clear disclosures. Search, archives, corrections, source relationships, history, guide autosave and published editions remain available. The existing Nexo proposal remains an explicit generate/review/accept action.

Full journeys, catch-all routes and inspector coverage: [Entrepreneurship](ENTREPRENEURSHIP.md).

### Engineering

The overview separates current work from recorded evidence. Open the project library, create a project with its basic identity, and add optional links and technical context when useful. Project details group progress, context and evidence. Capture or edit evidence through a focused shared form. Focus sessions retain their project and Engineering context.

### Content

Return through Continue making, search the library, or start with a working title. Set the purpose and audience → choose a variant → write or produce → release to one or several destinations → record observed results. The variant, progress, writing and release areas have distinct panels.

The actual rich-text editor, autosave, tables, images, find/replace, import/export, printing, conflict recovery and navigation guards remain intact. Archive inclusion and older work are discoverable library controls. Explicit saves use feedback; background autosaves remain quiet.

Engineering, Content and activity details: [Engineering, Content and activity](ENGINEERING_CONTENT_ACTIVITY.md).

### Goals and Direction

New goals are simple statements. Write the goal, assign one or multiple domains, and optionally add dates and notes. There is no sub-goal builder, parent/child goal structure, or evidence-definition authoring in the normal goal editor. The browser regression verifies a goal with Engineering and Content assignments through creation, editing and refresh.

The detail shows the goal, its domains and timeframe, with clear pause/conclude/manage controls. Saved changes and conclusions remain in history. Historical evidence definitions are retained in a labeled disclosure and keep their original integrity checks; the redesign does not silently delete stored evidence.

Experiments ask what is being tested and when to check the result. Links/context and optional measurements follow as disclosures. Existing attempts, domain/source links, evidence and conclusion behavior remain available. Ideas begin with quick capture; turn a useful idea into work when ready. Decisions separate the choice, context, rationale and later reflection.

This Season shows saved character artwork when available, simple goal and experiment lists, cadence and closing information. The Season library preserves saved packs. Opening or revisiting the approved guided onboarding uses the existing flow. Old Living URLs continue redirecting there.

### Reviews and Season finale

Choose a week, month, Season or year, or open a saved edition. Read the overview, select a chapter, inspect its sources in the shared drawer, and add your own reflection. Save a draft or finalize through the existing explicit controls. Facts, user interpretation and immutable editions remain distinct.

The finale keeps its four passages: what you brought, what filled the days, what changed, and what you take with you. Glass composition and equal gutters improve reading; defer, skip, replay and recovery retain the existing state machine. Closing the finale does not silently conclude goals or finalize a written review.

Full details: [Reviews and finale](REVIEWS_FINALE.md).

### Settings, authentication and activity

Settings uses a consistent navigation and one heading per page. Personal information, application sound preferences, Finance configuration, Nexo setup and Image Direction have separate working areas.

Nexo follows provider → model profile → task routing → daily limit. Image Direction keeps category selection, editing and real-Season preview grouped while retaining draft/save/publish rules. Publishing changes future prompts, not already approved imagery. Existing provider and budget behavior remains intact.

Sign-in pairs a short welcome with a focused form. Session history adds view-scoped facts, search/domain filters and date groups while preserving the existing timer and detail drawer. Generic domains show their recorded sessions and activity; built-in domain aliases still lead to dedicated workspaces. Recovery panels provide retry and useful exits.

Full Settings details: [Settings](SETTINGS.md).

## Capability and data boundaries

No schema migration, deletion of personal records or automatic goal restructuring is part of this work. Authorization, ownership, validation, idempotency, dirty-form guards, archives and corrections remain in place. Financial transfers remain neutral; currencies are not combined; expected income is not treated as received money. Unknown values remain unknown.

Two narrow data-query changes support correct UI behavior: filtered transaction totals and date/counterparty filters, and explicit Prisma SQL composition for Entrepreneurship focus-duration aggregation. Regression tests cover currency/owner/date/cursor boundaries and paused-time accounting. The broader work changes composition and controls rather than persistence services.

No new AI workflow or paid call was introduced. Additional monthly AI cost from this redesign is **€0**. Existing manually invoked AI features retain their configured providers, routes and budgets. Any future AI simplification still requires the owner's approval with expected sole-user frequency and monthly cost.

## Verification and review evidence

The final verification results are recorded in [Validation](VALIDATION.md). Tests use disposable local users and remove their records; no personal records were used as editable fixtures. Desktop and phone captures live in [screenshots](screenshots/). Screenshots contain explicitly disposable test data, not claimed bank connections or personal achievements.

Representative comparisons: [Finance overview](screenshots/finance-overview-desktop.png), [transactions](screenshots/finance-transactions-desktop.png), [Entrepreneurship](screenshots/entrepreneurship-overview-1440.png), [simple goal](screenshots/goal-detail-desktop.png), and [phone experiment form](screenshots/direction-experiments-new-phone.png).

## Run and rollback

Use the redesign checkout and its independent dependencies. `pnpm dev` starts the application at the repository's normal development port; use a different port if the original app is already running. The shared component workshop is available with `pnpm storybook`.

To review only this redesign, compare `codex/redesign-baseline-20261027...codex/whole-app-redesign`.

To return to the old experience, use the original `Become` checkout on `factor`; its source working state was left intact. The baseline branch above also preserves the exact captured source state. There is no database rollback to perform for this redesign. Do not reset or clean the original checkout: it contains the owner's pre-existing uncommitted work.

The local preview and commits are review artifacts. This work does not deploy or merge into the original branch.
