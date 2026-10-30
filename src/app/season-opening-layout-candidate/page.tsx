import type { Metadata } from "next";
import { SeasonOpeningLayoutPreview } from "@/features/design-review/season-opening-layout/season-opening-layout-preview.component";
import { onboardingLocatorSchema } from "@/features/seasons/living/onboarding/onboarding.schema";

export const metadata: Metadata = {
  title: { absolute: "Season opening layout preview · Become" },
};
export default async function SeasonOpeningLayoutCandidatePage({
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
    <SeasonOpeningLayoutPreview
      season={parsed.success ? parsed.data : defaults}
    />
  );
}
