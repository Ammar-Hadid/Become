import { SeasonDetail } from "@/features/seasons/detail/components/season-detail.component";
import { notFound } from "next/navigation";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ year: string; quarter: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const rawIdentity = await params;
  const identity = seasonIdentitySchema.safeParse({
    year: Number(rawIdentity.year),
    quarter: Number(rawIdentity.quarter),
  });
  if (!identity.success) notFound();
  const season = await getSeasonView(
    user.id,
    identity.data.year,
    identity.data.quarter,
  );
  return <SeasonDetail season={season} />;
}
