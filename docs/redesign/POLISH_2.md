# Become — second detail-polish pass

28 October 2026 · `codex/whole-app-redesign` · baseline `adeb42f`

This continues the [first detail audit](POLISH.md). Reviewers rotated domains to look for overlooked defects rather than repeat their own assumptions. The scope is existing content and controls: no new feature, journey, AI call, data model or design treatment. Areas without a reproducible defect were left alone.

## Confirmed corrections

| Area             | Actual problem                                                                                                           | Correction                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared header    | Long account names/email addresses consumed the tablet header's available width and overlapped the Season countdown.     | Preserve the leading group, constrain the account group, and let text shorten while retaining the avatar, chevron and notification action. |
| Shared menus     | Long option lists extended beyond short viewports or flipped underneath the sticky header.                               | Bound the menu to the available space, scroll its choices, and preserve keyboard navigation, focus return, motion and modal layering.      |
| Direction        | A long optional experiment measurement title expanded a 320px page to 698px.                                             | Allow the editor grid and title cell to shrink within the page; retain the full editable value.                                            |
| Direction        | A long experiment breadcrumb squeezed its back arrow to about 7px.                                                       | Keep the arrow's intended size while allowing the text to wrap.                                                                            |
| Engineering      | Long custom technology identifiers clipped in options and pushed chips and their Remove controls outside the phone page. | Wrap the name inside a shrinkable chip while retaining the icon and Remove target.                                                         |
| Entrepreneurship | The interview-guide formatting menu was clipped by its toolbar.                                                          | Wrap toolbar groups and allow the existing menu to extend beyond the toolbar.                                                              |
| Entrepreneurship | Selecting existing guide text did not enable Add link until an unrelated editor update.                                  | Subscribe the existing toolbar state to selection emptiness.                                                                               |
| Entrepreneurship | Long selected segments pushed the picker chevron outside a narrow dialog.                                                | Permit the picker field, wrapper and trigger to shrink within their parent.                                                                |
| Entrepreneurship | Phone dialogs had a gap only on the right.                                                                               | Center the existing dialog width with equal inline margins.                                                                                |
| Nexo settings    | An invalid optional price blocked Save while remaining hidden inside collapsed sections.                                 | Reuse the existing invalid-control handler to reveal and focus either price input.                                                         |

No local changes were justified in the reviewed Finance surfaces, Content, Sessions, custom domains, Reviews or finale. Their checked states and explicit coverage limits are recorded below. Dashboard and approved Season-onboarding feature layouts were preserved; shared header/menu fixes naturally also apply wherever those components are reused.

## Evidence and coverage

- [Finance and Settings report](POLISH_2_FINANCE.md): recurring menus, schedule editing, payment attribution, long paid-work descriptions, transfer warning, category suggestions, Personal Settings and Nexo's collapsed validation/routing states.
- [Entrepreneurship report](POLISH_2_BUSINESS.md): guide editing and selection, formatting/link menus, audience corrections, long segment selections and withdrawal validation.
- [Engineering, Content, Sessions, domains, Reviews and finale report](POLISH_2_CREATIVE.md): long custom technologies and less-tested optional, invalid, menu, drawer and intermediate-width states.
- Direction: goal/idea/decision action menus, goal/experiment conclusion forms, manual experiment assessment, evidence-source choices and populated optional measurement editing at 320, 768, 1024 and 1440px. Additional header edges at 721, 820 and 1025px; a normal-motion source menu at 844×390. The final fixture captures 36 states, checks page/menu bounds, back-arrow width and tablet header separation, and exercises Home/End/Escape with a hit test on the last option. Most captures use reduced motion; the short landscape menu explicitly uses normal motion.

Representative Direction comparisons: [measurement editor before](screenshots/polish-2-direction/before-measurement-editor-320.png) / [after](screenshots/polish-2-direction/after-measurement-editor-320.png), [long breadcrumb before](screenshots/polish-2-direction/before-manual-assessment-320.png) / [after](screenshots/polish-2-direction/after-manual-assessment-320.png), [short-viewport menu before](screenshots/polish-2-direction/before-source-types-landscape-844.png) / [after](screenshots/polish-2-direction/after-source-types-landscape-844.png). Full-page captures of scrolled states include the sticky header at its captured scroll position; geometry and hit testing use the real viewport.

All browser fixtures create disposable local accounts and clean up their own records. No paid provider runs or real-user records are needed. This pass is a deeper continuation of the earlier route-wide review, not a claim that every possible saved state, browser and access-controlled editor was re-rendered. Image Direction's owner-gated editing remains source-reviewed only in this pass.

## Validation

- Optimized production build and TypeScript: passed on final source.
- Full application ESLint: passed. Changed source and retained browser fixtures pass formatting and whitespace checks.
- Unit suite: **399 passed**, 164 skipped by the existing suite configuration.
- Final compiled Finance/Settings and long-account header regressions: **2/2 passed** in 23.0 seconds.
- Final creative audit: **1/1 passed** in 13.1 seconds, covering 39 rendered states.
- Final shared regression run: **4/4 passed** in 18.2 seconds. It includes the guide-formatting regression, Direction secondary-state audit, and mobile/desktop shared-surface tests covering account menus, timer/content dialogs, domain pages, navigation and Season entry.
- Entrepreneurship's separate 35-state capture also passed, including narrow picker hit testing and equal dialog gutters; its permanent guide regression passed again in the final shared run.
- Dashboard and Season feature sources have no diff from this pass's baseline. No schema, API, service, dependency or AI-provider changes.

The first combined Business invocation and first expanded Finance invocation exposed ambiguous/exact-match test selectors, not additional product defects. Their corrected tests passed; the individual reports retain that distinction. Screenshots and actual hit testing were both used, so a page-width check alone was not treated as sufficient evidence.

The local package-manager launcher stalled, so checks use the already-installed binaries directly. An unrelated `node_modules 2` symlink causes TypeScript to scan dependency source tests. Build/type verification temporarily excluded that duplicate dependency tree and restored the exact original configuration afterward; ESLint explicitly ignored the same tree. The symlink and dependencies were preserved. A stalled cleanup of the old generated `.next` tree was bypassed by retaining it beside the checkout as `Become-redesign-next-before-polish2` and building a fresh `.next` directory. None of these local verification accommodations changes the product or its committed configuration.

## User journeys

The existing journeys are unchanged. These fixes make their current steps reachable: read a long label, open the existing menu, select or remove a technology, format selected guide text, review a correction, and find the field preventing a settings save. No capabilities were removed or newly introduced.
