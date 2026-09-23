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
          className="text-link shrink-0"
        >
          Edit <ArrowRight className="size-3.5" />
        </Link>
      )}
    </article>
  );
}

function EvidenceEmptyState() {
  return (
    <div className="engineering-evidence-empty">
      <span aria-hidden="true">
        <Lightbulb />
      </span>
      <div>
        <h2>No evidence recorded yet</h2>
        <p>
          Features, fixes, lessons, deployments, decisions, and discoveries will
          form your Engineering history here.
        </p>
      </div>
      <Link href="/engineering/evidence/new" className="text-link">
        Add the first record <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}

function CompactEmptyState() {
  return (
    <div className="empty-state">
      <p>No Engineering evidence recorded yet.</p>
    </div>
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
