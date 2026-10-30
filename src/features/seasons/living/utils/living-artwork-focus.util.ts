import type { CSSProperties } from "react";

const DESKTOP_FOCUS_OVERSCAN = 0.12;

/** Keep a little image outside the frame so both focal axes can pan. */
export function desktopArtworkFocusStyle(x: number, y: number): CSSProperties {
  const focalX = Math.min(1, Math.max(0, x));
  const focalY = Math.min(1, Math.max(0, y));
  const pan = DESKTOP_FOCUS_OVERSCAN * 100;

  return {
    objectPosition: `${focalX * 100}% ${focalY * 100}%`,
    transform: `translate(${(0.5 - focalX) * pan}%, ${(0.5 - focalY) * pan}%) scale(${1 + DESKTOP_FOCUS_OVERSCAN})`,
  };
}
