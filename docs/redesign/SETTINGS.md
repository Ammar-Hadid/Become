# Settings redesign

## Changes and rationale

Settings has one compact shared navigation rail and one clear page heading. Its full-width workspace uses the same glass panels, field geometry, buttons and spacing as the domain redesign. Owner-only Image Prompts navigation remains conditional on the existing authorization check.

Personal settings puts the profile form inside a quiet glass panel and uses the approved shared underline fields. Email changes still reveal the required current-password field. Reset, pending state, duplicate-email/error feedback, the unsaved-change guard and server-owned authorization remain intact. Confirmed saves receive the shared save cue; explicit rejection uses the existing blocked-action cue.

Application settings gives interface sound its own simple preference panel. The existing local preference and immediate mute behavior are unchanged.

Nexo is organized as a visible sequence:

1. **Connect a provider.** All four provider connection states remain visible. Choose one provider, then enter or replace its key. Only that provider’s entry form is shown at a time. Saving a key does not invoke AI.
2. **Choose your models.** Add or edit named profiles. Provider, name and model ID are immediate; reasoning, response detail, token limits, timeout and optional pricing remain under advanced model controls. Collapsed invalid controls still open for validation.
3. **Assign tasks.** Search or filter the task catalog, choose a task and select a model profile. Technical contract/version/path information stays available under Connection details. All existing active task IDs and assignments are retained.
4. **Set usage limits and save.** The daily run ceiling is clearly separated from model pricing. Saving applies the existing versioned configuration; no new model requests or automatic runs were added.

Image Prompts retains its current editable/saved-state contract. A concise heading sits above a real-Season preview context panel, followed by category navigation, the selected recipe editor and an explanation/approved-artwork reference panel. Intent and Prompt remain independently editable. Variables, Rules, document-icon draft saving, explicit publication and exact package inspection stay intact. No prompt resolver, image generation, onboarding or activation behavior is changed.

## Journeys and routes

| Route                       | Journey                                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/settings`                 | Existing redirect to Application; there is no extra settings hub step.                                                                                                                                           |
| `/settings/personal`        | Edit name/email → confirm password if changing email → save or reset → receive explicit result.                                                                                                                  |
| `/settings/application`     | Toggle interface sounds; the preference is stored on this device.                                                                                                                                                |
| `/settings/nexo`            | Connect desired provider → define a reusable model → assign tasks → choose daily ceiling → save. Revisit any step without losing other draft configuration.                                                      |
| `/settings/image-direction` | Choose recipe category and format/chapter/pace → inspect saved Intent/Prompt/Variables/Rules → edit and save a versioned draft → inspect with a real saved Season → publish deliberately for future generations. |

Finance settings and its category/counterparty pages are covered in `FINANCE.md`.

## Preservation

Provider credential encryption, server-only keys, provider/model validation, version conflict handling, task IDs, saved assignments, daily limit enforcement and model pricing inputs are unchanged. Image inspection remains a no-provider-call operation. Publishing does not replace approved artwork. No new AI workflow or associated cost was introduced.

## Validation

- Whole-app TypeScript check passed.
- ESLint passed for Settings and the four modified Nexo configuration components.
- Personal-settings action/service tests and Nexo schema/task-configuration tests: four files, 20 tests passed.
- Existing Settings browser expectations were updated for the single Profile and account heading and the already-supported Application navigation item.
- A populated Finance/Settings Chromium pass succeeded at 1440×1100 and 390×844, including Personal, Application, Finance settings and Nexo at both sizes, without horizontal document overflow or JavaScript page errors. Durable captures are in `docs/redesign/screenshots/settings-*.png`.
- Visual inspection corrected inherited Nexo native-select borders, the search icon/input spacing, and the mobile task-coverage bar position. The optimized-preview rerun passed, and the corrected phone captures were inspected.
- The full Personal settings browser journey passed: successful name/email persistence, current-password protection, duplicate-email rejection, unchanged saved data on failure, reset, dirty navigation, sign-in after email change, shared navigation, keyboard traversal, reduced motion, and no overflow at 320/768/1024/1440 widths. The test now follows the existing `/settings` → Application redirect, then selects Personal.
- Nexo’s browser journey passed: a Google profile with 8192-token output limit survives saving/reloading, an obsolete saved task assignment is retired, four active character/Season tasks remain assigned across repeated saves, and the daily limit persists. No provider call or AI charge was made.
- Together with the seven Finance behavior cases and responsive snapshot pass, all ten assigned Chromium cases passed after aligning outdated UI selectors. Owned browser-test ESLint passed.
- Owner-only Image Prompts remains subject to the existing access rule. Its browser inspection requires an authorized owner session and was not bypassed for disposable-user screenshots.
