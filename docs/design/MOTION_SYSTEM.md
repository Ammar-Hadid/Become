# Become motion infrastructure

Motion is progressive enhancement. Saving, navigation, focus, timer state and recovery must follow confirmed application state without waiting for animation. This document records shared implementation contracts; frontend composition and choreography follow the product owner's designs.

## Tokens and ownership

`src/app/styles/tokens.css` is the numeric source of truth for visual motion. JavaScript lifecycle fallbacks read computed CSS custom properties through `motion-time.util.ts`; do not maintain a second duration table. Reuse shared tokens rather than introducing feature-specific timing or easing systems.

## Approved visual language

The product owner selected **Precision Light** for controls, surfaces, and layer feedback, with **Living Light** for progress changes. Controls respond in 150ms; surface arrivals use 300ms and 8px of travel. Hover adds a short lift and a localized glow. Pressing returns the control to a compact scale. The brighter 420ms treatment belongs only to a progress fill when its value changes; it does not turn the whole surface into a long animation. Static progress remains still. An active timer may carry a restrained breathing signal; idle content does not pulse.

The semantic controls for duration, easing, travel, glow, pressed scale, live cycle, and progress glint are grouped in the **Approved motion treatment** section of `src/app/styles/tokens.css`. Domain-owned components pass their accent into those effects; the shared Become shell uses gold. Keep the approved time-picker scrolling and desktop-navigation scrolling mechanics unchanged.

Use the shared `ProgressIndicator` for the three approved progress treatments: Plasma Core, Season Ticks, and Segmented Halo. Their appearance is controlled by the progress tokens; their segment counts live in the nearby config file. The area prop selects a domain accent, and an owning surface can override `--progress-accent`. See `docs/design/PROGRESS_SYSTEM.md` for use and data rules. Value changes animate, while resting indicators do not loop.

Use the shared `LoadingIndicator` for the three approved indeterminate treatments: Orbit Arc, Edge Trace, and Eclipse. Its variants and domain accents are controlled in `tokens.css`; see `docs/design/LOADING_SYSTEM.md` for contexts and state rules. A loader loops only while the owning operation is pending and stops immediately when that state ends.

C.O.T.S. speech uses the approved Terminal Prompt treatment through the shared `AiTypingText` component. The visible text starts only when its owning surface intersects the viewport, pauses when it leaves view, and reveals the full message immediately under reduced motion. The shared text and timing rules are documented in `docs/design/TYPING_SYSTEM.md`.

AI-prepared prose may use the owner-approved `AiTextFrame` decorative reading border. Its eight-second highlight loops only while visible in the foreground tab, with a pause/play control and static reduced-motion treatment. This explicit reading treatment does not indicate generation or progress, and its text is available immediately. See [AI_TEXT_FRAME.md](AI_TEXT_FRAME.md).

The comparison's Reduce motion switch was off for the approved visual treatment. Production continues to honor the device's `prefers-reduced-motion` setting: remove movement, pulses, and sequencing while keeping state changes, focus indication, and progress values immediate and clear.

Network polling, leases, debounce, retries and reading cadence use semantic constants owned by their workflows, independently of visual motion tokens. New typography treatments follow the shared candidate approval workflow; the owner can edit approved values in `tokens.css`.

## State correctness

Owner-approved primary-button confirmation uses shared `Button.feedback`: the fill turns semantic green, the original icon hands off to Check, and overlapping labels preserve width through Precision Light control timing. Reduced motion switches immediately. Confirmed state and announcements never wait for the transition. Features own operation confirmation and hold/reset timing; image prompt copying uses a two-second hold. See [BUTTON_FEEDBACK.md](BUTTON_FEEDBACK.md).

- Pending, failed, cancelled and confirmed states reflect the underlying operation. Loading indicators stop when work completes, fails, is cancelled or is removed.
- Record effects use confirmed stable IDs rather than titles or list positions. Failed mutations must not imply successful arrival.
- Motion must not imply that an offer, transfer, receivable or pending amount is settled revenue.
- State changes remain understandable without animation or color alone.

## Shared lifecycle contract

Authored layers that animate out use `usePresence`.

- Opening mounts synchronously so focus can move in the opening commit.
- Closing content remains mounted only for its explicit exit state.
- The exiting root is `inert`, pointer-disabled, and hidden from accessibility.
- `animationend` completes the exit by state and target. Animation names have no
  semantic role.
- A fallback is computed from the canonical CSS token. Reopening cancels the
  prior fallback and returns the same mounted layer to `open` safely.
- If reduced motion becomes active during an exit, cleanup completes
  immediately.

Non-native modal surfaces use `useModalLayer`.

- Modal layers form a stack. Only the top layer handles Escape and traps Tab.
- Nested layers share a reference-counted document scroll lock.
- Closing restores focus to the connected element that owned the layer, or the
  explicit return target.
- Modal state ends immediately; an inert visual copy may finish exiting without
  retaining focus or interaction.

`RecordDialog` retains native `<dialog>` modality, cancel behavior, and focus
semantics. Its visual close has explicit completion, a token-derived fallback,
and cancellation-safe state rather than checking an animation name.
It also joins the shared modal stack so nested dialogs and drawers agree on
Escape handling, scroll locking, and focus restoration.

## React View Transition infrastructure

Use the installed React/Next foundation. Add a dependency only for a documented capability the existing foundation cannot provide. Transitions remain optional; the application works without browser View Transition support.

React coordinates platform transitions. Do not also call `document.startViewTransition()` around the same update. Named transitions use stable IDs; unrelated updates must not animate them. React transitions activate through navigation, Suspense and React Transitions. Ordinary immediate `setState` does not become a View Transition merely because it is wrapped.

Existing transition classes are implementation details, not required visual recipes for new screens.

## Reduced motion and accessibility

The owner-approved **Gold Drift** backdrop uses shared `AmbientLight` and `--ambient-light-*` tokens across Season preparation, imagery and activation. Two low-strength gold fields move diagonally across the viewport while visible, remain behind content, and freeze on pause or hidden/offscreen pages. Reduced motion produces a static backdrop. Keep the instance and its pause state across phase changes; decorative motion never indicates operation progress. See [AMBIENT_LIGHT.md](AMBIENT_LIGHT.md).

Under `prefers-reduced-motion: reduce`, authored animations, transitions, spatial movement, scaling, sequencing, loops, smooth scrolling and View Transition animation are disabled. Functionality, current state, focus, announcements, scroll locking, operation timing and lifecycle cleanup remain correct and immediate.

Focus indicators appear immediately. Motion is never the only state signal. Avoid flashing that violates accessibility requirements.

## Verification

For affected interactions, verify keyboard and touch behavior, responsive access, rapid reopening, cancelled animation, nested layers, focus restoration, changing reduced-motion preferences and fallback without View Transition support. Saving and useful follow-up actions must remain immediately available.

Existing `e2e/motion-system.spec.ts` and `e2e/shared-motion-regression.spec.ts` cover layer cleanup, Escape order, scroll locking, focus restoration, cancellation, confirmed record identity and shared controls. Their historical screenshots and visual assertions describe the implementation tested, not the new design requirements.


## AI prose and C.O.T.S. speech

The owner approved **Living Ink** on 11 October 2026 for longer AI-generated text and paragraphs. Shared `AiGeneratedText` reveals one paragraph at a time; words emerge through a primary-gold glow trail and settle into normal readable prose. Use its shared `--ai-generated-text-*` tokens. Pause/resume preserves progress, offscreen paragraphs and hidden tabs pause, and reduced motion immediately shows full text. This reveals already-prepared text, without delaying actions or implying pending generation. `AiTypingText` / Terminal Prompt is exclusively for C.O.T.S. speech. See [AI_GENERATED_TEXT.md](AI_GENERATED_TEXT.md) and [TYPING_SYSTEM.md](TYPING_SYSTEM.md).
