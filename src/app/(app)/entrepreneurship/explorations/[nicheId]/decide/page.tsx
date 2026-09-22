import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ProblemList } from "@/features/entrepreneurship/problems/components/problem-list.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string }>;
  searchParams: Promise<{ cursor?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId } = await params;
  const query = await searchParams;
  return (
    <ProblemList
      userId={user.id}
      nicheId={nicheId}
      cursor={query.cursor}
      archived={query.archived === "true"}
    />
  );
}
