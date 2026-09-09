import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { InteractionPage } from "@/features/entrepreneurship/interactions/components/interaction-page.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; companyId?: string; cursor?: string }>;
}) {
  const user = await getCurrentUser();
  return user ? (
    <InteractionPage userId={user.id} query={await searchParams} />
  ) : null;
}
