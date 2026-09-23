"use client";

import { useActionState } from "react";
import { DateTime } from "luxon";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons/button.component";
import { ENGINEERING_EVIDENCE_TYPE_OPTIONS } from "@/features/engineering/constants/engineering.constants";
import {
  createEngineeringEvidenceAction,
  updateEngineeringEvidenceAction,
} from "@/features/engineering/evidence/actions/engineering-evidence.action";
import type { EngineeringFormState } from "@/features/engineering/projects/actions/engineering-project.action";
import type {
  EngineeringEvidenceListItem,
  EngineeringProjectReference,
} from "@/features/engineering/types/engineering.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

type SessionOption = {
  id: string;
  label: string;
  startedAt: string;
  project: EngineeringProjectReference | null;
};

const initialState: EngineeringFormState = { error: null };

export function EngineeringEvidenceForm({
  evidence,
  projects,
  sessions,
  selectedProjectId,
  selectedSessionId,
}: {
  evidence?: EngineeringEvidenceListItem;
  projects: EngineeringProjectReference[];
  sessions: SessionOption[];
  selectedProjectId?: string;
  selectedSessionId?: string;
}) {
  const action = evidence
    ? updateEngineeringEvidenceAction.bind(null, evidence.id)
    : createEngineeringEvidenceAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const occurredAt = evidence
    ? DateTime.fromISO(evidence.occurredAt)
        .setZone(APP_TIMEZONE)
        .toFormat("yyyy-MM-dd'T'HH:mm")
    : DateTime.now().setZone(APP_TIMEZONE).toFormat("yyyy-MM-dd'T'HH:mm");

  return (
    <form
      action={formAction}
      className="engineering-form"
      aria-busy={pending}
      data-pending={pending || undefined}
    >
      <div className="engineering-form-grid">
        <label className="block">
          <span className="field-label">Evidence type</span>
          <span className="select-wrap">
            <select
              name="type"
              defaultValue={evidence?.type ?? "FEATURE_COMPLETED"}
              data-testid="engineering-evidence-type-select"
            >
              {ENGINEERING_EVIDENCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block">
          <span className="field-label">Occurred at</span>
          <input
            className="text-input"
            type="datetime-local"
            name="occurredAt"
            defaultValue={occurredAt}
            required
          />
        </label>
        <label className="engineering-form-wide block">
          <span className="field-label">Evidence</span>
          <input
            className="text-input"
            name="title"
            defaultValue={evidence?.title ?? ""}
            maxLength={160}
            required
            autoFocus
            placeholder="What was built, solved, or learned?"
            data-testid="engineering-evidence-title"
          />
        </label>
        <label className="block">
          <span className="field-label">
            Project{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <span className="select-wrap">
            <select
              name="projectId"
              defaultValue={selectedProjectId ?? evidence?.project?.id ?? ""}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block">
          <span className="field-label">
            Session{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <span className="select-wrap">
            <select
              name="sessionId"
              defaultValue={selectedSessionId ?? evidence?.session?.id ?? ""}
            >
              <option value="">No session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.label} ·{" "}
                  {DateTime.fromISO(session.startedAt)
                    .setZone(APP_TIMEZONE)
                    .toFormat("d LLL")}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="engineering-form-wide block">
          <span className="field-label">
            Details{" "}
            <span className="text-text-muted normal-case">— optional</span>
          </span>
          <textarea
            className="text-input text-input--textarea-md resize-y"
            name="details"
            defaultValue={evidence?.details ?? ""}
            maxLength={5000}
          />
        </label>
      </div>
      <p className="engineering-form-note">
        A linked session keeps its own context. Project links never determine or
        rewrite session context.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="engineering-form-actions">
        <Link href="/engineering/evidence" className="text-link">
          <ArrowLeft className="size-4" /> Cancel
        </Link>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          data-testid="save-engineering-evidence"
        >
          <Save className="size-4" /> {pending ? "Saving…" : "Save evidence"}
        </Button>
      </div>
    </form>
  );
}
