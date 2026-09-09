import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ProblemList } from "@/features/entrepreneurship/problems/components/problem-list.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const query = await searchParams;
  return (
    <ProblemList
      userId={user.id}
      cursor={query.cursor}
      archived={query.archived === "true"}
    />
  );
}
