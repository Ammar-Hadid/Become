# Become brand and header

The product owner approved the slightly bolder B/road symbol, the shared desktop header, the responsive mobile header and menu, and the continuous desktop navigation rail.

## Source of truth

- `src/components/layout/branding/brand-mark.component.tsx` contains the approved symbol paths. The path coordinates and viewBox match the supplied SVG; the approved optical weight is a same-color stroke.
- `src/components/layout/header/app-header.component.tsx` owns the desktop and mobile header composition. `AppShell` installs this header across authenticated pages. `BrandMark` is also used on sign-in.
- `src/components/layout/header/app-header.css` owns the component styling. Change recurring visual values in the **Brand and approved application header** section of `src/app/styles/tokens.css`, including symbol color, stroke weight, desktop/mobile sizes, header height, glass opacity and blur, spacing, focus block, and mobile menu treatments.
- `src/components/layout/navigation/constants/area-navigation.config.ts` holds the shared area order and the desktop rail's visible-item count. Use this file for navigation behavior and `tokens.css` for colors, sizes, spacing, and motion.
- `src/components/layout/navigation/desktop-area-navigation.component.tsx` owns the desktop rail interaction; its colocated CSS owns composition. `AppShell` installs it alongside the header across authenticated pages. The **Approved desktop area navigation** tokens expose its size, offsets, glass blur, state fills, borders, indicator, and pagination styling.
- Typography continues to use the approved semantic roles. Brand lettering uses Manrope; application UI uses Inter; the timer's system readout uses the approved Geist Mono role. Do not add a font family for the logo.

## Behavior

- The header season countdown comes from the current season calendar.
- Start opens the existing timer flow. Pause and resume use the active timer provider. End opens the existing completion flow so the session's required details can be recorded.
- The mobile menu uses the six approved area identities and the shared icon treatments. It supports keyboard focus, Escape, focus return, and reduced motion through the shared layer primitives.

## Approved refinements

The following refinements are part of the current shared header:

- The profile chevron sits beside the account name on desktop and mobile. Settings remains in the shared account menu. The standalone Settings and Appearance header actions were removed.
- The bell opens a shared-menu notification preview on desktop and inside the mobile navigation. Its items are explicitly labeled sample content until the notification system is connected; selecting one only marks that sample as read in local UI state. No notification records are created.
- The mobile navigation material has its own blur, opacity, and gloss tokens so its sheen can change without changing the global shell.

## Desktop rail

- The desktop rail shows the configured number of slots. The selected area is always in the top slot. Wheel input, arrow keys, and clicks on visible icons navigate in an infinite loop with the approved continuous motion. Only the selected area reveals its label; other icons gain a hover/focus state. The rail is hidden on mobile, which uses the separate mobile menu.
- A large wheel event advances at most one area; small trackpad deltas accumulate. The short idle timer settles the visual offset and sends only the final selected route, without blocking further wheel input. Adjacent visual copies preserve the direction of travel across the Direction/Dashboard wrap. Keep these interaction rules when tuning `wheelStepRows` or `wheelBurstIdleMs` in the navigation config.
- On compact desktop and tablet widths, the shared shell reserves the rail's tokenized clearance beside non-dashboard pages. The dashboard keeps its full-bleed hero and reserves that clearance only for its widget grid.
