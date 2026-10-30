import type { Metadata } from "next";
import { SeasonActivationCandidate } from "@/features/design-review/season-activation/season-activation-candidate.component";
import { onboardingLocatorSchema } from "@/features/seasons/living/onboarding/onboarding.schema";

export const metadata: Metadata = {
  title: { absolute: "Season activation preview · Become" },
};

export default async function SeasonActivationCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; quarter?: string }>;
}) {
  const query = await searchParams;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const defaults = {
    year: Number(date.find((part) => part.type === "year")!.value),
    quarter: Math.ceil(
      Number(date.find((part) => part.type === "month")!.value) / 3,
    ),
  };
  const parsed = onboardingLocatorSchema.safeParse({
    year: Number(query.year ?? defaults.year),
    quarter: Number(query.quarter ?? defaults.quarter),
  });
  return (
    <SeasonActivationCandidate
      season={parsed.success ? parsed.data : defaults}
    />
  );
}
