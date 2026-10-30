import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getSeasonOpeningOnboarding } from "@/features/seasons/living/onboarding/onboarding.service";
import { SeasonOnboardingDemo } from "@/features/design-review/season-onboarding/season-onboarding-candidate.component";
import { SeasonOnboardingConnected } from "@/features/seasons/living/onboarding/components/season-onboarding-connected.component";
import { onboardingLocatorSchema } from "@/features/seasons/living/onboarding/onboarding.schema";

export const metadata: Metadata = {
  title: { absolute: "Season onboarding candidate · Become" },
};
export default async function SeasonOnboardingCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    quarter?: string;
    connect?: string;
  }>;
}) {
  const query = await searchParams;
  if (!query.connect && !query.year) return <SeasonOnboardingDemo />;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const now = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(query.year ?? now.find((p) => p.type === "year")!.value);
  const quarter = Number(
    query.quarter ??
      Math.ceil(Number(now.find((p) => p.type === "month")!.value) / 3),
  );
  const locator = onboardingLocatorSchema.parse({ year, quarter });
  const view = await getSeasonOpeningOnboarding(
    user.id,
    locator.year,
    locator.quarter,
  );
  return (
    <SeasonOnboardingConnected
      initialView={view}
      {...locator}
      showMotionControls
    />
  );
}
