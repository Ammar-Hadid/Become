import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { GoalDetail } from "@/features/finance/savings/components/goal-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const user = await getCurrentUser();
  const { goalId } = await params;
  return user ? <GoalDetail userId={user.id} id={goalId} /> : null;
}
