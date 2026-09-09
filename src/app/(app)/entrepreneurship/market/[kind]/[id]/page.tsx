import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { MarketDetail } from "@/features/entrepreneurship/market/components/market-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; kind: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const route = await params;
  if (route.kind === "niches")
    redirect(`/entrepreneurship/explorations/${route.id}`);
  return <MarketDetail userId={user.id} {...route} />;
}
