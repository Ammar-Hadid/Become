import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { InterviewGuideIndex } from "@/features/entrepreneurship/interview-guides/components/interview-guide-index.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <InterviewGuideIndex userId={user.id} {...await params} />;
}
