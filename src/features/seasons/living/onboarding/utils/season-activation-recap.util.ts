import type { SeasonOnboardingView } from "../onboarding.service";
import type { SeasonActivationRecap } from "../components/season-activation-review.component";

/** Saved, current pack facts only. Never summarize again or count a chapter preview. */
export function seasonActivationRecap(
  { pack }: SeasonOnboardingView,
  season: SeasonActivationRecap["season"],
): SeasonActivationRecap {
  const approvedSlots = pack.slots.filter((slot) => slot.latestApproved);
  const banner = pack.banner?.approved ? pack.banner : null;
  return {
    season,
    name: pack.identity?.displayName ?? "",
    sourceWork: pack.identity?.sourceWork ?? "",
    adaptation: pack.identity?.adaptation ?? "",
    portraitSrc: banner?.avatarHref,
    portraitPlacement: banner?.crop ?? { x: 0.5, y: 0.5, zoom: 1 },
    personality: pack.profile?.personality?.description ?? "",
    voice: pack.profile?.speechPatterns[0]?.description ?? "",
    setting: pack.setting,
    visualDirection: pack.visualBrief,
    approvedOriginalCount: pack.originalsApproved,
    approvedBannerCount: [banner?.desktopHref, banner?.phoneHref].filter(
      Boolean,
    ).length,
    approvedPortraitCount: banner?.avatarHref ? 1 : 0,
    approvedSceneCount: pack.approvedCount,
    chapterCount: new Set(approvedSlots.map((slot) => slot.chapter)).size,
    paceStateCount: new Set(approvedSlots.map((slot) => slot.state)).size,
  };
}
