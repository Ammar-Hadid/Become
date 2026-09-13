import { DateTime } from "luxon";
import { SeasonOpening } from "@/features/seasons/opening/components/season-opening.component";
import { getDirectionOptions } from "@/features/direction/queries/direction.query";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { notFound } from "next/navigation";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getCarryForwardSuggestion } from "@/features/seasons/transition/queries/season-transition.query";
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
  const [season, goals, domains, carryForward] = await Promise.all([
    getSeasonView(user.id, identity.data.year, identity.data.quarter),
    getDirectionOptions(user.id, "goal"),
    getDirectionOptions(user.id, "domain"),
    getCarryForwardSuggestion(
      user.id,
      identity.data.year,
      identity.data.quarter,
    ),
  ]);
  return (
    <SeasonOpening
      season={season}
      goalOptions={goals.items}
      domainOptions={domains.items}
      defaultGoalStartOn={
        DateTime.now().setZone(APP_TIMEZONE).toISODate() ??
        season.calendar.startOn
      }
      arrival={(await searchParams).arrival === "season"}
      fromFinale={(await searchParams).fromFinale === "1"}
      carryForward={carryForward}
      recoveryScope={`${user.id}:${season.year}:${season.quarter}`}
    />
  );
}
