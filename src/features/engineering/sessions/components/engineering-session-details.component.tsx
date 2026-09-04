import Link from "next/link";
import {
  getEngineeringContextLabel,
  getEngineeringEvidenceTypeLabel,
} from "@/features/engineering/constants/engineering.constants";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";

export function EngineeringSessionDetails({
  session,
}: {
  session: SessionDetailItem;
}) {
  return (
    <>
      <section data-testid="session-detail-engineering-context">
        <h3 className="eyebrow mb-sm">Engineering context</h3>
        <p className="text-text-secondary text-body">
          {getEngineeringContextLabel(session.engineeringContext)}
        </p>
      </section>
      {session.engineeringProject && (
        <section data-testid="session-detail-engineering-project">
          <h3 className="eyebrow mb-sm">Project</h3>
          <Link
            className="text-link"
            href={`/engineering/projects/${session.engineeringProject.id}`}
          >
            {session.engineeringProject.name}
          </Link>
        </section>
      )}
      {session.engineeringEvidence.length > 0 && (
        <section data-testid="session-detail-engineering-evidence">
          <h3 className="eyebrow mb-sm">Concrete evidence</h3>
          <div className="space-y-lg">
            {session.engineeringEvidence.map((evidence) => (
              <article key={evidence.id}>
                <p className="text-body font-medium">{evidence.title}</p>
                <p className="text-text-muted mt-xs text-meta">
                  {getEngineeringEvidenceTypeLabel(evidence.type)}
                </p>
                {evidence.details && (
                  <p className="text-text-secondary mt-sm text-body leading-6 whitespace-pre-wrap">
                    {evidence.details}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
