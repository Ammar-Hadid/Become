import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { TransactionsPage } from "@/features/finance/transactions/components/transactions-page.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    engagement?: string;
    exploration?: string;
    company?: string;
    offer?: string;
    cursor?: string;
    type?: string;
    currency?: string;
    account?: string;
    day?: string;
    review?: string;
    category?: string;
    counterparty?: string;
    selected?: string;
    period?: string;
    date?: string;
  }>;
}) {
  const user = await getCurrentUser();
  return user ? (
    <TransactionsPage userId={user.id} filters={await searchParams} />
  ) : null;
}
