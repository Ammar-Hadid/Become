import { SeasonLibrary } from "@/features/seasons/library/components/season-library.component";
import { getSeasonLibrary } from "@/features/seasons/queries/season.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; cursor?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const search = params.search?.slice(0, 200) ?? "";
  const result = await getSeasonLibrary(user.id, {
    search: search || undefined,
    cursor: params.cursor,
  });
  return <SeasonLibrary result={result} search={search} />;
}
