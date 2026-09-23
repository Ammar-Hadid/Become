export const MOTION_DURATION_VARIABLE = {
  response: "--duration-response",
  control: "--duration-control",
  content: "--duration-content",
  surface: "--duration-surface",
  emphasis: "--duration-emphasis",
  activeCycle: "--duration-active-cycle",
} as const;

export type MotionDuration = keyof typeof MOTION_DURATION_VARIABLE;

export function parseCssTimeList(value: string) {
  return value.split(",").reduce((longest, entry) => {
    const normalized = entry.trim().toLowerCase();
    const match = /^(-?(?:\d+\.?\d*|\.\d+))(ms|s)$/.exec(normalized);
    if (!match) return longest;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return longest;
    const milliseconds = match[2] === "s" ? amount * 1_000 : amount;
    return Math.max(longest, milliseconds);
  }, 0);
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function resolveMotionDurationMs(duration: MotionDuration) {
  if (typeof window === "undefined" || prefersReducedMotion()) return 0;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(MOTION_DURATION_VARIABLE[duration]);
  return parseCssTimeList(value);
}

export function resolveMotionFallbackMs(duration: MotionDuration) {
  return (
    resolveMotionDurationMs(duration) + resolveMotionDurationMs("response")
  );
}
