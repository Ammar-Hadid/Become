# Finance and Settings: second detail audit

This pass used fresh ownership to inspect the existing Finance, Settings and Nexo interfaces. It keeps the current design, financial calculations, configuration, services and saved-record behavior. No feature, provider connection or AI execution was added. The dashboard and approved Season opening were not changed.

## Confirmed correction

Nexo's optional Input price and Output price controls already enforce their numeric bounds. Unlike the other model controls, they did not reveal their containing sections when invalid. Entering a negative input price, closing Advanced model controls and the model profile, and pressing Save Nexo settings left the invalid field hidden. Native validation blocked submission, but could not focus the correction. The baseline reproduced this at 1024px, 768px and 390px.

Both price inputs now use the existing `revealInvalidControl` handler with its advanced-section option. It opens the existing profile and advanced sections before native validation focuses the invalid control. This is a two-line component change; bounds, validation messages, schema, persistence and provider behavior remain unchanged.

Before evidence: [collapsed invalid price at 768px](screenshots/polish-2-finance/before-nexo-hidden-price-768.png). The fixed header appears partway down this full-element baseline screenshot because it was captured after scrolling to Save; that screenshot artifact is unrelated to the closed model profile.

Compiled after evidence shows the [revealed input price at 768px](screenshots/polish-2-finance/after-nexo-input-price-768.png) and [revealed output price on a phone](screenshots/polish-2-finance/after-nexo-output-price-390.png). Both controls receive focus after reopening.

## Focused coverage

The new `e2e/polish-2-finance.spec.ts` uses one disposable local user, a checking account and savings account, long ordinary account/category/counterparty/work-source names, transactions, a recurring commitment, one completed paid-work session and one unconnected Nexo model profile. Cleanup deletes only that disposable user's records. Payment attribution is exercised as a draft; no real financial record or provider setting is changed.

At 1024px, 768px and 390px, the baseline exercised:

- Recurring action menu, schedule editor, Escape dismissal and return of focus to its trigger.
- Selecting a paid-work candidate and dividing an income payment by time spent; paid-work detail with a long session description.
- Expanded model controls; invalid pricing after closing both disclosures.
- Task search with no results, return to the task list and expanded connection details.

At 768px it also exercised an excessive-transfer warning, category suggestions, Personal Settings' changed-email/current-password state and reset, and Application Settings' sound control presentation. The final run additionally checks the exact incorrect-password message after submission finishes, plus input-price and output-price focus recovery separately.

The baseline produced 28 screenshots. Its only assertion failures were the three reproductions of the hidden price input. No document-width overflow or page errors were reported. Screenshots were inspected for menu placement, dialog spacing, long descriptions, field alignment, selection affordances, routing empty state and validation presentation. The desktop profile's zero outer padding belongs to its existing divided-list composition inside a padded panel; it was not treated as a reason to change the design.

A shared header issue was referred to the root owner: at 768px the countdown and profile content overlap ([before](screenshots/polish-2-finance/before-header-overlap-768.png), [compiled after](screenshots/polish-2-finance/after-header-overlap-768.png)). A follow-up geometry check with a longer valid name exposed a second intrinsic-grid edge case: at 1025px, the account button ended at x932 but its chevron ended at x1211.875. The root owner constrained the account copy's grid column; the final compiled check places the chevron at x918–932, with notification actions starting at x965. Name text, chevron and action separation also pass at 768px and 1440px ([long-name before](screenshots/polish-2-finance/before-header-long-name-1025.png), [compiled after](screenshots/polish-2-finance/after-header-long-name-1025.png)). No shared header source was edited by this agent. A root-requested temporary CSS diagnostic preceded that source correction; its override was removed before final verification and its screenshots are not final evidence.

Image Direction remains owner-gated. Its components and Settings layout were source-reviewed, but this disposable account was not granted privileges to enter it. This audit does not claim rendered coverage of its protected editor, prompt drawer, publication flow or selected-Season inspector. Earlier broad Finance route captures are recorded in `POLISH_FINANCE.md`; this pass targeted the less-tested states above instead of repeating them all.

## Validation

- Direct installed Prettier and focused ESLint passed for the component and browser fixture.
- A direct whole-application TypeScript check encountered the unrelated preserved `node_modules 2` symlink. TypeScript included dependency source tests under that name, producing dependency diagnostics and additional Next type contamination. This agent left the symlink and project configuration untouched. The root owner subsequently reported the final optimized build and isolated type check passing.
- Final compiled browser verification: **2 tests passed in 23.0 seconds**, producing 34 screenshots. This includes all Finance/Settings states above and the three header widths. Both price controls reopen and receive focus at all three Finance/Settings widths. There were no document-width overflow failures or page errors.

The first final attempt exposed an exact-label mistake in the new test: Output price's implicit label includes its existing helper text. The input-price recovery had already succeeded, but the exact output-price locator timed out. The fixture now matches the real label and bounds its interactions; cleanup tolerates an already-closed page. The interrupted disposable user was explicitly removed, and every subsequent fixture completed cleanup.

Final screenshots were inspected for the two corrected price states, header alignment, completed incorrect-password feedback and recurring controls. The full-page capture helper scrolls to the top; when a menu's trigger is consequently outside the viewport, the shared menu remains clamped inside it. That particular final full-page menu shot is not used as evidence of initial anchor placement. Baseline menu screenshots were captured with their trigger in view. No further local presentation defect was established.

The baseline command was `BECOME_E2E_PORT=3028 node node_modules/@playwright/test/cli.js test e2e/polish-2-finance.spec.ts --project=chromium --workers=1 --output=test-results/polish-2-finance-baseline`. Direct installed binaries avoid an unrelated local package-manager launcher hang. No dependencies were modified.

The final command used the same file and options with `--output=test-results/polish-2-finance-verified`. No CSS injection was present in that run. Source remains frozen and ready for integration.
