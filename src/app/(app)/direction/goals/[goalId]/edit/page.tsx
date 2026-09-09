import { notFound } from "next/navigation";
import { GoalEditor } from "@/features/direction/goals/components/goal-editor.component";
import {
  getDirectionOptions,
  getGoalView,
} from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { goalId } = await params;
  const [goal, domains] = await Promise.all([
    getGoalView(user.id, goalId),
    getDirectionOptions(user.id, "domain"),
  ]);
  if (!goal) notFound();
  return (
    <GoalEditor
      goal={goal}
      domainOptions={domains.items}
      defaultStartOn={goal.startOn}
    />
  );
}
