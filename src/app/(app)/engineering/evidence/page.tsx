import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { EngineeringEvidenceList } from "@/features/engineering/evidence/components/engineering-evidence-list.component";
import { getEngineeringEvidenceList } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Engineering evidence" };

export default async function EngineeringEvidencePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const evidence = await getEngineeringEvidenceList(user.id);
  return (
    <div className="page-shell engineering-evidence-page">
      <header className="page-header engineering-evidence-page-header">
        <div>
          <p className="eyebrow mb-md">Engineering</p>
          <h1>Evidence</h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            A durable record of what was built, solved, learned, deployed,
            decided, and discovered.
          </p>
        </div>
        <Link
          href="/engineering/evidence/new"
          className="engineering-primary-link"
        >
          <Plus className="size-4" /> Add evidence
        </Link>
      </header>
      <section
        className="engineering-evidence-ledger"
        aria-labelledby="engineering-evidence-history-heading"
      >
        <header className="engineering-evidence-ledger-heading">
          <div>
            <p className="eyebrow mb-sm">Chronology</p>
            <h2
              id="engineering-evidence-history-heading"
              className="section-title"
            >
              Recorded work
            </h2>
          </div>
          <p>
            {evidence.length > 0
              ? `${evidence.length} recent ${evidence.length === 1 ? "record" : "records"}`
              : "No records yet"}
          </p>
        </header>
        <EngineeringEvidenceList evidence={evidence} journal />
      </section>
    </div>
  );
}
