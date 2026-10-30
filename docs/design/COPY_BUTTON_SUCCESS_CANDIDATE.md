# Primary button success feedback — approved

The owner approved `/copy-button-success-candidate` on 12 October 2026. The retained review route now renders the shared primary Button feedback treatment. Shared implementation, Storybook, typed metadata and prompt-drawer copying use the approved version; see [BUTTON_FEEDBACK.md](BUTTON_FEEDBACK.md).

## Approved treatment

After a confirmed clipboard write, the primary gold fill transitions to semantic success green. Copy crossfades to Check with a restrained two-pixel vertical handoff, using existing Precision Light control duration/easing. The label becomes **Copied**. The button keeps its width, height, focus ring and native keyboard behavior. No sound, confetti, looping effect or toast is introduced.

The owning copy workflow holds confirmation for two seconds, then restores Copy prompt. Repeat success restarts one timer. That hold is an operation-feedback setting, not a motion duration. Clipboard rejection or missing clipboard access clears prior success and provides retry/manual selection without moving focus. Pending requests are guarded against duplicate clicks. Text changes and unmounts invalidate outstanding feedback and clear its timer.

Color, label and icon reflect confirmed state immediately; animation is presentation only. A mounted polite atomic status region announces the outcome. Reduced motion removes transitions and icon travel without altering copying, the success hold or reset.

## Research

[COPY_BUTTON_SUCCESS.md](../research/COPY_BUTTON_SUCCESS.md) records the primary evidence from Mantine, GitHub Primer, PatternFly and W3C. Copy/check feedback, visible confirmation and a two-second hold follow established examples; the precise green-fill and icon handoff are the Become proposal requiring approval.

## Admission after approval

Explicit approval has been received and the treatment is promoted. Clipboard execution, copied text, timing, errors and announcements remain feature-owned. This does not approve the broader manual imagery, Settings or onboarding candidates.

## Verification

Eight desktop Chromium/phone WebKit browser checks passed across targeted runs: confirmed state, icon/color change, stable geometry and keyboard focus, complete copied value, two-second reset and repeated success, rejection/retry, unavailable clipboard, duplicate pending clicks, changed text during an outstanding write, and reduced motion. Clipboard permissions are mocked in automated cases; separate screenshots exercised actual clipboard writes in WebKit and permission-enabled Chromium. Browser plugin not available; used repository Playwright. Typecheck, targeted lint and whitespace checks passed. Desktop/phone screenshots were inspected; no horizontal overflow was found.

After promotion, fourteen affected desktop/phone browser checks passed against the shared Button and prompt drawers. Storybook Success, interactive Copy Feedback and typed Button metadata rendered correctly at desktop and phone widths without runtime errors. Storybook was restarted on port 6006. Typecheck and targeted lint passed.
