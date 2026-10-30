# Detail polish after the whole-app redesign

This follow-up addresses the owner's request to fix the existing interface: icon alignment, spacing, typography, wrapping and small control defects. It adds no feature or AI usage and changes no financial calculations, persistence, domain rules or user journeys. Work stays on `codex/whole-app-redesign`, based on completed redesign commit `5c198c5`; the original `Become` checkout remains untouched.

## What changed and why

### Shared presentation

- A decorative icon in a panel-heading action slot now remains beside its heading on phones. Actual groups of action buttons can still wrap.
- An explicitly disabled empty-state context no longer renders an empty wrapper or falls back to an unrelated default label. Finance can therefore show its actual empty-record message without a misleading “Transactions / All time” caption.

These are corrections to existing components, with no new visual treatment.

### Direction, ideas and decisions

- Seven ordinary dialog triggers were bypassing the existing shared Button. Their SVGs rendered above their text. They now use the existing primary, secondary or quiet button treatment, preserving the same dialogs and actions.
- Legacy field selectors no longer restyle the actual shared Input, Textarea and NativeSelect. Date fields and notes regain the consistent underline, padding and focus treatment.
- A filter select no longer extends below its own frame; its chevron stays centered. Search wrappers no longer double-frame the existing input.
- Goal rows have proper horizontal breathing room. Editors and record pages use the same full-width outer gutters as their navigation, while prose retains its own readable line length.
- Idea actions wrap with room for their introductory text. Linked-record arrows retain their width beside long titles.
- A duplicate divider and accumulated padding before the decision submit action are removed when the supporting-fields section already supplies the separator.
- Two stale goal hints now describe the existing simple-goal workflow, without promising the removed goal-evidence setup.

Representative before/after images are in [the Direction evidence folder](screenshots/polish-direction/).

### Other domains

- [Finance and Settings](POLISH_FINANCE.md): reserve-action spacing, recurring-panel spacing and narrow title wrapping, neutral transaction metadata, visible provider labels and aligned model fields, category/counterparty controls, accurate empty-state captions.
- [Entrepreneurship](POLISH_ENTREPRENEURSHIP.md): navigation-launcher clearance, trailing guide arrows, readable filter labels, sidebar widths, panel rhythm, conversation headers/composer, expanded setup fields, and the mobile interview-guide drawer layer.
- [Engineering, Content, activity and Reviews](POLISH_CREATIVE_REVIEWS.md): inline evidence actions, distinct project filters, aligned native-select chevrons, mobile title/status spacing and form-footer rhythm. Content release handles and results also wrap safely at narrow widths. Other inspected session, custom-domain and Review layouts retained their current composition.

## Coverage and validation

The audit uses the existing [product route inventory](ROUTE_COVERAGE.md). Agents split Finance/Settings, Entrepreneurship, and Engineering/Content/activity/Reviews; the primary agent handled Direction and shared controls. Rendered inspection uses disposable local accounts with real saved records and deliberately long labels. Only test-account records are created and removed; no paid model requests run.

Coverage includes empty and populated lists, detail pages, create/edit forms, expanded optional fields, dialogs, drawers, filter/search states and long text. Primary widths are 1440px and 390px, with critical flows also checked at 320px and intermediate widths. Historical candidate routes are reference fixtures. Owner-only Image Direction settings were source-inspected without granting a disposable account owner access. The protected dashboard and Season onboarding are checked for regressions, not redesigned. Coverage is representative of the route families and states; it does not imply every possible user record or error condition was individually rendered.

- **399 unit tests passed** across 80 files. The existing 164 gated/integration tests in 17 files remained skipped; they are not counted as passing.
- **14 combined Chromium regression tests passed** in 30.2 seconds: Direction, simple multi-domain goal persistence, failed/retried lifecycle operations, hidden-field validation, authentication layout, Personal and Nexo Settings persistence, shared navigation, dialogs, keyboard focus, and protected dashboard/Season entry.
- The Direction detail audit within that run covers **13 routes × 4 widths (52 visits)** and **8 dialogs × 3 widths (24 opening/closing/focus checks)**. It checks control geometry and captures the rendered states.
- Finance/Settings: **48 route-width views, 12 editors, 3 Nexo advanced states and 9 dialogs**, passed in 47.7 seconds. The final 320px recurring-row check passed in 3.0 seconds.
- Engineering/Content/activity/Reviews: final rebuilt audit **passed in 42.8 seconds**, with 73 captures and geometry, overflow, long-text, drawer and finale interaction checks.
- Entrepreneurship: 15 populated surfaces and two forms at desktop/phone, plus targeted 320/768/1024px checks, **passed in 11.5 seconds**. The permanent drawer regression also **passed in 10.5 seconds**, covering 320/390/900px overlays, desktop presentation, hit testing, scroll locking, dismissal and keyboard focus.
- An independent agent reviewed the shared and Direction changes and found no actionable regression. Source diffs confirm the approved dashboard and Season onboarding are untouched.

The final optimized production build, whole-application TypeScript, repository ESLint (zero warnings), and diff whitespace checks all passed. No schema, dependency or provider configuration changes were needed.

## Review and rollback

Preview: [Open the local app](http://localhost:3028/sign-in). This is a local preview on the redesign branch, not a deployment. The changes remain isolated from the original checkout. `5c198c5` is the exact pre-polish reference for comparing this pass.
