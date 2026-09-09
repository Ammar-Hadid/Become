import { notFound } from "next/navigation";
import { CriterionDetail } from "@/features/direction/evidence/components/criterion-detail.component";
import { getGoalView } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function GoalCriterionPage({
  params,
}: {
  params: Promise<{ goalId: string; criterionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { goalId, criterionId } = await params;
  const goal = await getGoalView(user.id, goalId);
  const criterion = goal?.evaluation.criteria.find(
    ({ id }) => id === criterionId,
  );
  if (!goal || !criterion) notFound();
  return (
    <CriterionDetail
      criterion={criterion}
      ownerTitle={goal.title}
      ownerHref={`/direction/goals/${goal.id}`}
      ownerVersion={goal.version}
      ownerStatus={goal.status}
    />
  );
}
