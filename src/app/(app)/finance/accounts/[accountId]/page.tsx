import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { AccountDetail } from "@/features/finance/accounts/components/account-detail.component";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await getCurrentUser();
  const { accountId } = await params;
  const { cursor } = await searchParams;
  return user ? (
    <AccountDetail userId={user.id} id={accountId} cursor={cursor} />
  ) : null;
}
