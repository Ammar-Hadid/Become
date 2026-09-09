import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OfferList } from "@/features/entrepreneurship/offers/components/offer-list.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const query = await searchParams;
  return (
    <OfferList
      userId={user.id}
      cursor={query.cursor}
      archived={query.archived === "true"}
    />
  );
}
