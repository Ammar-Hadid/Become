import { WorkspaceHeader } from "@/components/ui/workspace/workspace.component";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineeringProjectForm } from "@/features/engineering/projects/components/engineering-project-form.component";
import {
  getEngineeringProjectById,
  getEngineeringTechnologyCatalog,
} from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Edit Engineering project" };

export default async function EditEngineeringProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { projectId } = await params;
  const [project, technologyCatalog] = await Promise.all([
    getEngineeringProjectById(user.id, projectId),
    getEngineeringTechnologyCatalog(user.id),
  ]);
  if (!project) notFound();
  return (
    <div className="page-shell">
      <WorkspaceHeader
        eyebrow="Engineering project"
        title={<> Edit {project.name}. </>}
      />
      <section className="engineering-route-content">
        <EngineeringProjectForm
          project={project}
          technologyCatalog={technologyCatalog}
        />
      </section>
    </div>
  );
}
