import { notFound } from "next/navigation";
import { GoalDetail } from "@/features/direction/goals/components/goal-detail.component";
import { getGoalView } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function GoalPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { goalId } = await params;
  const goal = await getGoalView(user.id, goalId);
  if (!goal) notFound();
  return <GoalDetail goal={goal} />;
}
