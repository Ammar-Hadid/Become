import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { FinanceWorkDetail } from "@/features/finance/sessions/components/finance-work-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await getCurrentUser();
  const { sessionId } = await params;
  return user ? <FinanceWorkDetail userId={user.id} id={sessionId} /> : null;
}
