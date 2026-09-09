import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OfferDetail } from "@/features/entrepreneurship/offers/components/offer-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <OfferDetail userId={user.id} {...await params} />;
}
