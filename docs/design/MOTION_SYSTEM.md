# Become motion system

Motion in Become explains state, continuity, and cause. It follows confirmed
application state and never delays saving, navigation, focus, timer truth, or a
useful follow-up action.

## Research and decisions

This system is informed by public documentation. It is not presented as
hands-on testing of authenticated products.

- [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/)
  distinguishes frequent productive motion from rare expressive motion, maps
  entrance, movement, and exit to different easing curves, and relates duration
  to travel and element size.
- [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion)
  emphasizes continuity, purpose, and alternatives for people who reduce
  motion.
- [Fluent 2 motion](https://fluent2.microsoft.design/motion) treats motion as a
  way to expose relationships and changes, keeps top-level navigation calm, and
  recommends short, focused choreography.
- [Next.js View Transitions](https://nextjs.org/docs/app/guides/view-transitions)
  documents React View Transitions in the App Router, including shared elements,
  stable anchors, content crossfades, transition types, progressive fallback,
  and pointer-event behavior.
- [React ViewTransition](https://react.dev/reference/react/ViewTransition)
  defines the component contract. React coordinates the platform transition;
  product code must not call `document.startViewTransition()` around the same
  updates.

The durations, distances, and choreography below are Become product decisions.
They are not measurements copied from another product.

## Principles

1. Keep the user's anchor. Shells, headings, controls, timelines, filters, and
   collection scroll positions remain stable while the changed region moves.
2. Show cause and effect locally. Animate the control or record whose state
   changed, once.
3. Use direction only for a real spatial relationship, such as collection to
   detail or an adjacent drawer. Workspace changes use a ready-state crossfade.
4. Report truth before motion. Pending, failed, cancelled, review-ready, and
   confirmed states match the underlying operation.
5. Let work continue. Decorative animation never gates input, focus,
   navigation, persistence, timer state, or recovery.
6. Preserve geometry while loading. An active indicator exists only while work
   is pending and stops on completion, error, cancellation, or removal.
7. Treat reduced motion as a behavior contract. State, focus, announcements,
   and cleanup stay immediate when visual motion is disabled.

## Canonical contract

`src/app/styles/tokens.css` is the only numeric source of truth for visual
motion. JavaScript lifecycle fallbacks read its computed CSS custom properties
through `motion-time.util.ts`; they do not maintain a second duration table.

| Token                     |  Value | Purpose                                     |
| ------------------------- | -----: | ------------------------------------------- |
| `--duration-response`     |   90ms | Press and immediate acknowledgement         |
| `--duration-control`      |  150ms | Menus, toggles, and rapid detail swaps      |
| `--duration-content`      |  220ms | Disclosure, filtering, selection, insertion |
| `--duration-surface`      |  300ms | Dialogs, drawers, contextual panels         |
| `--duration-emphasis`     |  420ms | One confirmed meaningful completion         |
| `--duration-active-cycle` | 1400ms | Contained indicator while work is pending   |
| `--delay-sequence`        |   32ms | Maximum offset in a two-beat sequence       |

The easing curves are:

| Token             | Value                       | Use                               |
| ----------------- | --------------------------- | --------------------------------- |
| `--ease-enter`    | `cubic-bezier(0,0,.38,.9)`  | Content entering the view         |
| `--ease-move`     | `cubic-bezier(.2,0,.38,.9)` | Visible content changing position |
| `--ease-exit`     | `cubic-bezier(.2,0,1,.9)`   | Content leaving the view          |
| `--ease-emphasis` | `cubic-bezier(.4,.14,.3,1)` | Confirmed completion              |

Control travel is at most `--distance-control` (6px), content travel is
`--distance-content` (8px), and surface travel is at most
`--distance-surface` (24px). Dialog entry uses `--distance-dialog` (12px).
Authored scale never falls below `--scale-pressed` (`.985`).

Sequences use at most two beats with a 32ms offset. Do not stagger collection
rows, animate each search keystroke, or create a longer signature sequence from
visual duration tokens.

## Choreography

- **Controls:** color and border transitions use Control. Press transforms use
  Response. Focus indicators appear immediately and do not transition in.
- **Menus and popovers:** enter for 150ms from their trigger origin and exit for
  90ms. The trigger stays anchored.
- **Dialogs:** the surface enters for 300ms over a 220ms backdrop and exits for
  150ms. Native dialogs use the same visual contract without replacing platform
  modality.
- **Drawers and contextual panels:** enter from the adjacent edge over 300ms and
  exit over 220ms. A nonmodal inspector leaves its collection interactive.
- **Workspace navigation:** keep the shell stable, carry the active indicator,
  and crossfade ready destination content. Workspace peers do not slide.
- **Collection and detail:** preserve selection and scroll. Adjacent record
  details swap over 150ms. A supported full page transition may carry a stable
  record ID; unsupported browsers use the local fallback.
- **Filtering:** acknowledge the control immediately and recompose the bounded
  result region over 220ms. Rows do not stagger.
- **Disclosure:** keep the trigger in place and animate only the revealed
  context over 220ms.
- **Creation, correction, withdrawal, and removal:** preserve the operation's
  meaning. A confirmed arriving record is identified by ID and receives one
  local 420ms treatment.
- **Loading:** retain stable geometry. The 1400ms loop is reserved for a visible,
  currently pending operation.
- **Nexo:** acknowledge generation immediately, distinguish pending, error, and
  review-ready states, reveal the proposal as a review surface, and mark
  acceptance once. Do not use typewriter output, fake percentages, or an
  ambient loop after work stops.

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

## React View Transition contract

Use the installed React/Next foundation and no feature-specific transition
library. A transition remains an enhancement; the application must work when
the browser lacks View Transition support.

- `motion-guide` carries an active indicator while the surrounding shell stays
  fixed.
- `motion-data-recompose` crossfades a bounded result or analytics region.
- `motion-workspace-content` crossfades ready peer-workspace content.
- `motion-carry` preserves the identity of a supported record across a genuine
  collection/detail relationship.
- `motion-shell` explicitly anchors persistent shell content.
- Named transitions use stable IDs and `default="none"` so unrelated updates do
  not animate them.

React transitions activate through navigation, Suspense, and React Transitions.
A normal immediate `setState` is a local CSS interaction and does not become a
View Transition merely because it is wrapped.

## Domain migration decisions

- Home keeps the running timer visually stable. The changing numerals are the
  ambient signal; the former decorative orbit loop is static.
- Engineering record arrival uses the confirmed evidence ID. A duplicate title
  cannot animate the wrong record, and a failed create cannot leave a false
  arrival marker.
- Finance uses calm recomposition and surface motion. Motion never implies that
  an offer, transfer, receivable, or pending amount is settled revenue.
- Content uses the active-cycle token only while autosave is pending. Saved and
  failed states are static and operation-scoped.
- Direction uses surface entry only where a stage or layer actually appears.
- Reviews keep reading facts available immediately; evidence drawers follow the
  shared modal lifecycle.
- Sessions and timer updates never wait for emphasis motion. A confirmed session
  row can mark itself once by ID after timer truth is saved.
- Settings uses content crossfade for the selected ready section.
- COTS network polling, leases, debounce, retry, and reading cadence use semantic
  constants owned by those workflows. They are independent of visual motion
  tokens. Only pending imports and loading indicators use Active cycle. The
  former ambient opening glow is static.

## Reduced motion

Under `prefers-reduced-motion: reduce`, Become removes authored animations,
transitions, spatial movement, scaling, sequencing, loops, smooth scrolling,
and View Transition animation. Current state, focus movement, announcements,
scroll locking, operation timing, and lifecycle cleanup remain correct and
immediate.

Do not use motion as the only signal. Avoid flashing, bounce, parallax, shaking,
count-up numbers, ornamental chart drawing, confetti, and repeated peripheral
movement.

## Review checklist

Before adding or changing motion, verify:

1. What state or relationship does the motion explain?
2. Which anchor remains stable?
3. Does it use the lowest suitable canonical duration, distance, and easing?
4. Is the sequence at most two beats and 32ms apart?
5. Does the loop exist only while work is actually pending?
6. Does opening, rapid reopening, nested Escape, scroll lock, and focus restore
   correctly?
7. Does changing reduced-motion preference while open complete correctly?
8. Does the interaction remain complete without View Transition support?
9. Does saving, navigation, focus, or follow-up access proceed immediately?

Verify keyboard and touch behavior, 320/390/768/1024/1440px layouts, rapid
reopening, cancelled animation, nested layers, and reduced motion in a rendered
browser. Compilation alone is not motion evidence.

## Regression evidence

- `e2e/motion-system.spec.ts` exercises reduced-motion cleanup, rapid reopening,
  nested menu and modal Escape order, nested scroll locking, focus restoration,
  native-dialog cancellation, and confirmed-record arrival by ID.
- `e2e/shared-motion-regression.spec.ts` renders Home, Engineering, Finance,
  Content, Direction, Reviews, Sessions, Settings, Nexo settings, and the COTS
  identity step at 390px and 1440px. It checks the runtime token values,
  document overflow, layer focus, menus, dialogs, and browser errors.
- The shared regression attaches named screenshots for every surface and open
  layer through `testInfo.outputPath`, so a successful run preserves reviewable
  evidence beneath the configured Playwright output directory.
- The typography section of `src/app/styles/tokens.css` is compared with the
  branch base during completion review. Motion work does not alter it.
