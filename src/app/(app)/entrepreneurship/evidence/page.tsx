import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { EvidencePage } from "@/features/entrepreneurship/evidence/components/evidence-page.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const q = await searchParams;
  const filters = {
    sourceKind: q.sourceKind,
    marketType: q.marketType,
    segmentId: q.segmentId,
    personId: q.personId,
    companyId: q.companyId,
    cursor: q.cursor,
  };
  const [data, options] = await Promise.all([
    getEvidenceJournal(user.id, filters),
    getInteractionOptions(user.id),
  ]);
  return <EvidencePage data={data} options={options} query={filters} />;
}
