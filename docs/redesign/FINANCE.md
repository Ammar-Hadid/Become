# Finance redesign

## What changed and why

Finance now follows one local navigation rail and one page heading. The duplicate domain masthead and broad introductory paragraphs are removed. The real data and available actions lead each page.

The overview uses the supplied Finance render as its composition reference: a saved savings goal has a focal card, current recorded position and period inflow/outflow have distinct metrics, cash movement and recent transactions sit together, attention and upcoming expenses occupy a secondary column, and reserve coverage has a broad shared progress treatment. Work analysis remains available below. No sample bank brand, card number, balance, trend or goal was invented.

Transactions have a desktop ledger with named columns and a filter workspace. On phones each transaction becomes a compact, labeled record. The summary cards describe all matching transactions, including records on later pages. Currency totals remain separate. Filters now include a calendar day, recent period and counterparty alongside type, account and currency. Dates use Europe/Amsterdam calendar boundaries, including daylight-saving changes. Clearing filters retains a valid Entrepreneurship receipt handoff.

Accounts are a card library. Detail pages put the amount or saved context first, followed by meaningful work panels. Savings uses shared progress components for actual spending and funding intention. Opportunities now shows open possibilities before established work relationships; acceptance actions use ordinary “work source” wording. Settings groups protected reserves, categories and counterparties into clear panels.

Shared Workspace, Card, Input, NativeSelect, EmptyState, ProgressIndicator and WorkspaceDisclosure own presentation. Finance owns records, wording, queries and save actions. Existing modal forms and dirty-state protection remain in place. Optional transaction notes and low-frequency corrections use disclosure. Shared disclosures provide the restrained selection cue; shared forms and dialogs own save/open/error sound behavior.

## Route and journey coverage

| Route                                    | Journey                                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/finance`                               | Read current money position → inspect an attention item, cash movement, upcoming expense, goal or recent transaction → open the relevant workspace. Historical period/date selection remains available. |
| `/finance/transactions`                  | Choose filters → inspect a movement → add income, expense or transfer → optionally connect received income to work or return to an originating business receipt.                                        |
| `/finance/transactions/[transactionId]`  | Read amount and context → link payment to completed work or attribute goal spending where relevant → correct or delete through existing guarded forms.                                                  |
| `/finance/accounts`                      | Scan real account cards → add account and first observed balance → select an existing account. Archived accounts remain accessible.                                                                     |
| `/finance/accounts/[accountId]`          | Check derived balance → update observed balance → inspect transactions or reconciliation history → correct a historical observation or update account role/lifecycle.                                   |
| `/finance/savings`                       | Understand liquid savings and reserve coverage → review allocation capacity → create a goal or rebalance allocations. Existing shortfall and underfunding states remain distinct.                       |
| `/finance/savings/[goalId]`              | Read confirmed spending and remaining funding → allocate intention or record a real purchase → edit, complete, reopen or archive through existing controls.                                             |
| `/finance/recurring`                     | Resolve due occurrences → inspect expected upcoming expenses → create/edit/pause/archive schedules → review commitment analytics.                                                                       |
| `/finance/opportunities`                 | Review open possibilities → capture an opportunity → review established work relationships and actual received income → retain closed history.                                                          |
| `/finance/opportunities/[opportunityId]` | Read prospective value separately from received money → update milestones/status → after acceptance create or link a work source, or defer.                                                             |
| `/finance/work/[sessionId]`              | Inspect completed work, focused time and actual linked payments → review payment completeness or correct allowed Finance metadata.                                                                      |
| `/settings/finance`                      | Set/edit per-currency reserve → open category or counterparty management. Blank reserve remains unconfigured; explicit zero remains deliberate zero.                                                    |
| `/settings/finance/categories`           | Create, rename or archive categories. Archived categories remain on historical transactions.                                                                                                            |
| `/settings/finance/counterparties`       | Create, rename or archive people/organizations. Existing transaction relationships remain intact.                                                                                                       |

## Preserved boundaries

- No bank integration, fabricated card data, foreign-exchange conversion or new AI workflow.
- Unknown account balance remains unavailable. Reconciliation anchors, inclusive/exclusive timing and balance calculations are unchanged.
- Transfers remain neutral movement and are excluded from income/outflow metrics.
- Savings allocation is intention; confirmed goal spending is actual progress. Reserve shortfall and plan underfunding remain different states.
- A saved opportunity or accepted offer never becomes income automatically.
- Automatic recurring posting remains an explicitly chosen scheduled assumption, not bank verification.
- All mutation services, authorization, validation, payment allocation and receipt-confirmation boundaries remain intact.
- Dashboard and Season onboarding are not edited by this phase.

## Validation

- Whole-app TypeScript check passed after the Finance implementation.
- ESLint passed for Finance features and Finance/settings routes.
- Six focused deterministic test files: 26 tests passed, including day filtering across Amsterdam’s 25-hour autumn DST day.
- Finance PostgreSQL integration suite: 25 tests passed using disposable users and the existing local database. The new test verifies filtered totals across cursor pages, currency separation, date exclusion and owner isolation. One initial run hit the existing 5-second timeout under concurrent activity; the suite passed with a 15-second test timeout and finished in 2.31 seconds.
- The populated Finance/Settings Chromium pass succeeded at 1440×1100 and 390×844: ten routes at each width, no horizontal document overflow or JavaScript page errors, transaction dialog opens/closes, and expense filtering retains its URL/control value and returns the five expected records. Disposable user and records were removed after the test.
- Inspected captures are in `docs/redesign/screenshots/finance-*.png`. Visual inspection caught and corrected a mobile ledger selector that inherited the desktop identity-column width; the corrected rule passed the optimized-preview rerun and was inspected on the phone capture. Transaction-form captures now disable finite screenshot animations and show the settled dialog.
- All seven Finance Chromium behavioral cases passed on the optimized preview: account reconciliation, transfers, protected reserve versus allocation, goal spending, shortfall/underfunding, recurring confirmation/automatic posting/skipping, payment-first work attribution, opportunity acceptance/deferred work-source linking, inline counterparties, cursor pagination, corrections, validation preservation, dirty navigation, category rename/archive, and modal keyboard/focus return.
- The combined Finance/Settings run has ten passing cases: the populated responsive pass, seven Finance cases, Personal settings, and Nexo settings. Initial behavior failures were obsolete selectors, corrected without changing product behavior or numeric/guard assertions (existing Application settings redirect, actual timer/account controls, shared progressbar role, renamed dialog). The six affected cases then passed sequentially in 26.7 seconds. Logs are in `test-results/finance-settings-final` and `test-results/finance-settings-retry`.
- Test-file ESLint passed after selector updates. The shared-motion regression file was aligned to current headings, header account control, keyboard-accessible Direction navigation and approved Character entry; its final run belongs to the lead integration phase.
- Initial snapshot runs were interrupted by a development-server restart and concurrent full reload; the successful run waits for page network activity to settle between routes.
