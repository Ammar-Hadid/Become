import { GoalList } from "@/features/direction/goals/components/goal-list.component";
import { getGoalList } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    archived?: string;
    cursor?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const search = params.search?.slice(0, 200) ?? "";
  const status = ["ACTIVE", "PAUSED", "CONCLUDED"].includes(params.status ?? "")
    ? params.status!
    : "";
  const archived = params.archived === "true";
  const result = await getGoalList(user.id, {
    search: search || undefined,
    status: status || undefined,
    archived,
    cursor: params.cursor,
  });
  return (
    <GoalList
      result={result}
      search={search}
      status={status}
      archived={archived}
    />
  );
}
