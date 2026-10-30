import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EngineeringEvidenceList } from "@/features/engineering/evidence/components/engineering-evidence-list.component";
import { getEngineeringEvidenceList } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Engineering evidence" };

export default async function EngineeringEvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [evidence, parameters] = await Promise.all([
    getEngineeringEvidenceList(user.id),
    searchParams,
  ]);
  const requestedArrivalId = Array.isArray(parameters.created)
    ? parameters.created[0]
    : parameters.created;
  const arrivalId = evidence.some((item) => item.id === requestedArrivalId)
    ? requestedArrivalId
    : undefined;
  return (
    <div className="page-shell engineering-evidence-page">
      <WorkspaceHeader
        eyebrow="Engineering"
        title={<> Evidence </>}
        description="The things you built, solved, and learned, ready to revisit."
        actions={
          <WorkspaceLink href="/engineering/evidence/new" variant="primary">
            <Plus /> Add evidence
          </WorkspaceLink>
        }
      />
      <WorkspacePanel className="engineering-evidence-ledger">
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
        <EngineeringEvidenceList
          evidence={evidence}
          journal
          arrivalId={arrivalId}
        />
      </WorkspacePanel>
    </div>
  );
}
