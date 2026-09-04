"use client";

import { useActionState, useRef } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons/button.component";
import { EngineeringTechStackField } from "@/features/engineering/technologies/components/engineering-tech-stack-field.component";
import {
  ENGINEERING_CONTEXT_OPTIONS,
  ENGINEERING_PROJECT_STATUS_OPTIONS,
} from "@/features/engineering/constants/engineering.constants";
import {
  createEngineeringProjectAction,
  type EngineeringFormState,
  updateEngineeringProjectAction,
} from "@/features/engineering/projects/actions/engineering-project.action";
import type {
  EngineeringProjectDetail,
  EngineeringTechnologyOption,
} from "@/features/engineering/types/engineering.types";
import { useUnsavedProjectFormGuard } from "@/features/engineering/projects/hooks/use-unsaved-project-form-guard.hook";

const initialState: EngineeringFormState = { error: null };

export function EngineeringProjectForm({
  project,
  technologyCatalog,
}: {
  project?: EngineeringProjectDetail;
  technologyCatalog: EngineeringTechnologyOption[];
}) {
  const action = project
    ? updateEngineeringProjectAction.bind(null, project.id)
    : createEngineeringProjectAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedProjectFormGuard(formRef);
  const cancelHref = project
    ? `/engineering/projects/${project.id}`
    : "/engineering/projects";

  return (
    <form ref={formRef} action={formAction} className="engineering-form">
      <div className="engineering-form-grid">
        <label className="engineering-form-wide block">
          <span className="field-label">Project name</span>
          <input
            className="text-input"
            name="name"
            defaultValue={project?.name ?? ""}
            maxLength={120}
            required
            autoFocus
            data-testid="engineering-project-name"
          />
        </label>
        <EngineeringTechStackField
          catalog={technologyCatalog}
          initialTechnologies={project?.technologies}
        />
        <label className="block">
          <span className="field-label">Project context</span>
          <span className="select-wrap">
            <select
              name="context"
              defaultValue={project?.context ?? "PERSONAL"}
              required
              data-testid="engineering-project-context"
            >
              {ENGINEERING_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block">
          <span className="field-label">Status</span>
          <span className="select-wrap">
            <select name="status" defaultValue={project?.status ?? "ACTIVE"}>
              {ENGINEERING_PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block">
          <span className="field-label">Started</span>
          <input
            className="text-input"
            type="date"
            name="startedOn"
            defaultValue={project?.startedOn ?? ""}
          />
        </label>
        <label className="block">
          <span className="field-label">Completed</span>
          <input
            className="text-input"
            type="date"
            name="completedOn"
            defaultValue={project?.completedOn ?? ""}
          />
        </label>
        <label className="engineering-form-wide block">
          <span className="field-label">
            Description{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <textarea
            className="text-input text-input--textarea-lg resize-y"
            name="description"
            defaultValue={project?.description ?? ""}
            maxLength={2000}
            placeholder="What is this project trying to become?"
          />
        </label>
        <label className="block">
          <span className="field-label">
            Repository URL{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <input
            className="text-input"
            type="url"
            name="repositoryUrl"
            defaultValue={project?.repositoryUrl ?? ""}
            maxLength={2048}
            placeholder="https://github.com/..."
          />
        </label>
        <label className="block">
          <span className="field-label">
            Live URL{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <input
            className="text-input"
            type="url"
            name="liveUrl"
            defaultValue={project?.liveUrl ?? ""}
            maxLength={2048}
            placeholder="https://..."
            data-testid="engineering-project-live-url"
          />
        </label>
        <label className="engineering-form-wide block">
          <span className="field-label">
            Notes{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <textarea
            className="text-input text-input--textarea-lg resize-y"
            name="notes"
            defaultValue={project?.notes ?? ""}
            maxLength={5000}
          />
        </label>
      </div>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="engineering-form-actions">
        <Link href={cancelHref} className="text-link">
          <ArrowLeft className="size-4" /> Cancel
        </Link>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          data-testid="save-engineering-project"
        >
          <Save className="size-4" /> {pending ? "Saving…" : "Save project"}
        </Button>
      </div>
    </form>
  );
}
