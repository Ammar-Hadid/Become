import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { LearnEvidenceWorkspace } from "@/features/entrepreneurship/learn/components/learn-evidence-workspace.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <LearnEvidenceWorkspace
      userId={user.id}
      {...await params}
      query={await searchParams}
      mode="observations"
    />
  );
}
