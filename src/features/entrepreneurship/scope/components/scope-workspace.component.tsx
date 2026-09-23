import { AudiencePage } from "@/features/entrepreneurship/audiences/components/audience-page.component";
import { getAudienceRecords } from "@/features/entrepreneurship/audiences/queries/audience.query";
import { MarketPage } from "@/features/entrepreneurship/market/components/market-page.component";

export async function ScopeWorkspace({
  userId,
  nicheId,
  query,
}: {
  userId: string;
  nicheId: string;
  query: Record<string, string | string[] | undefined>;
}) {
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const archived = value("archived") === "true";
  const cursor = value("cursor");
  const search = (value("q") ?? "").slice(0, 120);
  if (value("kind") === "business")
    return (
      <MarketPage
        userId={userId}
        nicheId={nicheId}
        search={search}
        archived={archived}
        cursor={cursor}
      />
    );
  const kind = value("kind") === "person" ? "person" : "segment";
  const data = await getAudienceRecords(userId, {
    nicheId,
    cursor,
    archived,
    kind,
    search,
  });
  return (
    <AudiencePage
      data={data}
      kind={kind}
      nicheId={nicheId}
      search={search}
      archived={archived}
    />
  );
}
