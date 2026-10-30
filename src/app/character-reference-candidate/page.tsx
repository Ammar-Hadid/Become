import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CharacterReferenceCandidate } from "@/features/design-review/character-references/character-reference-candidate.component";
import { readOfficialTrialReport } from "@/features/design-review/character-references/trial-report.service";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Character recognition preview · Become" },
};
export default async function CharacterReferenceCandidatePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const report = await readOfficialTrialReport().catch(() => null);
  if (!report)
    return (
      <main style={{ padding: "var(--space-app-page-gutter)" }}>
        <h1 className="type-page-title">Reference trial not ready</h1>
        <p className="type-body">
          Run the isolated official reference trial to prepare the review
          images.
        </p>
      </main>
    );
  return <CharacterReferenceCandidate report={report} />;
}
