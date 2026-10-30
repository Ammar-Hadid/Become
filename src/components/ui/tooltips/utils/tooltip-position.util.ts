export type TooltipSide = "top" | "right" | "bottom" | "left";

type Rectangle = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type Size = { width: number; height: number };

type Viewport = { width: number; height: number };

const opposite: Record<TooltipSide, TooltipSide> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

export function positionTooltip({
  trigger,
  tooltip,
  viewport,
  preferredSide,
  gap,
  inset,
}: {
  trigger: Rectangle;
  tooltip: Size;
  viewport: Viewport;
  preferredSide: TooltipSide;
  gap: number;
  inset: number;
}) {
  const available: Record<TooltipSide, number> = {
    top: trigger.top - inset - gap,
    right: viewport.width - trigger.right - inset - gap,
    bottom: viewport.height - trigger.bottom - inset - gap,
    left: trigger.left - inset - gap,
  };
  const required = (side: TooltipSide) =>
    side === "top" || side === "bottom" ? tooltip.height : tooltip.width;

  let side = preferredSide;
  if (available[side] < required(side)) {
    const alternate = opposite[side];
    side =
      available[alternate] >= required(alternate)
        ? alternate
        : (Object.keys(available) as TooltipSide[]).reduce((best, candidate) =>
            available[candidate] - required(candidate) >
            available[best] - required(best)
              ? candidate
              : best,
          );
  }

  const centerX = trigger.left + trigger.width / 2 - tooltip.width / 2;
  const centerY = trigger.top + trigger.height / 2 - tooltip.height / 2;
  const desired = {
    top:
      side === "top"
        ? trigger.top - gap - tooltip.height
        : side === "bottom"
          ? trigger.bottom + gap
          : centerY,
    left:
      side === "left"
        ? trigger.left - gap - tooltip.width
        : side === "right"
          ? trigger.right + gap
          : centerX,
  };

  return {
    side,
    top: Math.min(
      Math.max(desired.top, inset),
      Math.max(inset, viewport.height - tooltip.height - inset),
    ),
    left: Math.min(
      Math.max(desired.left, inset),
      Math.max(inset, viewport.width - tooltip.width - inset),
    ),
  };
}
