# Primary button confirmation — approved

The owner approved `/copy-button-success-candidate` on 12 October 2026. Shared `Button` now owns this presentation; the retained preview consumes the real implementation. Storybook **Foundation → Button → Success**, **Pending Feedback** and **Copy Feedback** demonstrate it. **Documentation → Approved Metadata → Button** exposes its typed contract.

Use the optional controlled `feedback` object on a labeled primary button. Supply `state` (`idle`, `pending`, `success`), the normal `label` and original `icon`; `pendingLabel` defaults to Working… and `successLabel` to Done. Copy actions use Copy prompt / Copying… / Copied. Without feedback, existing children, variants and native behavior remain unchanged. Other button variants ignore this primary-only feedback treatment.

Success transitions the primary fill to semantic green and the original icon to Check. Labels overlap in one reserved grid cell to preserve width; icons share one fixed slot. Precision Light duration/easing and the approved two-pixel travel govern the handoff. Reduced motion changes color, label and icon immediately. Approved visual values live under `--button-success-*` and `--button-feedback-travel` in tokens.css.

The caller owns the action, confirmation, pending guard, errors and reset. Button owns no clipboard calls, timers, promises, live-region text or saving. Success must follow a resolved operation, never a click alone. Provide a polite atomic status region and actionable failure text. Icons and reserved label copies are hidden from assistive technology; the button exposes its current accessible label and busy state. Preserve native keyboard focus during pending work.

Image prompt copying uses `usePromptClipboard` in the image-direction feature. It copies the entire current prompt regardless of Living Ink reveal progress, confirms success for two seconds, restarts that hold after repeat success, clears stale feedback when the prompt/view changes, guards duplicate pending requests and clears timers on unmount. Missing clipboard or rejection returns to normal primary presentation with manual-copy/retry feedback. The timer is workflow timing, separate from animation. All manual-imagery banner, portrait and chapter prompt drawers use it.

This approval covers primary-button feedback only. It does not approve the complete onboarding, manual imagery, Settings or activation candidates. Research is recorded in [COPY_BUTTON_SUCCESS.md](../research/COPY_BUTTON_SUCCESS.md).
