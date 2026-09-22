import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { MarketDetail } from "@/features/entrepreneurship/market/components/market-detail.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, id } = await params;
  return (
    <MarketDetail userId={user.id} nicheId={nicheId} kind="companies" id={id} />
  );
}
