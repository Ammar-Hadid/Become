# Copy button success candidate

Researched 12 October 2026. Scope: evidence for an isolated copy-success candidate; this note does not approve or change the shared button treatment.

## Primary evidence

- [Mantine CopyButton](https://mantine.dev/core/copy-button/) demonstrates a changed success label and teal color, plus an icon-only example switching Copy to Check and its tooltip from Copy to Copied with an explicit `timeout={2000}`. Its documentation and current source disagree about default durations, so the example's explicit two seconds is the useful reference. [Mantine useClipboard source](https://github.com/mantinedev/mantine/blob/master/packages/@mantine/hooks/src/use-clipboard/use-clipboard.ts) sets success only after `writeText` resolves, records rejection as an error, restarts the reset timer after success and clears timers on unmount. Caveat: its rejection handler does not itself clear an earlier copied state.
- [GitHub Primer ClipboardCopy example and source](https://primer.style/view-components/lookbook/inspect/primer/beta/clipboard_copy/element/) swaps the copy icon for a check using semantic `color-fg-success`, then restores Copy after 2,000 ms. Repeated success clears/restarts the timer. Its screen-reader-only feedback region is polite and atomic, announcing Copied; icons are hidden from assistive technology. [GitHub clipboard-copy-element source](https://github.com/github/clipboard-copy-element/blob/main/src/clipboard-copy-element.ts) dispatches the event driving that feedback only after awaiting the copy operation. These are direct implementation patterns, not evidence that green is mandatory or that two seconds is universally optimal.
- [PatternFly clipboard-copy accessibility](https://www.patternfly.org/components/clipboard-copy/accessibility/) requires success feedback in the copy tooltip, accessible names for icon-only controls, and normal Tab, Enter and Space interaction. It recommends contextual names when multiple copy controls appear and cautions against tooltip exit delays too short to read. It supports local feedback without a separate modal, but does not establish a specific icon animation or universal duration.

## Accessibility and truthful feedback

[W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) identifies `role="status"` as a sufficient technique for announcing success/results without moving focus. Use visible Copied text and a polite status announcement as well as the check and semantic success color; color alone must not carry the result. Keep the native button keyboard-operable and preserve focus.

[W3C interaction-animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) documents `prefers-reduced-motion` for preventing nonessential motion. Its definition distinguishes movement/size transitions from simple color/opacity changes. For Become, follow the stricter local motion contract: reduced motion changes the success icon, label and color immediately, retaining the confirmation and reset behavior.

## Become recommendation

Reuse the real shared primary button in `/copy-button-success-candidate`. Keep its geometry and focus treatment. On a resolved clipboard write, show Check, Copied and semantic success green for 2,000 ms, then restore the original Copy label/icon. Use shared Precision Light timing for an optional restrained transition; state and announcement must not wait for animation. The two-second hold is a candidate behavior value supported by examples, not an accessibility threshold.

Maintain a mounted polite status region so assistive technology receives the outcome; do not rely only on an accessible-name change or tooltip. Repeated successful copies restart the hold, with at most one timer per button. Clear timers on unmount and discard stale async results after the content changes or a newer attempt starts.

When clipboard access is unavailable or rejected, clear any previous success state and announce an actionable failure such as Copy failed. Select and copy the text manually. Never show Copied on click alone. Keep failures available long enough to read and retain retry/manual-copy access. Copy success means text reached the clipboard; it does not imply an image package was used externally, generated, saved or approved.

## Candidate verification

Verify desktop/phone geometry, keyboard activation/focus, the actual copied value, success/reset timing, repeated-copy timer reset, denied clipboard access, unavailable clipboard, content changes during an outstanding write and unmount cleanup. Check that success/failure is announced without focus movement and that reduced motion retains immediate, complete feedback. Promotion remains subject to the repository's explicit candidate approval workflow.
