import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { InteractionDetail } from "@/features/entrepreneurship/interactions/components/interaction-detail.component";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <InteractionDetail userId={user.id} {...await params} />;
}
