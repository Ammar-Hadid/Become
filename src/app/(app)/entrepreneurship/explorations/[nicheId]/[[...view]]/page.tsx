import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ExplorationPage } from "@/features/entrepreneurship/explorations/components/exploration-page.component";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string; view?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <ExplorationPage
      userId={user.id}
      {...await params}
      query={await searchParams}
    />
  );
}
