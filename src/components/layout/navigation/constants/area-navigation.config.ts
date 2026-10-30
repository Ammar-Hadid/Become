/** Product areas and their route order in the shared navigation. */
export const AREA_NAVIGATION = [
  { area: "dashboard", label: "Dashboard", href: "/" },
  { area: "engineering", label: "Engineering", href: "/engineering" },
  { area: "finance", label: "Finance", href: "/finance" },
  {
    area: "entrepreneurship",
    label: "Entrepreneurship",
    href: "/entrepreneurship",
  },
  { area: "content", label: "Content", href: "/content" },
  { area: "direction", label: "Direction", href: "/direction" },
] as const;

/** Behavioral settings belong here; visual values stay in tokens.css. */
export const DESKTOP_NAVIGATION_CONFIG = {
  visibleItems: 5,
  /** Travel needed for one area change, expressed in rail row heights. */
  wheelStepRows: 2.5,
  /** An idle gap this long separates wheel input bursts; no magnitude gate. */
  wheelBurstIdleMs: 45,
} as const;
