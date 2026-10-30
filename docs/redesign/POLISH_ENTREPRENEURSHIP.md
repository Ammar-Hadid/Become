# Entrepreneurship detail polish

This pass corrects layout, spacing and typography in the existing redesign. It does not add features, change record behavior, alter AI usage, or change the dashboard, Season opening or shared focus timer.

## Corrections

| Surface                                          | Observed defect                                                                                                                                                             | Correction                                                                                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrepreneurship home and complete-record routes | The domain's top padding placed the page title behind the collapsed navigation launcher on desktop.                                                                         | Use the existing application clearance calculation on routes without an exploration masthead. Preserve the masthead's deliberate beside-launcher alignment and existing side gutters.                                 |
| Interview guide collection                       | A generic ledger grid assigned the title an auto-sized column and the arrow a large column. On phones the arrow fell onto its own row at the left.                          | Give the title a flexible column, metadata its own column, and the trailing arrow a fixed icon column. On phones metadata follows the title while the arrow remains at the right.                                     |
| Guide collection heading                         | Starting points appeared twice in a horizontal row; buttons touched the bottom divider. The whole collection retained an extra desktop maximum width.                       | Retain one semantic heading, restore its existing spacing rhythm and use the available page width.                                                                                                                    |
| Evidence filters                                 | Inline labels and two phone columns left the selected values visible only as “Al”. Controls had inconsistent baselines.                                                     | Place labels above their controls, align desktop controls along their bottom edge, use two columns at intermediate widths and one readable column on phones.                                                          |
| Next-action card                                 | The button occupied almost the entire narrow desktop sidebar, leaving the status text one word wide.                                                                        | Stack the existing status and action in the sidebar.                                                                                                                                                                  |
| Detail-card headings                             | Phone rules put small overflow menus on a separate row with excessive empty space.                                                                                          | Keep heading and menu in a wrapping row, remove duplicated heading margins and use existing spacing tokens.                                                                                                           |
| Sidebar labels                                   | Paragraph rules enlarged uppercase eyebrow labels to normal body size.                                                                                                      | Restore the shared overline typography tokens.                                                                                                                                                                        |
| Audience detail panels                           | Grid gap and panel margins accumulated, leaving large blank areas between related cards.                                                                                    | Use the workspace panel gap and remove child margins inside the grid.                                                                                                                                                 |
| Conversation message headers                     | A long participant name competed with the date and action menu, wrapping into a very narrow column.                                                                         | Let the participant occupy the available phone header width and keep metadata together below it.                                                                                                                      |
| Phone conversation capture                       | The Add message action squeezed the writing field into a narrow column.                                                                                                     | Give the writing controls their full available width and place the action below them.                                                                                                                                 |
| Phone interview header                           | Finish/pause actions squeezed the participant name and interview status.                                                                                                    | Stack the heading and existing action group at phone widths.                                                                                                                                                          |
| Expanded conversation setup                      | The optional linked-reply, guide and opening-context fields had no spacing between them.                                                                                    | Apply the existing action-field gap to the disclosure content inside domain forms.                                                                                                                                    |
| Phone/tablet interview guide                     | The page stacking context placed the fixed guide pane beneath the application header, hiding its title and Close control. A long title could also shrink the Close control. | Portal the mobile pane and scrim to the shared drawer layer, retain the Workspace treatment and existing modal hook, allow the title to wrap and keep Close at its existing full size. The desktop pane stays inline. |

The implementation touches `business-workspace.css`, `interview-guide-index.component.tsx`, `conduct-guide-pane.component.tsx` and `conduct-workspace.css`. Page corrections are scoped to `.workspace.business-shell`; the mobile guide has its own Workspace wrapper after moving outside the page stacking context. All shared controls, save actions, constraints, guide publication and transcript persistence remain intact. The existing modal hook still supplies scroll locking, Tab containment, Escape dismissal and focus return. The open guide is marked `aria-modal`; the shared hook does not add background DOM `inert`, while the exiting pane retains its existing inert state.

## Inspection and evidence

Read the current AGENTS contract, shared library, Workspace, spacing and form contracts, the real shared Card/Workspace implementations, and the installed Next.js CSS guide before editing.

Used a disposable local account with a named exploration, 20 outreach/conversation records, eight long transcript messages, eight observations, a person, segment, business, problem, recurring offer and a guide with a published question. No personal records were modified.

Initial desktop/phone capture covered the home, overview, outreach list and detail, conversation, guide collection/editor/preview, evidence and direction form. An expanded pass covered 15 populated surfaces and two forms at 1440 and 390 px, including audience and record details, a published guide, the interview conduct page, expanded conversation setup and direction review. The expanded pass completed in 10.5 seconds with no horizontal page overflow. Readiness checks wait for each real route surface; screenshots of loading placeholders were not used as final evidence.

Baseline captures are in `test-results/polish-business/` and `test-results/polish-business-expanded/`. These are local inspection artifacts, not committed product assets. Final evidence comes from the rebuilt optimized application; no injected stylesheet was used. The 46-surface final capture and geometry pass completed in 11.5 seconds. Visual inspection then caught the guide overlay issue even though the page geometry checks had passed; it was repaired and separately verified against another rebuilt preview.

Before/after evidence is retained under `docs/redesign/screenshots/polish-business/`:

- Guide arrow placement: [before](screenshots/polish-business/before-guide-index-390.png), [after](screenshots/polish-business/after-guide-index-390.png).
- Optional conversation fields: [before](screenshots/polish-business/before-conversation-form-390.png), [after](screenshots/polish-business/after-conversation-form-390.png).
- Next-action card and sidebar type: [before](screenshots/polish-business/before-outreach-detail-1440.png), [after](screenshots/polish-business/after-outreach-detail-1440.png).
- Guide overlay: [before](screenshots/polish-business/before-guide-overlay-390.png), [after](screenshots/polish-business/after-guide-overlay-390.png). The after capture deliberately uses a longer guide title in a fresh fixture.

This inspection used Chromium at 320, 390, 768, 900, 1024 and 1440 px for the stated surfaces. It is not a claim that every possible record combination or browser was visually inspected. Both the retained inspection account and the fresh regression account were deleted with the existing disposable-user cleanup utility.

## Validation

- Edited component ESLint: passed.
- Edited source formatting: passed.
- Whole-worktree TypeScript check: passed after adding the overlay regression.
- Final rebuilt populated-page capture and geometry assertions: 1/1 passed in 11.5 seconds.
- Permanent overlay regression in `e2e/entrepreneurship-journey.spec.ts`: 1/1 passed in 10.5 seconds on the rebuilt preview. Covers the inline desktop guide, 320/390/900 px overlays, long-title hit testing, full Close control, shared button styling, initial focus, forward/backward Tab wrapping, Escape/Close/scrim dismissal, focus return and body scroll locking.
- Final overlay screenshots were visually inspected at 320, 900 and 1440 px; the long title and Close remain fully visible. Earlier final captures were also inspected for launcher clearance, guide arrows, evidence filters, next-action text and conversation-form spacing.

## Repeating the inspection

The existing `e2e/entrepreneurship-journey.spec.ts` remains the reproducible source for disposable signup, exploration creation, long transcript/source text and guide authoring. Against a local preview, run:

```sh
BECOME_E2E_PORT=3028 pnpm exec playwright test e2e/entrepreneurship-journey.spec.ts --project=chromium --workers=1 --output=test-results/polish-business-journey --reporter=line
```

For the additional detail states, use the same disposable exploration with a person, segment, business, problem and a draft recurring offer. Publish a guide containing an introduction and one question with optional follow-up prompts, then start a conversation with that edition. Inspect the named surfaces at 1440 and 390 px; additionally check launcher clearance, guide-arrow placement, evidence filters and message writing at 320, 768 and 1024 px. Open the conversation form’s optional setup and the exploration’s direction form. This uses existing application journeys and the existing fixture cleanup utility; no new product behavior or permanent personal data is needed.

For the permanent overlay regression alone:

```sh
BECOME_E2E_PORT=3028 pnpm exec playwright test e2e/entrepreneurship-journey.spec.ts --grep 'interview guide overlay' --project=chromium --workers=1 --output=test-results/polish-business-overlay-final --reporter=line
```

This test creates its own disposable account, exploration, published long-title guide and conversation, then cleans them automatically. Temporary screenshot-only tests were removed; the regression remains checked in.
