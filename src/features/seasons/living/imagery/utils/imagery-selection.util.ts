export type Format = "DESKTOP" | "MOBILE";
export type Pace = "FAR_BEHIND" | "NEUTRAL" | "ON_TRACK";
export type RecipeGroup =
  "style" | "banners" | "portrait" | "chapters" | "reference";
export const PACE_OPTIONS = [
  { key: "FAR_BEHIND", label: "Behind pace", tone: "danger" },
  { key: "NEUTRAL", label: "In progress", tone: "primary" },
  { key: "ON_TRACK", label: "On track", tone: "success" },
] as const;
export function recipeKey(
  group: RecipeGroup,
  format: Format,
  chapter: number,
  pace: Pace,
) {
  if (group === "style") return "visual-language";
  if (group === "portrait") return "portrait";
  if (group === "reference") return "reference-sheet";
  if (group === "banners")
    return format === "MOBILE" ? "banner-phone" : "banner-desktop";
  return `scene-chapter-${chapter}-${pace.toLowerCase().replaceAll("_", "-")}-${format.toLowerCase()}`;
}
