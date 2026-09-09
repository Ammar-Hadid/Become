import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { OpportunityDetail } from "@/features/finance/opportunities/components/opportunity-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const user = await getCurrentUser();
  const { opportunityId } = await params;
  return user ? (
    <OpportunityDetail userId={user.id} id={opportunityId} />
  ) : null;
}
