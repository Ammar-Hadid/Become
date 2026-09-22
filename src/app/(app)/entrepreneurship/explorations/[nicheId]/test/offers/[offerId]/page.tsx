import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OfferDetail } from "@/features/entrepreneurship/offers/components/offer-detail.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; offerId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, offerId } = await params;
  return <OfferDetail userId={user.id} nicheId={nicheId} id={offerId} />;
}
