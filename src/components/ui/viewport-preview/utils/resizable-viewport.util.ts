import type {
  ViewportBounds,
  ViewportResizeHandle,
  ViewportSize,
} from "../config/resizable-viewport.config";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function resizeViewport(
  initial: ViewportSize,
  handle: ViewportResizeHandle,
  deltaX: number,
  deltaY: number,
  scale: number,
  bounds: ViewportBounds,
): ViewportSize {
  const factor = scale > 0 ? scale : 1;
  return {
    width:
      handle === "height"
        ? initial.width
        : clamp(
            initial.width + deltaX / factor,
            bounds.width.min,
            bounds.width.max,
          ),
    height:
      handle === "width"
        ? initial.height
        : clamp(
            initial.height + deltaY / factor,
            bounds.height.min,
            bounds.height.max,
          ),
  };
}
