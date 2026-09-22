import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ExplorationSnapshot userId={user.id} {...await params} review />;
}
