import { WorkspaceHeader } from "@/components/ui/workspace/workspace.component";
import type { Metadata } from "next";
import { EngineeringEvidenceForm } from "@/features/engineering/evidence/components/engineering-evidence-form.component";
import { getEngineeringEvidenceFormOptions } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "New Engineering evidence" };

export default async function NewEngineeringEvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; session?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [options, selected] = await Promise.all([
    getEngineeringEvidenceFormOptions(user.id),
    searchParams,
  ]);
  return (
    <div className="page-shell">
      <WorkspaceHeader
        eyebrow="Engineering evidence"
        title={<> Preserve what changed. </>}
        description="Evidence can stand alone or link to a session, a project, or both."
      />
      <section className="engineering-route-content">
        <EngineeringEvidenceForm
          projects={options.projects}
          sessions={options.sessions}
          selectedProjectId={selected.project}
          selectedSessionId={selected.session}
        />
      </section>
    </div>
  );
}
