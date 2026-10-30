# Finance and Settings detail polish

This pass preserves the current redesign, routes, data, financial calculations, configuration, and save behavior. It adds no feature, AI call, component, or visual language. Shared presentation remains root-owned; the approved dashboard and Season onboarding are untouched.

## Corrections

| Observed defect                                                                                                                                   | Local correction                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance Settings' Update reserve and Add currency reserve actions touched because the spacing selector still targeted the retired dialog trigger. | Apply the existing spacing token to the current reserve action class.                                                                                         |
| The recurring no-confirmations banner touched the following panel on desktop and phone.                                                           | Include that existing banner in the page's established section rhythm.                                                                                        |
| Expense/income color inherited into neutral account, category and counterparty values in transaction details.                                     | Restore normal text color for detail values while preserving the semantic amount and icon color. Values can wrap without forcing a grid wider.                |
| Nexo profile Provider lacked a visible field label, and helper text placed neighboring model fields on different baselines.                       | Add the visible Provider label to the existing control and align field groups at their top. Advanced controls use the same alignment.                         |
| Category/counterparty management still targeted the retired dialog trigger and restyled shared buttons with old sizing.                           | Target the current shared Button for the existing phone full-row action, preserve shared button sizing, and separate row actions with the existing gap token. |
| On 320px recurring rows, the status badge narrowed long commitment names into unnecessarily short lines.                                          | Let the existing title and badge wrap within the identity group on phones.                                                                                    |
| The generic Finance empty state showed “TRANSACTIONS / ALL TIME” even within savings attribution and non-ledger records.                          | Explicitly omit the pattern's default context. The feature's title and explanation supply the actual meaning.                                                 |

The root owner received two shared findings: phone panel-heading icon actions could wrap into stray rows; EmptyState's explicit false context left an empty context wrapper. Those shared changes are documented by the root pass.

## Evidence and coverage

The existing disposable `e2e/finance-redesign.spec.ts` now seeds an account and balance check, eight transactions, a category and counterparty, a savings goal and reserve, an applied opportunity, a recurring commitment, and a saved Nexo model profile. All records belong to a newly registered local test user, cleaned up after the test. No configured provider or real AI execution is used.

The baseline browser audit passed at 1440px and 390px in 29.8 seconds, including the existing expense filter behavior, page error collection and document overflow assertions. Baseline screenshots were inspected for account, transaction, goal and opportunity details; recurring commitments; Settings Finance; Nexo advanced controls; and balance/schedule dialogs. Representative before evidence lives in [screenshots/polish-finance](screenshots/polish-finance/).

The rebuilt application passed the expanded final audit in 47.7 seconds: 48 route-width visits at 1440px, 390px and 320px, 12 open account/transaction/goal/opportunity editors, three expanded Nexo model editors, and nine dialog openings. The audit retained its expense filter check, found no document overflow and collected no page errors. The source-only fixture changes grant no special application permissions.

The inspected after evidence in [screenshots/polish-finance](screenshots/polish-finance/) includes the separated reserve actions, 320px category management actions, neutral transaction detail values, aligned Nexo fields, and open account/transaction editors. The 320px recurring title/badge wrap was discovered during this pass, corrected, and verified against the next compiled build in a narrowly scoped rerun that passed in 3.0 seconds. The title now uses the available row width, with the badge below; the row, menu and amounts remain intact. Before/after images are saved as `before-recurring-title-320.png` and `after-recurring-title-320.png`.

Formatting, focused ESLint, and whole-application TypeScript checks passed after the local source changes. The final additional CSS-only change also passed its compiled browser screenshot check. No Finance or Settings verification remains pending.

Image Prompts is owner-gated and is not accessed by granting privileges to this disposable account. This pass makes no changes to its protected generation resolver or published/draft behavior.

## Independent review

A read-only review of the root shared and Direction polish diff found no actionable regression. Shared dialog triggers preserve native button and focus-return behavior; source changes remain scoped away from the protected dashboard and Season onboarding. Shared heading icons now stay beside their headings, verified in the transaction-detail after screenshot.
