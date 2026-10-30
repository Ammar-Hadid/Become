# Become form presentation

The product owner approved two form presentations. Choose by the amount and structure of work the user must complete, not by a rigid field count.

| Task                                                                                     | Approved presentation  |
| ---------------------------------------------------------------------------------------- | ---------------------- |
| Short, focused entry that can be completed in one compact working context                | Focused form workspace |
| Longer task with several meaningful sections, supporting context, or substantial writing | Dedicated form page    |

## Short forms: focused workspace

Opening a short form moves the active task forward while its surrounding overview becomes quieter. The form uses the approved elevated glass material. Keep the underlying context recognizable without leaving it interactive. The user can close the form and return to the overview. Use shared field, button, selection and icon components rather than creating domain-specific substitutes.

The short-form dimensions, blur, accent strength and observation treatment are in the **Approved short-form operating mode** section of `src/app/styles/tokens.css`. Entry motion uses the shared motion tokens and yields to reduced-motion preferences. Focus, closing and saving never wait for motion.

## Long forms: dedicated page

Give a longer form its own page. Group related fields into named sections with brief descriptions. On desktop, the approved composition has a section index on the left, the form in the main column, and a concise working brief on the right when that brief helps the task. Fields may share a row when both remain easy to scan; substantial writing spans the form width. On mobile, use one field column and a horizontal, scrollable section index. The section index and progress indicator reflect the section currently in view.

The **Approved long-form dedicated page** tokens control page width, rail width, insets, section spacing, progress marks, and accent strength. The page uses the approved graphite foundation and shared surface materials. Do not use the long focused-workspace comparison as a production pattern.

Both presentations take their accent from the current domain's color tokens. Dashboard and Direction use Become gold. Domain accents highlight the active task, progress, controls and section cues without recoloring the entire application shell.

## Approved single-line input

`src/components/ui/forms/input.component.tsx` now owns the approved underline treatment, replacing the former boxed shared input. Use `variant="featured"` for defining entries such as Season character selection and `variant="body"` (the default) for regular forms, settings, credentials, numbers and search. Featured has larger text and an uppercase tracked label. Body keeps normal form text, label and control height; its phone text is at least 16px.

Supply `label` for the integrated field, or an external associated label/`aria-label` when composing existing form layouts. Optional `help` and `error` use the shared helpers and associated descriptions. Native props, refs, value editing, validation, save semantics and private credential handling remain feature-owned. Disabled and read-only are different states; read-only keeps selectable text with a dashed underline. File, hidden and selection inputs retain their specialized controls.

Edit approved input sizes, spacing and typography in the `--input-*` section of `src/app/styles/tokens.css`. Do not redraw the input in feature CSS. Storybook **Forms → Input** contains both variants, their empty/filled/focused/invalid/read-only/disabled states, native types and form examples. **Documentation → Approved Metadata → Input** exposes the typed `ComponentMeta` record. The retained `/underline-input-candidate` route now demonstrates the actual shared implementation; the candidate component and duplicate styling were removed after owner approval.

Season character entry uses the approved card-free composition: a moderately sized two-line question, brief supporting text, Featured fields and equal-width shared actions in a left-aligned entry occupying 60% of available desktop content width. At phone widths (720px and below), the entry fills the available width. Its field text uses the smaller `--season-entry-field-size` override while shared Input variants retain their defaults. `type-season-entry-title` and `type-season-entry-description` use the approved `--text-season-entry-*` tokens. The header keeps the Season label and save status while the entry supplies the visible main heading. The workspace restores its own heading after an identity is selected. On phones the actions stack at full width; short laptop screens use a tighter rhythm to keep lookup actions visible. Lookup, confirmation, manual authoring, save and exit stay feature-owned.

The demonstration fields, copy and example actions are illustrative. Domain-owned forms retain their actual schemas, validation, submission, unsaved-change protection, recovery, and authorization behavior when these presentations are applied. Implement each real form in its owning feature and use the shared UI primitives. Do not infer a data or navigation contract from the preview.

## Approved multiline textarea

The owner approved the underline textarea at `/underline-textarea-candidate`, including the final removal of its resize grip. `src/components/ui/forms/textarea.component.tsx` now owns this treatment and replaces the previous boxed shared textarea. The retained preview uses the real shared component rather than a separate candidate implementation. This approval covers the textarea only; the guided Season onboarding candidate remains pending approval.

Use `variant="featured"` for substantial defining entries such as Season visual direction and `variant="body"` (the default) for Settings intent, dashboard questions, notes and corrections. Typography, labels, underline, caret and focus reuse the approved Input values. Enter inserts line breaks. The area grows with content up to `--textarea-max-height`, then scrolls internally. Manual resizing is disabled in every state. Reduced motion removes the underline transition immediately.

Existing `size="sm" | "md" | "lg"` callers remain supported: their minimum writing space is 3, 5 or 7 lines, configured in `src/components/ui/forms/textarea.config.ts`. An explicit native `rows` value takes precedence. Shared CSS lives in `textarea.css`; feature CSS must not redraw the border, fill, radius, focus or resize behavior. On phones the Body font is at least 16px. Native content sizing is used in supporting browsers; others retain their native rows and internal scrolling.

Supply `label`, an external associated or enclosing label, or `aria-label`. Optional `help` and `error` are linked through `aria-describedby`; errors mark the control invalid. Read-only content is selectable with a dashed underline; disabled controls retain native behavior and approved opacity. Preserve existing values, refs, limits, change handlers, validation, save actions and form semantics. Do not replace the approved rich-text document editor with a plain textarea.

Storybook **Forms → Textarea** shows Body/Featured, empty/filled/focused/invalid/read-only/disabled states, minimum sizes, long content and an interactive paragraph form. **Documentation → Approved Metadata → Textarea** exposes the typed `ComponentMeta` contract aligned with the implementation.
