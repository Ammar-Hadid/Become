import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OfferList } from "@/features/entrepreneurship/offers/components/offer-list.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string }>;
  searchParams: Promise<{ cursor?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId } = await params;
  const query = await searchParams;
  return (
    <OfferList
      userId={user.id}
      nicheId={nicheId}
      cursor={query.cursor}
      archived={query.archived === "true"}
    />
  );
}
