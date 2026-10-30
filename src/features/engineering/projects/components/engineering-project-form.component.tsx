"use client";

import { useActionState, useRef } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import {
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
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

  // Successful saves redirect; returned validation errors must preserve the draft.
  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="engineering-form"
      aria-busy={pending}
      data-pending={pending || undefined}
    >
      <WorkspacePanel
        title="What are you building?"
        description="A name and a context are enough to get started."
      >
        <div className="engineering-form-grid">
          <label className="engineering-form-wide block">
            <span className="field-label">Project name</span>
            <Input
              name="name"
              defaultValue={project?.name ?? ""}
              maxLength={120}
              required
              autoFocus
              data-testid="engineering-project-name"
            />
          </label>
          <label className="block">
            <span className="field-label">Project context</span>
            <NativeSelect
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
            </NativeSelect>
          </label>
          <label className="block">
            <span className="field-label">Status</span>
            <NativeSelect
              name="status"
              defaultValue={project?.status ?? "ACTIVE"}
            >
              {ENGINEERING_PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="engineering-form-wide block">
            <span className="field-label">
              Description{" "}
              <span className="text-text-muted normal-case">— optional</span>
            </span>
            <Textarea
              name="description"
              defaultValue={project?.description ?? ""}
              maxLength={2000}
              placeholder="What is this project trying to become?"
            />
          </label>
        </div>
      </WorkspacePanel>
      <WorkspacePanel
        title="Tools & technologies"
        description="Choose the stack when it helps describe the work."
      >
        <EngineeringTechStackField
          catalog={technologyCatalog}
          initialTechnologies={project?.technologies}
        />
      </WorkspacePanel>
      <WorkspaceDisclosure
        title="Links, dates & notes"
        description="Optional context you can add now or later"
        defaultOpen={Boolean(
          project?.repositoryUrl ||
          project?.liveUrl ||
          project?.notes ||
          project?.startedOn ||
          project?.completedOn,
        )}
      >
        <div className="engineering-form-grid">
          <label className="block">
            <span className="field-label">Started</span>
            <Input
              type="date"
              name="startedOn"
              defaultValue={project?.startedOn ?? ""}
            />
          </label>
          <label className="block">
            <span className="field-label">Completed</span>
            <Input
              type="date"
              name="completedOn"
              defaultValue={project?.completedOn ?? ""}
            />
          </label>
          <label className="block">
            <span className="field-label">
              Repository URL{" "}
              <span className="text-text-muted normal-case">— optional</span>
            </span>
            <Input
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
            <Input
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
            <Textarea
              name="notes"
              defaultValue={project?.notes ?? ""}
              maxLength={5000}
            />
          </label>
        </div>
      </WorkspaceDisclosure>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="engineering-form-actions">
        <WorkspaceLink href={cancelHref} variant="ghost">
          <ArrowLeft className="size-4" /> Cancel
        </WorkspaceLink>
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
