# Become icon system

This is the current product-owner-approved icon language. It supersedes older glyph mappings, one-off icon frames, and component-local icon sizing for the six application areas. The dashboard reference and approved icon comparison establish the visual direction; historical screens do not.

## Area identities

| Area             | Lucide glyph          | Color source             |
| ---------------- | --------------------- | ------------------------ |
| Dashboard        | `LayoutDashboard`     | Become gold              |
| Engineering      | `Code2`               | Engineering palette      |
| Finance          | `ChartNoAxesCombined` | Finance palette          |
| Entrepreneurship | `Rocket`              | Entrepreneurship palette |
| Content          | `FilePenLine`         | Content palette          |
| Direction        | `Compass`             | Become gold              |

Use `AreaIcon` from `src/components/ui/icons/area-icon.component.tsx` for these six identities. `DomainIcon` delegates to it for existing domain-owned call sites. Do not define another area-to-glyph map inside a feature or layout.

## Presentation treatments

Use `IconFrame` from `src/components/ui/icons/icon-frame.component.tsx` for both identity glyphs and contextual Lucide glyphs. The three treatments are:

- **Bare:** 16px glyph with no visible container. Use for quiet inline symbols and icon-only actions. Put an actionable bare icon inside a labeled button with a 36px target; the icon span itself is decorative.
- **Compact:** 36px frame and 16px glyph, subtle domain-tinted fill and one edge. Use for section anchors, timelines, navigation rails, and compact contextual actions.
- **Featured:** 48px frame and 20px glyph, stronger domain base fill. Use once at the top of a domain card, drawer, or focused identity surface. Avoid repeating featured frames through dense lists.

All use one Lucide stroke language: round caps and joins with token-controlled 1.75 stroke. Action chevrons and overflow glyphs express their actual action; do not repeat the area glyph as a trailing action. Keep icons decorative when nearby text supplies the name. An icon-only action needs an accessible label and the shared button/focus treatment.

## Token ownership

Edit `src/app/styles/tokens.css` to change glyph size, frame size, radius, stroke, optical shift, fill/edge strength, light, depth, or action target. The `--icon-*` tokens own those shared decisions. The existing `--color-primary` and `--color-domain-*` tokens own area colors. Drawer-specific close-button tuning remains under `--drawer-close-icon-*`; it does not define a second identity frame system.

Technology vendor marks are an exception: the engineering technology catalog retains its named Simple Icons registry and Lucide fallback described in `README.md`. Those marks identify vendors, not Become application areas, and must not replace the six glyphs above.
