# Shared system review

The `/design-review` route records the approved shared system before rebuilding Become's application screens. It renders the real shared React primitives with local preview data. It does not write records. The account sign-out action is disabled on this route.

## Approved coverage

- Brand symbol, responsive desktop/mobile header, timer presentation, mobile navigation, and looping desktop rail
- Cool graphite foundation, gold and domain palettes, semantic typography, solid/glass/elevated-glass materials
- Overview, dense-information, and action spacing contexts
- Buttons, icon treatments and area identities, fields, selections, select menu, dialog, and contextual drawer
- Short operating-form and long dedicated-page composition examples across Engineering, Finance, Entrepreneurship, and Content
- Plasma Core, Season Ticks, Segmented Halo, Orbit Arc, Edge Trace, and Eclipse
- All sixteen approved empty-state patterns, four badge roles, and Corner Frame tooltip

## Spacing and motion audit

The approved shared primitives use semantic spacing and motion tokens from `src/app/styles/tokens.css`. This pass aligned selection feedback, text-field/select feedback, compact-icon hover, menu arrival and item feedback, dialog entry/exit, and drawer entry/exit with the approved motion roles. The session-details drawer's presence fallback uses the same surface duration as its CSS animation. Static empty states and badges stay still except for actionable controls; loading loops only while mounted, and progress animates when its value changes. Desktop rail and time-picker scrolling retain their approved interaction mechanics. The global reduced-motion rule removes decorative animation without changing component state.

The final review also shows the responsive Project Anatomy diagram, restrained shared-button glow, the revised desktop/mobile account chevron, the glossier mobile navigation surface, and a sample notification menu. Notification content is local placeholder data; it is not connected to persistence or a delivery service.

## Mandatory use

The approved components and tokens are the source of truth for new and rebuilt screens. Use a shared primitive where its role applies. A new treatment or visible/audible extension must pass the separate-preview and explicit-approval gate in `AGENTS.md` and `docs/design/SHARED_LIBRARY.md` before it enters the shared library or a feature. Keep domain behavior in its feature and preserve accessibility, keyboard and reduced-motion behavior. The dashboard rebuild was the first live screen to consume the approved header, navigation, materials, icon frames, badge, progress indicators, controls, and semantic type.

Component-specific geometry, illustrated diagram coordinates, and deliberately distinct loading/progress animation cycles remain in their semantic component tokens. Historical screens and pre-redesign primitives are migrated when their owning screen is rebuilt; their old layout is not an approved visual requirement.
