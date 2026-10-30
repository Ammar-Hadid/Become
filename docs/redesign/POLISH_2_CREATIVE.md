# Creative workspaces: second detail audit

Fresh-eyes review of Engineering, Content, session history/details, custom domains, Reviews and the Season finale on `adeb42f`. This pass targets secondary and expanded states from the existing redesign. It does not introduce features, new treatments, AI calls, service changes or data-model changes. Dashboard, approved Season opening and the shared timer are untouched.

## Actual finding and correction

A valid long custom technology identifier broke three Engineering presentations on a 390 px phone:

| State               | Observed result                                                                          | Local correction                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Search/add option   | The identifier continued past the option's right edge and was clipped.                   | Let the option's text column shrink and wrap long identifiers.                                    |
| Selected technology | The chip expanded the page to 447 px and placed its Remove control outside the viewport. | Constrain the chip to its available width; wrap the name while preserving icon and Remove widths. |
| Saved project stack | The same name expanded the page to 419 px.                                               | Apply the same constrained name wrapping to the read-only stack.                                  |

The existing chip appearance, labels, matching, custom-technology creation, selection, removal and persistence are retained. Two components gain a text span; the feature stylesheet supplies the width/wrapping rules. No shared primitive was changed.

The other inspected feature states did not justify changes. The 820 px header countdown/avatar collision was reported to the shared-system owner, who handles that fix separately.

## What was inspected

Read the current agent contract, approved shared library, Workspace, form, spacing and badge contracts, actual shared controls and menus, the prior creative polish report and the installed Next.js CSS guide. The existing creative fixture was reused with disposable data and longer realistic names.

The bounded browser pass captured 39 states:

- At 390, 820 and 1024 px: Engineering custom-technology options, selected chips, saved stack, invalid optional URL after collapsing its section, and evidence context fields.
- At those same widths: Content platform menu, expanded release destinations and add-channel fields, server-rejected results count, and the script Document menu.
- At those same widths: session duration editing, keyboard number entry and cancellation; custom-domain heading, empty activity history and long activity label.
- At 820 px: finalized review source drawer, Escape/focus restoration, finale results passage and closing passage.

The custom-domain activity label was populated, but its session history was empty. Session rows and the time editor were exercised through the populated Engineering sessions. No claim is made that every record permutation or browser was inspected.

Screenshots were reviewed for visible clipping, spacing, typography, icon alignment and usable controls, rather than relying only on page overflow. In particular, reviewed the technology option and saved-stack defect, phone release fields and validation, Document menus at phone/intermediate widths, session time entry, custom-domain activity label, review source drawer and both finale passages. The shared fixed header appears at the current scroll position in some full-page form captures; it does not conceal the technology evidence.

## Validation and evidence

- The first partial run stopped on an obsolete Content toolbar selector. The harness was corrected to the current accessible Document button; no product change was needed.
- Complete baseline: **1/1 passed in 12.6 seconds**, with geometry observations recording the technology overflows above. The disposable account was deleted in `finally`.
- Edited component and audit ESLint, formatting and diff checks: passed.
- Final rebuilt verification: **1/1 passed in 13.1 seconds**, with 39 captures at 390/820/1024 px and no page/control overflow in any captured state. Both selected-chip Remove controls passed hit testing; removing the newly selected technology left the saved one intact. The fixture account and records were deleted automatically.
- Visually inspected the final phone search option, selected chips and saved stack: the full identifiers wrap inside their existing surfaces, icons remain intact and Remove stays visible. The intermediate-width Document menu and shared header were also rechecked visually; the previously reported header collision is resolved in the lead's shared fix.

The permanent bounded audit is `e2e/polish-2-creative.spec.ts`. It creates its own disposable account and records, cleans them afterward, exercises existing controls, and asserts that recorded page/control bounds fit. Final checks also require both selected-chip Remove controls to be hit-testable and verify that removing the newly selected technology leaves the saved technology intact.

```sh
BECOME_E2E_PORT=3028 node node_modules/@playwright/test/cli.js test e2e/polish-2-creative.spec.ts --project=chromium --workers=1 --output=test-results/polish-2-creative-final --reporter=line
```

Local baseline evidence is in `test-results/polish-2-creative-baseline-complete/`. Six original before/after captures are retained in `docs/redesign/screenshots/polish-2-creative/`:

- Search option: [before](screenshots/polish-2-creative/before-technology-option-390.png), [after](screenshots/polish-2-creative/after-technology-option-390.png).
- Selected chips: [before](screenshots/polish-2-creative/before-technology-selected-390.png), [after](screenshots/polish-2-creative/after-technology-selected-390.png).
- Saved stack: [before](screenshots/polish-2-creative/before-technology-stack-390.png), [after](screenshots/polish-2-creative/after-technology-stack-390.png).

No injected CSS was used for final evidence. The local package-manager launcher stalled during this session, so checks used the installed binaries directly. An unrelated preserved `node_modules 2` symlink causes the ordinary broad TypeScript glob to include dependency tests; the lead owns the temporary validation exclusion, not a product-source workaround.
