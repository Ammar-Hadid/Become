import { ExternalLink, Pencil, RotateCcw, Archive } from "lucide-react";
import { ViewTransition } from "react";
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { Button } from "@/components/ui/buttons/button.component";
import { EngineeringEvidenceList } from "@/features/engineering/evidence/components/engineering-evidence-list.component";
import { EngineeringTechnologyStack } from "@/features/engineering/technologies/components/engineering-technology-stack.component";
import {
  getEngineeringContextLabel,
  getEngineeringProjectStatusLabel,
} from "@/features/engineering/constants/engineering.constants";
import {
  archiveEngineeringProjectAction,
  restoreEngineeringProjectAction,
} from "@/features/engineering/projects/actions/engineering-project.action";
import type { EngineeringProjectDetail } from "@/features/engineering/types/engineering.types";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { formatDuration } from "@/lib/dates/utils/period.util";

export function EngineeringProjectDetailView({
  project,
}: {
  project: EngineeringProjectDetail;
}) {
  return (
    <div className="page-shell engineering-project-page">
      <WorkspaceLink href="/engineering/projects" variant="ghost">
        ← All projects
      </WorkspaceLink>
      <WorkspaceHeader
        eyebrow="Engineering project"
        title={
          <ViewTransition
            name={`engineering-project-${project.id}`}
            share="motion-carry"
            default="none"
          >
            <span>{project.name}</span>
          </ViewTransition>
        }
        description={
          project.description || "Your work, connected to time and evidence."
        }
        actions={
          <div className="engineering-header-actions">
            <WorkspaceLink
              href={`/engineering/projects/${project.id}/edit`}
              variant="secondary"
            >
              <Pencil className="size-4" /> Edit
            </WorkspaceLink>
            {project.archivedAt ? (
              <form action={restoreEngineeringProjectAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" variant="secondary">
                  <RotateCcw className="size-4" /> Restore
                </Button>
              </form>
            ) : (
              <form action={archiveEngineeringProjectAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" variant="secondary">
                  <Archive className="size-4" /> Archive
                </Button>
              </form>
            )}
          </div>
        }
      />

      <WorkspacePanel className="engineering-project-facts" spacing="dense">
        <div>
          <span>Project context</span>
          <strong data-testid="engineering-project-detail-context">
            {getEngineeringContextLabel(project.context)}
          </strong>
        </div>
        <div>
          <span>Status</span>
          <strong>
            {getEngineeringProjectStatusLabel(project.status)}
            {project.archivedAt ? " · Archived" : ""}
          </strong>
        </div>
        <div>
          <span>Recorded time</span>
          <strong className="timer-numerals">
            {formatDuration(project.totalSeconds, true)}
          </strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{project.sessionCount}</strong>
        </div>
        <div>
          <span>Evidence</span>
          <strong>{project.evidenceCount}</strong>
        </div>
      </WorkspacePanel>

      {project.technologies.length > 0 && (
        <WorkspacePanel
          className="engineering-project-stack"
          title="Technology stack"
        >
          <EngineeringTechnologyStack technologies={project.technologies} />
          <p className="engineering-field-help mt-md">
            Project association only; technologies are not attributed to
            individual sessions.
          </p>
        </WorkspacePanel>
      )}

      {(project.repositoryUrl ||
        project.liveUrl ||
        project.startedOn ||
        project.completedOn) && (
        <WorkspacePanel className="engineering-project-links" spacing="dense">
          {project.repositoryUrl && (
            <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
              Repository <ExternalLink />
            </a>
          )}
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noreferrer">
              Live project <ExternalLink />
            </a>
          )}
          {project.startedOn && <span>Started {project.startedOn}</span>}
          {project.completedOn && <span>Completed {project.completedOn}</span>}
        </WorkspacePanel>
      )}

      {project.notes && (
        <WorkspacePanel
          className="engineering-project-notes"
          title="Project notes"
        >
          <p>{project.notes}</p>
        </WorkspacePanel>
      )}

      <WorkspacePanel className="engineering-output-section">
        <div className="engineering-section-heading">
          <div>
            <p className="eyebrow mb-sm">Evidence</p>
            <h2 className="section-title">What came from the work</h2>
          </div>
          <WorkspaceLink
            href={`/engineering/evidence/new?project=${project.id}`}
            variant="secondary"
          >
            Add evidence
          </WorkspaceLink>
        </div>
        <EngineeringEvidenceList evidence={project.evidence} />
      </WorkspacePanel>

      <WorkspacePanel className="engineering-output-section">
        <div className="engineering-section-heading">
          <div>
            <p className="eyebrow mb-sm">History</p>
            <h2 className="section-title">Project sessions</h2>
          </div>
        </div>
        <div className="divide-border border-border divide-y border-y">
          {project.sessions.length ? (
            project.sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <div className="empty-state">
              <p>No sessions linked to this project.</p>
            </div>
          )}
        </div>
      </WorkspacePanel>
    </div>
  );
}
