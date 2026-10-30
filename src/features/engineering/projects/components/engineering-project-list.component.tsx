import { WorkspaceLink } from "@/components/ui/workspace/workspace.component";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { EngineeringTechnologyStack } from "@/features/engineering/technologies/components/engineering-technology-stack.component";
import {
  getEngineeringContextLabel,
  getEngineeringProjectStatusLabel,
} from "@/features/engineering/constants/engineering.constants";
import type { EngineeringProjectListItem } from "@/features/engineering/types/engineering.types";
import { cn } from "@/lib/styles/utils/class-name.util";

export function EngineeringProjectList({
  projects,
  scope,
}: {
  projects: EngineeringProjectListItem[];
  scope: "open" | "completed" | "archived" | "all";
}) {
  return (
    <>
      <div className="engineering-list-toolbar">
        <div className="timeframe-switcher" aria-label="Project status filter">
          {[
            ["open", "Open"],
            ["completed", "Completed"],
            ["archived", "Archived"],
          ].map(([value, label]) => (
            <WorkspaceLink
              key={value}
              href={`/engineering/projects?scope=${value}`}
              variant={scope === value ? "secondary" : "ghost"}
              aria-current={scope === value ? "page" : undefined}
              className={cn(
                "motion-selection-control",
                scope === value && "active",
              )}
            >
              {scope === value && (
                <ViewTransition
                  name="engineering-project-filter-indicator"
                  share="motion-guide"
                  default="none"
                >
                  <span className="motion-selection-guide" aria-hidden />
                </ViewTransition>
              )}
              <span>{label}</span>
            </WorkspaceLink>
          ))}
        </div>
        <WorkspaceLink href="/engineering/projects/new" variant="primary">
          <Plus className="size-4" /> New project
        </WorkspaceLink>
      </div>

      <div className="engineering-record-list">
        {projects.length ? (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/engineering/projects/${project.id}`}
              className="engineering-record-row"
              data-testid="engineering-project-row"
            >
              <span className="engineering-record-icon">
                <FolderKanban />
              </span>
              <span className="min-w-0 flex-1">
                <span className="engineering-record-heading">
                  <ViewTransition
                    name={`engineering-project-${project.id}`}
                    share="motion-carry"
                    default="none"
                  >
                    <strong>{project.name}</strong>
                  </ViewTransition>
                  <span>
                    {getEngineeringProjectStatusLabel(project.status)}
                  </span>
                </span>
                <span className="engineering-record-meta">
                  {getEngineeringContextLabel(project.context)} ·{" "}
                  {project.sessionCount}{" "}
                  {project.sessionCount === 1 ? "session" : "sessions"} ·{" "}
                  {project.evidenceCount} evidence{" "}
                  {project.evidenceCount === 1 ? "record" : "records"}
                </span>
                {project.technologies.length > 0 && (
                  <EngineeringTechnologyStack
                    technologies={project.technologies}
                    limit={4}
                  />
                )}
                {project.description && (
                  <span className="engineering-record-copy">
                    {project.description}
                  </span>
                )}
              </span>
              <ArrowRight className="text-text-muted size-4 shrink-0" />
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>No projects in this view.</p>
            <Link
              href="/engineering/projects/new"
              className="text-link engineering-inline-link"
            >
              Create a project <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
