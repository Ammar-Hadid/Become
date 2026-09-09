"use client";
import { ChevronRight } from "lucide-react";
import { ENGINEERING_CONTEXT_OPTIONS } from "@/features/engineering/constants/engineering.constants";
import type { EngineeringContextValue } from "@/features/engineering/types/engineering.types";
export function EngineeringTimerFields({
  context,
  projectId,
  projects,
  onContextChange,
  onProjectChange,
  completion = false,
}: {
  context: EngineeringContextValue | "";
  projectId: string;
  projects: { id: string; name: string; context?: EngineeringContextValue }[];
  onContextChange: (value: EngineeringContextValue | "") => void;
  onProjectChange: (value: string) => void;
  completion?: boolean;
}) {
  const prefix = completion ? "completion-" : "";
  return (
    <div className="engineering-timer-fields">
      <label className="block">
        <span className="field-label">Context</span>
        <span className="select-wrap">
          <select
            value={context}
            onChange={(event) =>
              onContextChange(
                event.target.value as EngineeringContextValue | "",
              )
            }
            data-testid={`${prefix}engineering-context-select`}
          >
            <option value="">Choose a context</option>
            {ENGINEERING_CONTEXT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronRight className="size-4 rotate-90" />
        </span>
      </label>
      <label className="block">
        <span className="field-label">
          Project{" "}
          <span className="text-text-muted normal-case">— optional</span>
        </span>
        <span className="select-wrap">
          <select
            value={projectId}
            onChange={(event) => {
              onProjectChange(event.target.value);
              const project = projects.find(
                (project) => project.id === event.target.value,
              );
              if (!completion && project?.context)
                onContextChange(project.context);
            }}
            data-testid={`${prefix}engineering-project-select`}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronRight className="size-4 rotate-90" />
        </span>
      </label>
    </div>
  );
}
