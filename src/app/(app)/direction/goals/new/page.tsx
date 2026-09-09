import { DateTime } from "luxon";
import { GoalEditor } from "@/features/direction/goals/components/goal-editor.component";
import { getDirectionOptions } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [params, domains] = await Promise.all([
    searchParams,
    getDirectionOptions(user.id, "domain"),
  ]);
  return (
    <GoalEditor
      domainOptions={domains.items}
      defaultStartOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
      returnTo={params.returnTo}
    />
  );
}
