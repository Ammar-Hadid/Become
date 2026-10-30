import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import type { Metadata } from "next";
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
      <WorkspaceHeader
        eyebrow="Engineering"
        title={<> Projects </>}
        description="Keep your work, time, and evidence together."
      />
      <WorkspacePanel className="engineering-route-content">
        <EngineeringProjectList projects={projects} scope={scope} />
      </WorkspacePanel>
    </div>
  );
}
