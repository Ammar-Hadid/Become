import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { LearnWorkspace } from "@/features/entrepreneurship/learn/components/learn-workspace.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <LearnWorkspace userId={user.id} {...await params} />;
}
