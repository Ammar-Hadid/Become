export type ViewportSize = { width: number; height: number };
export type ViewportBounds = {
  width: { min: number; max: number };
  height: { min: number; max: number };
};
export type ViewportResizeHandle = "width" | "height" | "corner";

/** Edit these values to change the phone sizes available in artwork review. */
export const PHONE_ARTWORK_VIEWPORT = {
  bounds: {
    width: { min: 320, max: 430 },
    height: { min: 568, max: 812 },
  },
  initialSize: { width: 375, height: 667 },
  keyboardStep: 1,
  keyboardShiftStep: 10,
} as const satisfies {
  bounds: ViewportBounds;
  initialSize: ViewportSize;
  keyboardStep: number;
  keyboardShiftStep: number;
};
