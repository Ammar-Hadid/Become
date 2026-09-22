import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ReachWorkspace } from "@/features/entrepreneurship/reach/components/reach-workspace.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ReachWorkspace userId={user.id} {...await params} />;
}
