import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { TransactionDetail } from "@/features/finance/transactions/components/transaction-detail.component";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ workSearch?: string }>;
}) {
  const user = await getCurrentUser();
  const { transactionId } = await params;
  return user ? (
    <TransactionDetail
      userId={user.id}
      id={transactionId}
      {...await searchParams}
    />
  ) : null;
}
