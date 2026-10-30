# Approved badges

The product owner selected four badge treatments from the badge comparison:

| Variant          | Role                                     | Example         |
| ---------------- | ---------------------------------------- | --------------- |
| `aurora-fill`    | Read-only status                         | On track        |
| `live-numeral`   | Read-only number with a small signal dot | 12              |
| `specimen-strip` | Read-only identity or metadata           | S1 / Foundation |
| `RemovableBadge` | Interactive applied filter               | Account: ING ×  |

Use `Badge` or `RemovableBadge` from `src/components/ui/badges/badge.component.tsx`. Do not use a badge as a generic button or navigation link. The three `Badge` variants are non-interactive spans. A removable badge is a real button whose `onRemove` callback changes the owning filter state; it must not merely animate or cross out a label. The whole chip is its target, and the accessible name identifies what will be removed.

`area` selects Dashboard gold or the Engineering, Finance, Entrepreneurship, or Content accent. Direction currently uses shared gold. The owning surface may override `--badge-accent` for a specific semantic condition, with visible text still naming that condition. The selected shape, opacity, border, glow, dot, icon, focus and spacing values live together in the **Approved badges** section of `src/app/styles/tokens.css`. Typography uses the locked `type-system` role.

Keep status words and numbers truthful and current; do not use color as the only meaning. Numeric badges should sit near the item they count. Remove affordances need keyboard focus and must remain operable without motion. The other 14 gallery treatments are unapproved and must not be used as shared defaults. Earlier screens can adopt these badges as each screen's visual redesign is approved.
