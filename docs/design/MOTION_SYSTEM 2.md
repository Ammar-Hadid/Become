# Become motion system

Motion in Become communicates continuity, causality, and progress. It is not decoration. The interface should feel responsive and alive without turning routine work into spectacle.

## Principles

1. **Preserve the user’s anchor.** Keep stable headings, controls, timeline rails, and dialog context in place while the changed content moves.
2. **Show cause and effect locally.** Animate the smallest region that explains the result of an action. Do not replay an entire page because one value changed.
3. **Match expression to meaning.** Routine controls use restrained utility motion. Earned accomplishments may use stronger motion, but only when the underlying state is confirmed.
4. **Truth before theatre.** Finance and other trust-sensitive surfaces favor precise recomposition, direct value changes, and calm confirmation.
5. **Never delay the action.** Navigation, focus, validation, and server work start immediately. Motion follows state; it does not gate state.
6. **Progressive enhancement.** Every interaction remains understandable and complete without animation or View Transition support.

## Vocabulary and intensity

Every authored motion maps to one semantic intent. The intent describes why an
element moves; intensity describes how much expression the context allows.

| Intent      | Meaning                                                  |
| ----------- | -------------------------------------------------------- |
| **Respond** | Acknowledge direct input without delaying the action     |
| **Reveal**  | Introduce or remove local content or a layer              |
| **Carry**   | Preserve the identity of an object across related views  |
| **Recompose** | Update a bounded data region while its anchors stay put |
| **Resolve** | Settle an active or optimistic state into confirmed truth|
| **Mark**    | Recognize a meaningful, confirmed result once            |

These intents are the approved vocabulary. Recipes and domain character choose
among them; features do not create parallel motion semantics.

| Level | Vocabulary           | Purpose                                      | Typical examples                                                         |
| ----- | -------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| 0     | Static / immediate   | Avoid motion where it adds no understanding  | text changes, validation copy, dense table cells, keyboard focus         |
| 1     | Utility              | Confirm direct manipulation                  | press feedback, menu presence, short disclosure, inline status           |
| 2     | Spatial / continuity | Explain where a layer or selection came from | dialogs, drawers, mobile navigation, tab indicator, local list insertion |
| 3     | Expressive / earned  | Mark meaningful confirmed progress           | milestone, completed goal, evidence-producing accomplishment             |

Level 3 is a budget, not a default. Most sessions should contain no expressive motion.

## Tokens

The CSS source of truth is `src/app/styles/tokens.css`; TypeScript timing values live in `src/components/ui/motion/constants/motion.constants.ts` for lifecycle coordination.

| Token                  |                           Value | Use                               |
| ---------------------- | ------------------------------: | --------------------------------- |
| `--duration-feedback`  |                            90ms | press, exit, tiny acknowledgement |
| `--duration-fast`      |                           140ms | menus, compact controls           |
| `--duration-standard`  |                           180ms | data and state recomposition      |
| `--duration-spatial`   |                           240ms | sheets, drawers, disclosures      |
| `--duration-emphasis`  |                           360ms | earned local completion           |
| `--duration-signature` |                           650ms | rare signature sequence ceiling   |
| `--ease-enter`         | `cubic-bezier(0.16, 1, 0.3, 1)` | arriving content and layers       |
| `--ease-exit`          |    `cubic-bezier(0.4, 0, 1, 1)` | short departures                  |
| `--ease-move`          |    `cubic-bezier(0.2, 0, 0, 1)` | repositioning and continuity      |

Use these values rather than local timing literals. A one-off value is justified only when the interaction cannot be expressed by this scale.

Springs are not part of the base system. Introduce a spring only for a direct-manipulation interaction whose velocity materially improves comprehension, and only after native CSS or View Transitions prove insufficient.

## Interaction recipes

- **Menus and popovers:** 140ms or less, 4px maximum travel, no bounce. Keep content present for its exit and unavailable to pointer and accessibility interaction while closed.
- **Dialogs and sheets:** backdrop opacity plus one spatial axis. Trap focus immediately, close on Escape, lock background scroll, and restore focus after exit.
- **Disclosures:** animate the content region while its summary and surrounding structural anchor remain stable. Do not stagger children.
- **Navigation and tabs:** move the selection guide when the destination shares context. Avoid whole-page fades as the default.
- **Data changes:** acknowledge the control immediately, keep labels and axes stable, and recompose only the changing data region. Do not count every number from zero.
- **Charts:** first paint is static. Animate only a user-requested change, and prefer a controlled crossfade or geometry interpolation to decorative drawing.
- **Creation and insertion:** reveal the confirmed object near its destination. A short trace along an existing rail is appropriate when the layout already establishes that path.
- **Deletion:** use immediate acknowledgement followed by a short collapse only after confirmation. Never make destructive work feel playful.
- **Loading:** preserve geometry. Prefer local pending state, skeleton continuity, or subtle opacity over spinners and looping shimmer.
- **Success, warning, and error:** keep copy readable immediately. Success may settle once; warnings and errors should not shake, flash, or pulse repeatedly.
- **Timers:** the running timer is the ambient signal. Completion gets one confirmed settle before the refreshed record becomes authoritative.
- **Hover, focus, and press:** color, border, shadow, or very small opacity changes. Never bounce ordinary controls. Focus indication stays immediate.

## Signature ideas

Become’s recognizable motion should come from a small family of relationships:

- **The guide:** a persistent selection or timeline marker moves to preserve direction across related states.
- **The trace:** newly confirmed evidence briefly resolves along an existing chronology or progress path.
- **The settle:** an optimistic or active state contracts into a calm, confirmed state once server truth arrives.

These are compositional ideas, not universal animations. A surface should use them only when its information architecture already provides the guide, path, or state transition.

## Domain character

- **Shared shell:** restrained spatial continuity and immediate focus behavior.
- **Engineering:** may use the guide, trace, and settle for evidence, projects, reviews, and meaningful completion. Routine CRUD remains quiet.
- **Finance:** defaults to levels 0–2. Motion clarifies changing periods, data, disclosure, and confirmed transactions; it must never imply certainty the data does not have.
- **Future domains:** use the same vocabulary with a domain-appropriate intensity budget. New visual languages may vary composition, not invent unrelated timing and easing systems.

Entrepreneurship, YouTube, and other unfinished domain mockups are not motion-design evidence and receive no feature-specific motion during the current rollout. They may inherit shared shell behavior.

## Technical contract

- Prefer CSS transitions and keyframes for local component state.
- Use React View Transitions only for real continuity between related rendered states. Keep names unique and stable, and set an explicit fallback/default behavior.
- Use `usePresence` for authored overlays that need an exit lifecycle. Entry must mount synchronously so focus can transfer in the opening commit.
- Use `useModalLayer` for non-native modal layers. Native Finance dialogs retain native modal and focus behavior.
- Keep motion ownership with the component or feature stylesheet. Only tokens, reduced-motion policy, and genuinely cross-cutting View Transition classes belong in global styles.
- Do not turn a server component into a client component only to animate a broad page. Isolate the smallest interactive boundary.
- Do not add an animation dependency until a shipped interaction requires capabilities that CSS, the platform, and React View Transitions cannot provide.

## Accessibility

`prefers-reduced-motion: reduce` reduces authored animation and transition durations to effectively immediate and disables View Transition animation. The final state, focus order, announcements, and operation timing must not depend on animation events alone; presence helpers include a fallback lifecycle.

Do not use motion as the only signal. Avoid flashing, large parallax, autoplaying movement, and repeated peripheral animation. Preserve focus on open/close and keep hidden exiting layers out of interaction.

## Performance constraints

- Animate `transform` and `opacity` by default.
- Layout animation is allowed only for small, bounded disclosures or insertions; never animate page-scale height or continuously measure layout.
- Avoid simultaneous animation of large blurred backdrops, shadows, and charts.
- Keep one ambient loop at most in the visible product shell. Pause or remove loops that do not communicate live state.
- A normal interaction should finish within 240ms. Expressive sequences must remain under the 650ms signature ceiling and must not block the next action.

## Rules for future work

Before adding motion, answer:

1. What relationship or state change does this clarify?
2. What remains anchored?
3. What is the lowest sufficient intensity?
4. Does the domain’s trust level allow that intensity?
5. What is the reduced-motion result?
6. Can the implementation stay local and avoid a broader client boundary?

Reuse an existing recipe and token first. New recurring behavior belongs in this document and the shared foundation; feature-specific exceptions stay with their feature. Verify keyboard, touch, reduced-motion, and narrow-width behavior.

Never add generic page fade-ups, arbitrary stagger, routine bounce, scroll-driven decoration, number slot machines, ornamental chart drawing, success confetti, or motion that masks latency.

## Current rollout

The first implementation establishes:

- shared timing/easing tokens and reduced-motion policy;
- reusable presence and modal-layer behavior;
- tactile shared controls plus menu, mobile navigation, dialog, and
  session-drawer lifecycles;
- shell, Home, Engineering, and Finance selection guides;
- Engineering period recomposition, project identity carry, evidence
  disclosure, and confirmed evidence trace;
- Finance navigation, user-requested data recomposition, confirmed progress,
  and transaction-safe disclosure affordances;
- local pending states for Engineering and Finance forms;
- Settings content continuity;
- timer completion settle and resolved-session acknowledgement.

Expand only after these interactions have been used and tuned in the product.
