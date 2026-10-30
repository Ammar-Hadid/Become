import { SeasonOnboardingConnected } from "@/features/seasons/living/onboarding/components/season-onboarding-connected.component";
import { getSeasonOpeningOnboarding } from "@/features/seasons/living/onboarding/onboarding.service";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { notFound } from "next/navigation";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import "@/features/direction/styles/direction.css";

export default async function SeasonOpeningPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; quarter: string }>;
  searchParams: Promise<{ arrival?: string; fromFinale?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const rawIdentity = await params;
  const identity = seasonIdentitySchema.safeParse({
    year: Number(rawIdentity.year),
    quarter: Number(rawIdentity.quarter),
  });
  if (!identity.success) notFound();
  const view = await getSeasonOpeningOnboarding(
    user.id,
    identity.data.year,
    identity.data.quarter,
  );
  const query = await searchParams;
  return (
    <SeasonOnboardingConnected
      initialView={view}
      year={identity.data.year}
      quarter={identity.data.quarter}
      arrival={query.arrival === "season" || query.fromFinale === "1"}
      recoveryScope={`${user.id}:${identity.data.year}:${identity.data.quarter}`}
    />
  );
}
