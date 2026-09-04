import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
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
            <Link
              key={value}
              href={`/engineering/projects?scope=${value}`}
              className={cn(scope === value && "active")}
            >
              {label}
            </Link>
          ))}
        </div>
        <Link
          href="/engineering/projects/new"
          className="engineering-primary-link"
        >
          <Plus className="size-4" /> New project
        </Link>
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
                  <strong>{project.name}</strong>
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
            <Link href="/engineering/projects/new" className="text-link">
              Create a project <ArrowRight />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
