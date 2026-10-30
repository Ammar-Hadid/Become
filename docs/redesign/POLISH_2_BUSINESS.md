# Entrepreneurship: second detail audit

This pass uses fresh review of the existing Entrepreneurship interfaces. It extends the earlier [detail audit](POLISH_ENTREPRENEURSHIP.md), concentrating on open menus, optional fields, correction dialogs, longer record names and guide editing. It does not introduce a new journey, feature, AI call or data contract. The dashboard, Season opening and shared presentation components remain unchanged by this pass.

## Confirmed corrections

| Surface                         | Observed defect                                                                                                                                                                                       | Correction                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interview guide formatting menu | Opening Text style inside the horizontally scrolling toolbar clipped the menu to the toolbar's height. Only the first option was visible; focusing it also displaced the toolbar controls vertically. | Allow the existing toolbar groups to wrap and remove the local overflow clip. Keep the shared menu, its positioning, keyboard behavior and appearance.   |
| Interview guide Add link action | Selecting saved text without typing left Add link disabled. The toolbar subscribed to formatting state but not selection emptiness, so selection alone did not update its disabled state.             | Include selection emptiness in the existing editor-state subscription and use that value for the existing action.                                        |
| Long selected audience segment  | At 320 px a long segment name forced the record picker wider than its dialog and hid the trailing chevron. Document-width checks alone did not detect this internal overflow.                         | Allow the existing picker field, wrapper and trigger to shrink inside their grid/flex parents; preserve ellipsis and the full accessible selected value. |
| Entrepreneurship phone dialogs  | The domain narrows dialogs but retained the full-width mobile treatment’s zero side margins, leaving a 32 px gap only at the right.                                                                   | Center the existing domain dialog width with automatic inline margins; keep its current vertical placement and shared dialog behavior.                   |

These corrections are confined to `interview-guide-toolbar.component.tsx`, `interview-guide-workspace.css`, `business-record-picker.css` and the existing domain dialog rule in `entrepreneurship.css`. No server action, validation rule, publication, autosave or stored guide format changed.

## Inspection

Read the current repository contract, shared library, form and workspace contracts, actual menu/dialog/field components, prior Entrepreneurship audit, and installed Next.js client-component/CSS documentation. Source review included correction menus, audience overrides, record pickers, guide creation/editing and the existing synthesis setup surface. A suspected correction-menu spacing issue was not assumed to be a defect: the domain already supplies row padding, and desktop rendering was readable.

Browser fixtures use a disposable local account, exploration, company, segment, interaction, observation and saved guide. Long names deliberately exercise selected values and titles. No real user records or AI generation are involved. The initial exploratory fixture needed corrections to nested Prisma seed arguments and editor selection setup; those failed setup/interaction attempts are not counted as successful checks. An interrupted run's disposable account was explicitly removed; normal runs use the existing cleanup utility in `finally`.

The completed baseline capture covered 35 states at 1280, 1024, 768, 390 and 320 px in 15.5 seconds with no page overflow or runtime errors. Baseline rendering confirmed the guide menu clipping on desktop and phone. A separate real keyboard selection of existing text confirmed the disabled Add link control. The native required Reason field in the withdrawal dialog receives focus when submitted empty. Expanded audience correction, a long segment selection and business actions were also inspected at desktop, intermediate and phone widths.

The 35-state fixture visits the observation detail, company detail, guide collection/create dialog and guide editor routes. It opens the correction and business menus, triggers empty required-field validation, expands audience correction, selects a long existing segment and opens guide formatting/link controls. This supplements the earlier populated main-route audit rather than repeating its large data fixture.

## Evidence and validation

Before evidence: [clipped guide menu at 1280 px](screenshots/polish-2-business/before-guide-menu-1280.png), [phone menu](screenshots/polish-2-business/before-guide-menu-390.png), [disabled Add link with selected text](screenshots/polish-2-business/before-guide-link-390.png), [overflowing long segment](screenshots/polish-2-business/before-long-segment-320.png), and [unequal dialog gutters](screenshots/polish-2-business/before-dialog-390.png).

After evidence: [desktop guide menu](screenshots/polish-2-business/after-guide-menu-1280.png), [phone guide menu](screenshots/polish-2-business/after-guide-menu-390.png), [working link action](screenshots/polish-2-business/after-guide-link-390.png), [contained segment and chevron](screenshots/polish-2-business/after-long-segment-320.png), [equal dialog gutters](screenshots/polish-2-business/after-dialog-390.png), and [link validation at 320 px](screenshots/polish-2-business/after-link-validation-320.png).

- Focused component and browser-test ESLint: passed.
- Changed files formatted with the installed Prettier binary.
- Permanent regression added to `e2e/entrepreneurship-journey.spec.ts`: `guide formatting choices remain reachable and selecting saved text enables links`. It checks menu hit testing, keyboard dismissal/focus return, enabling links by selecting existing text, link validation and narrow-screen overflow.
- Final rebuilt capture: 1/1 passed, covering 35 states at 1280, 1024, 768, 390 and 320 px. It checks equal open-dialog side gutters, selected-picker containment and chevron hit testing, required-field focus, enabled link creation from saved text, page overflow and runtime errors.
- Permanent guide regression: 1/1 passed in 5.5 seconds at 1280, 768, 390 and 320 px. Its eight screenshots cover formatting menus and link validation. The first invocation matched both the field alert and Next.js's route announcer; the test was corrected to scope its alert to the link editor, then passed. This was a test selector issue, not an application defect.
- Representative compiled screenshots were visually inspected at desktop, intermediate and phone sizes. All disposable fixture accounts were removed. The temporary capture fixture was removed; the focused regression remains in the existing journey suite.

Use the existing optimized preview, one worker and a unique output directory:

```sh
BECOME_E2E_PORT=3028 node node_modules/@playwright/test/cli.js test e2e/entrepreneurship-journey.spec.ts --grep 'guide formatting choices' --project=chromium --workers=1 --reporter=line --output=test-results/polish-2-business-regression
```

This is a targeted continuation of the previous audit, not a claim that every possible record state or browser was re-rendered. The synthesis setup surface was source-reviewed; existing generated proposals were not part of this browser fixture and this pass does not request new AI output.
