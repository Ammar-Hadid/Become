import { SeasonDetail } from "@/features/seasons/detail/components/season-detail.component";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function DirectionPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const season = await getSeasonView(user.id);
  return <SeasonDetail season={season} />;
}
