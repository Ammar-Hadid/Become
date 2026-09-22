import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ProblemDetail } from "@/features/entrepreneurship/problems/components/problem-detail.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; problemId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, problemId } = await params;
  return <ProblemDetail userId={user.id} nicheId={nicheId} id={problemId} />;
}
