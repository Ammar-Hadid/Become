import { WorkspaceHeader } from "@/components/ui/workspace/workspace.component";
import type { Metadata } from "next";
import { EngineeringProjectForm } from "@/features/engineering/projects/components/engineering-project-form.component";
import { getEngineeringTechnologyCatalog } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "New Engineering project" };

export default async function NewEngineeringProjectPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const technologyCatalog = await getEngineeringTechnologyCatalog(user.id);
  return (
    <div className="page-shell">
      <WorkspaceHeader
        eyebrow="Engineering project"
        title={<> Start a project. </>}
        description="Start with the basics. Add the rest as the work takes shape."
      />
      <section className="engineering-route-content">
        <EngineeringProjectForm technologyCatalog={technologyCatalog} />
      </section>
    </div>
  );
}
