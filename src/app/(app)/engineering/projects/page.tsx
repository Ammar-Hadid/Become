import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { EngineeringProjectList } from "@/features/engineering/projects/components/engineering-project-list.component";
import { getEngineeringProjects } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Engineering projects" };

export default async function EngineeringProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const requestedScope = (await searchParams).scope;
  const scope =
    requestedScope === "completed" || requestedScope === "archived"
      ? requestedScope
      : "open";
  const projects = await getEngineeringProjects(user.id, scope);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Engineering</p>
          <h1>Projects</h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            Bodies of work that connect optional project structure to sessions
            and concrete evidence.
          </p>
        </div>
        <span className="header-icon">
          <FolderKanban />
        </span>
      </header>
      <section className="mt-4xl">
        <EngineeringProjectList projects={projects} scope={scope} />
      </section>
    </div>
  );
}
