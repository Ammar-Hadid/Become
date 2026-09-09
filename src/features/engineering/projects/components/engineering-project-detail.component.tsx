import { ExternalLink, Pencil, RotateCcw, Archive } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
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
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Engineering project</p>
          <ViewTransition
            name={`engineering-project-${project.id}`}
            share="motion-carry"
            default="none"
          >
            <h1>{project.name}</h1>
          </ViewTransition>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            {project.description ||
              "A body of Engineering work, connected to time and evidence."}
          </p>
        </div>
        <div className="engineering-header-actions">
          <Link
            href={`/engineering/projects/${project.id}/edit`}
            className="engineering-secondary-link"
          >
            <Pencil className="size-4" /> Edit
          </Link>
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
      </header>

      <section className="engineering-project-facts">
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
      </section>

      {project.technologies.length > 0 && (
        <section className="engineering-project-stack">
          <p className="eyebrow mb-md">Technology stack</p>
          <EngineeringTechnologyStack technologies={project.technologies} />
          <p className="engineering-field-help mt-md">
            Project association only; technologies are not attributed to
            individual sessions.
          </p>
        </section>
      )}

      {(project.repositoryUrl ||
        project.liveUrl ||
        project.startedOn ||
        project.completedOn) && (
        <section className="engineering-project-links">
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
        </section>
      )}

      {project.notes && (
        <section className="engineering-project-notes">
          <p className="eyebrow mb-md">Project notes</p>
          <p>{project.notes}</p>
        </section>
      )}

      <section className="engineering-output-section">
        <div className="engineering-section-heading">
          <div>
            <p className="eyebrow mb-sm">Evidence</p>
            <h2 className="section-title">What came from the work</h2>
          </div>
          <Link
            href={`/engineering/evidence/new?project=${project.id}`}
            className="text-link"
          >
            Add evidence
          </Link>
        </div>
        <EngineeringEvidenceList evidence={project.evidence} />
      </section>

      <section className="engineering-output-section">
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
      </section>
    </div>
  );
}
