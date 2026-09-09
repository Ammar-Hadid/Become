import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ProblemDetail } from "@/features/entrepreneurship/problems/components/problem-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ProblemDetail userId={user.id} {...await params} />;
}
