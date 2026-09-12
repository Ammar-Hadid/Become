import { DateTime } from "luxon";
import { SeasonOpening } from "@/features/seasons/opening/components/season-opening.component";
import { getDirectionOptions } from "@/features/direction/queries/direction.query";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { notFound } from "next/navigation";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import "@/features/direction/styles/direction.css";

export default async function SeasonOpeningPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; quarter: string }>;
  searchParams: Promise<{ arrival?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const rawIdentity = await params;
  const identity = seasonIdentitySchema.safeParse({
    year: Number(rawIdentity.year),
    quarter: Number(rawIdentity.quarter),
  });
  if (!identity.success) notFound();
  const [season, goals, domains] = await Promise.all([
    getSeasonView(user.id, identity.data.year, identity.data.quarter),
    getDirectionOptions(user.id, "goal"),
    getDirectionOptions(user.id, "domain"),
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
    />
  );
}
