import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { MarketPage } from "@/features/entrepreneurship/market/components/market-page.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    nicheArchived?: string;
    cursor?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const query = await searchParams;
  return (
    <MarketPage
      userId={user.id}
      search={(query.q ?? "").slice(0, 120)}
      archived={query.archived === "true"}
      cursor={query.cursor}
      nicheArchived={query.nicheArchived === "true"}
    />
  );
}
