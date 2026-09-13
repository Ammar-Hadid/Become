import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { getSeasonTransition } from "@/features/seasons/transition/queries/season-transition.query";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import { SeasonFinale } from "@/features/seasons/transition/components/season-finale.component";

export default async function FinalePage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; quarter: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const raw = await params;
  const identity = seasonIdentitySchema.safeParse({
    year: Number(raw.year),
    quarter: Number(raw.quarter),
  });
  if (!identity.success) notFound();
  const startOn = `${identity.data.year}-${String((identity.data.quarter - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (reviewPeriod("season", startOn).state !== "ENDED") notFound();
  const view = await getSeasonTransition(user.id, {
    startOn,
    replay: (await searchParams).replay === "1" ? true : undefined,
    includeReview: true,
  });
  return <SeasonFinale view={view} />;
}
