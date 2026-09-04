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
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Engineering project</p>
          <h1>Edit {project.name}.</h1>
        </div>
      </header>
      <section className="mt-4xl">
        <EngineeringProjectForm
          project={project}
          technologyCatalog={technologyCatalog}
        />
      </section>
    </div>
  );
}
