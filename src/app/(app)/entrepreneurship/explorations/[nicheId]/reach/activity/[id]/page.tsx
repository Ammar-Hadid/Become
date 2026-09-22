import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ReachActivityDetail } from "@/features/entrepreneurship/reach/components/reach-activity-detail.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, id } = await params;
  return (
    <ReachActivityDetail userId={user.id} nicheId={nicheId} activityId={id} />
  );
}
