import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getAudienceDetail } from "@/features/entrepreneurship/audiences/queries/audience.query";
import { AudienceDetail } from "@/features/entrepreneurship/audiences/components/audience-detail.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, id } = await params;
  const data = await getAudienceDetail(user.id, "segment", id, nicheId);
  if (!data) notFound();
  return <AudienceDetail data={data} kind="segment" nicheId={nicheId} />;
}
