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
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Engineering project</p>
          <h1>Start a project.</h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            Give the project a clear setting and stack. Each session still
            records its own independent context.
          </p>
        </div>
      </header>
      <section className="mt-4xl">
        <EngineeringProjectForm technologyCatalog={technologyCatalog} />
      </section>
    </div>
  );
}
