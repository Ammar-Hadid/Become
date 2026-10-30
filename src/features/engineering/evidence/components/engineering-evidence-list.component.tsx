import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import { WorkspaceLink } from "@/components/ui/workspace/workspace.component";
import { DateTime } from "luxon";
import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { getEngineeringEvidenceTypeLabel } from "@/features/engineering/constants/engineering.constants";
import { EngineeringEvidenceRecord } from "@/features/engineering/evidence/components/engineering-evidence-record.component";
import type { EngineeringEvidenceListItem } from "@/features/engineering/types/engineering.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export function EngineeringEvidenceList({
  evidence,
  compact = false,
  journal = false,
  arrivalId,
}: {
  evidence: EngineeringEvidenceListItem[];
  compact?: boolean;
  journal?: boolean;
  arrivalId?: string;
}) {
  if (!evidence.length) {
    return journal ? <EvidenceEmptyState /> : <CompactEmptyState />;
  }

  if (!journal) {
    return (
      <div className="engineering-record-list">
        {evidence.map((item) => (
          <StandardEvidenceRecord key={item.id} item={item} compact={compact} />
        ))}
      </div>
    );
  }

  const evidenceByYear = groupEvidenceByYear(evidence);

  return (
    <div className="engineering-evidence-history">
      {evidenceByYear.map(([year, records]) => (
        <section
          key={year}
          className="engineering-evidence-year"
          aria-labelledby={`evidence-year-${year}`}
        >
          <div className="engineering-evidence-year-marker">
            <h3 id={`evidence-year-${year}`}>{year}</h3>
            <span aria-hidden="true" />
          </div>
          <ol className="engineering-evidence-timeline">
            {records.map((item) => (
              <EngineeringEvidenceRecord
                key={item.id}
                item={item}
                arrivedFromNavigation={item.id === arrivalId}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function StandardEvidenceRecord({
  item,
  compact,
}: {
  item: EngineeringEvidenceListItem;
  compact: boolean;
}) {
  const occurredAt = DateTime.fromISO(item.occurredAt).setZone(APP_TIMEZONE);

  return (
    <article className="engineering-record-row">
      <span className="engineering-record-icon" aria-hidden="true">
        <Lightbulb />
      </span>
      <span className="min-w-0 flex-1">
        <span className="engineering-record-heading">
          <strong>{item.title}</strong>
          <span>{getEngineeringEvidenceTypeLabel(item.type)}</span>
        </span>
        <span className="engineering-record-meta">
          {occurredAt.toFormat("d LLL yyyy · HH:mm")}
          {item.project ? ` · ${item.project.name}` : ""}
          {item.session
            ? ` · ${item.session.description || item.session.activityName}`
            : ""}
        </span>
        {!compact && item.details && (
          <span className="engineering-record-copy">{item.details}</span>
        )}
      </span>
      {!compact && (
        <Link
          href={`/engineering/evidence/${item.id}/edit`}
          className="text-link engineering-inline-link shrink-0"
        >
          Edit <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

function EvidenceEmptyState() {
  return (
    <EmptyState
      pattern="editorial-canvas"
      area="engineering"
      title="No evidence recorded yet"
      description="Keep a feature, fix, lesson, or discovery. A short note is enough to begin."
      action={
        <WorkspaceLink href="/engineering/evidence/new" variant="primary">
          Add the first record <ArrowRight />
        </WorkspaceLink>
      }
    />
  );
}

function CompactEmptyState() {
  return (
    <EmptyState
      pattern="publication-pause"
      area="engineering"
      size="compact"
      title="No Engineering evidence recorded yet"
      description="Capture what changed when the work is fresh."
    />
  );
}

function groupEvidenceByYear(evidence: EngineeringEvidenceListItem[]) {
  const groups = new Map<string, EngineeringEvidenceListItem[]>();

  for (const item of evidence) {
    const year = DateTime.fromISO(item.occurredAt)
      .setZone(APP_TIMEZONE)
      .toFormat("yyyy");
    const group = groups.get(year) ?? [];
    group.push(item);
    groups.set(year, group);
  }

  return Array.from(groups.entries());
}
