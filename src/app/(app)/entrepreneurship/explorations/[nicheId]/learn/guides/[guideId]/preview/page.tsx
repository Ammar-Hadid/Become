import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { InterviewGuideWorkspace } from "@/features/entrepreneurship/interview-guides/components/interview-guide-workspace.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; guideId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, guideId } = await params;
  return (
    <InterviewGuideWorkspace
      userId={user.id}
      nicheId={nicheId}
      guideId={guideId}
      preview
    />
  );
}
