import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { EvidenceSourceDetail } from "@/features/entrepreneurship/evidence/components/evidence-source-detail.component";
import { getEvidenceSourceDetail } from "@/features/entrepreneurship/evidence/queries/evidence-source.query";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const data = await getEvidenceSourceDetail(user.id, id);
  if (!data) notFound();
  return <EvidenceSourceDetail data={data} />;
}
