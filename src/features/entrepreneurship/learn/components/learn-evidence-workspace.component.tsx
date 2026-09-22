import { EvidencePage } from "@/features/entrepreneurship/evidence/components/evidence-page.component";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { LearnNavigation } from "@/features/entrepreneurship/learn/components/learn-navigation.component";

export async function LearnEvidenceWorkspace({
  userId,
  nicheId,
  mode,
  query,
}: {
  userId: string;
  nicheId: string;
  mode: "sources" | "observations";
  query: Record<string, string | string[] | undefined>;
}) {
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const filters = {
    nicheId,
    cursor: value("cursor"),
    sourceKind:
      mode === "observations"
        ? (value("sourceKind") ?? "OBSERVATION")
        : value("sourceKind"),
    marketType: value("marketType"),
    segmentId: value("segmentId"),
    personId: value("personId"),
    companyId: value("companyId"),
  };
  const [data, options] = await Promise.all([
    getEvidenceJournal(userId, filters),
    getInteractionOptions(userId, nicheId),
  ]);
  return (
    <EvidencePage
      data={data}
      options={options}
      nicheId={nicheId}
      query={filters}
      mode={mode}
      navigation={<LearnNavigation nicheId={nicheId} active={mode} />}
    />
  );
}
