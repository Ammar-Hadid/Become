import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ExplorationSnapshotHistory } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-history.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ExplorationSnapshotHistory userId={user.id} {...await params} />;
}
