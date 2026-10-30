# Approved tooltip

The product owner selected **04 Corner Frame** from the revised tooltip comparison. It is the only approved shared tooltip treatment. The other five gallery directions are not shared defaults.

Use `Tooltip` from `src/components/ui/tooltips/tooltip.component.tsx` around an enabled, already-accessible control:

```tsx
<Tooltip content="Notifications" area="dashboard" side="bottom">
  <button type="button" aria-label="Notifications">
    <Bell aria-hidden="true" />
  </button>
</Tooltip>
```

The surface is short text on dark graphite glass with a restrained domain glow and illuminated upper-left/lower-right corners. `area` selects Dashboard gold or the Engineering, Finance, Entrepreneurship, or Content accent. Direction uses shared gold. The owning surface can override `--tooltip-accent` when a specific semantic accent is necessary. Change its size, padding, radius, opacity, blur, edge, corners, glow, placement gap, motion, and hover/close delays in the **Approved tooltip** section of `src/app/styles/tokens.css`. Its text uses the owner-controlled `type-label` role; do not create a separate tooltip typography scale.

Tooltips name an icon-only action or add one short, nonessential piece of context. The trigger itself must have an accessible name. Avoid redundant tooltips on visibly labeled controls, disabled controls, and static badges. Keep required form guidance, errors, eligibility, and decision-critical facts visible in the interface. Use a menu, popover, drawer, or dialog when content needs links, buttons, images, or more than a brief thought. A keyboard shortcut shown in a tooltip must also be discoverable elsewhere.

Hover opens after the tokenized delay; keyboard focus opens immediately. Escape dismisses without moving focus. Pointer exit, blur, or an outside press closes it. Touching the trigger can show the hint without blocking the trigger's own action. The tooltip never receives keyboard focus. Placement prefers `side` and flips or clamps at viewport edges; a tooltip inside a native dialog is rendered within that dialog's top layer. Reduced motion removes its arrival animation without changing visibility or interaction.
