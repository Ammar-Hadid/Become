# Become spacing system

The product owner approved one primitive scale with three semantic page rhythms. Edit the values in the **Spacing** and **Approved page spacing contexts** sections of `src/app/styles/tokens.css`; do not scatter repeated page-density values through feature CSS.

| Context           | Use when                                                                             | Semantic tokens                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Overview          | A dashboard or visual summary needs a focal point and grouped widgets.               | `--space-overview-section`, `--space-overview-grid`, `--space-overview-panel`                                              |
| Dense information | Tables, finance data, filters, and comparison surfaces need more facts per viewport. | `--space-dense-section`, `--space-dense-grid`, `--space-dense-panel`, `--space-dense-row`                                  |
| Action            | A user is entering information or completing a focused task.                         | `--space-action-section`, `--space-action-panel`, `--space-action-field`, `--space-action-label`, `--space-action-actions` |

All three use `--space-page-edge` on desktop and `--space-page-edge-mobile` on mobile. Outside the dashboard, the app shell sets the desktop edge to `--space-app-page-gutter`, which follows the collapsed navigation launcher's size. The dashboard retains its own edge. The context roles reference the shared `--spacing-*` ladder, so changing a primitive can update multiple contexts. Change a semantic role when only one rhythm should move.

These tokens define spacing, not page composition. Apply the approved rhythm that fits the current task rather than using dense spacing merely to squeeze in controls. Page composition follows the product owner's current design.

Non-dashboard page content fills the available page width inside equal left/right gutters; do not add a narrower outer max-width. Ritual routes outside AppShell use `--space-app-page-gutter` directly on desktop and `--space-page-edge-mobile` on phones. Settings and Season onboarding follow this rule. Individual reading blocks can retain their own copy width.
