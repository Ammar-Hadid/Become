import { ExperimentList } from "@/features/direction/experiments/components/experiment-list.component";
import { getExperimentList } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function ExperimentsPage({
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
  return (
    <ExperimentList
      search={search}
      status={status}
      archived={archived}
      result={await getExperimentList(user.id, {
        search: search || undefined,
        status: status || undefined,
        archived,
        cursor: params.cursor,
      })}
    />
  );
}
