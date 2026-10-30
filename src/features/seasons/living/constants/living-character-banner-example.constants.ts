/** Approved Levi staging example, not a saved Season asset. */
export const LIVING_LEVI_BANNER_EXAMPLE = {
  desktopSrc: "/design-review/character-workspace-v3/levi-desktop-v2.webp",
  phoneSrc: "/design-review/character-workspace-v3/levi-phone-v2.webp",
  avatarSrc: "/design-review/character-workspace-v3/levi-avatar.webp",
  alt: "Levi on a Survey Corps rooftop at golden dusk",
  quote: "Give up on your dreams and die.",
  attribution: "Levi Ackerman",
  rightLine: "FEW WORDS.\nNO WASTED MOVES.",
} as const;

export function isLeviBannerExampleSubject(profile: {
  characterName: string;
  sourceWork: string;
  adaptation: string;
}) {
  return (
    profile.characterName.trim() === "Levi Ackerman" &&
    profile.sourceWork.trim() === "Attack on Titan" &&
    profile.adaptation.trim() === "TV anime"
  );
}
