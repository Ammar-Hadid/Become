import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { FinanceOverview } from "@/features/finance/analytics/components/finance-overview.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string; date?: string }>;
}) {
  const user = await getCurrentUser();
  return user ? (
    <FinanceOverview userId={user.id} {...await searchParams} />
  ) : null;
}
