import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ScopeWorkspace } from "@/features/entrepreneurship/scope/components/scope-workspace.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const query = { ...(await searchParams), kind: "business" };
  return <ScopeWorkspace userId={user.id} {...await params} query={query} />;
}
