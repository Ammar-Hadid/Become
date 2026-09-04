import { DateTime } from "luxon";
import {
  ArrowRight,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  Clock3,
  FolderKanban,
  GitBranch,
  Lightbulb,
  Pencil,
  Rocket,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { getEngineeringEvidenceTypeLabel } from "@/features/engineering/constants/engineering.constants";
import type {
  EngineeringEvidenceListItem,
  EngineeringEvidenceTypeValue,
} from "@/features/engineering/types/engineering.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

const EVIDENCE_TYPE_ICONS: Record<
  EngineeringEvidenceTypeValue,
  ComponentType<{ className?: string }>
> = {
  FEATURE_COMPLETED: Check,
  BUG_SOLVED: Bug,
  CONCEPT_LEARNED: BookOpen,
  DEPLOYMENT: Rocket,
  ARCHITECTURE_DECISION: GitBranch,
  TECHNICAL_DISCOVERY: Search,
};

export function EngineeringEvidenceList({
  evidence,
  compact = false,
  journal = false,
}: {
  evidence: EngineeringEvidenceListItem[];
  compact?: boolean;
  journal?: boolean;
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
              <li key={item.id}>
                <EvidenceRecord item={item} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function EvidenceRecord({ item }: { item: EngineeringEvidenceListItem }) {
  const occurredAt = DateTime.fromISO(item.occurredAt).setZone(APP_TIMEZONE);
  const Icon = EVIDENCE_TYPE_ICONS[item.type];
  const detailsId = `evidence-details-${item.id}`;
  const titleId = `evidence-title-${item.id}`;
  const sessionLabel = item.session?.description || item.session?.activityName;

  return (
    <article className="engineering-evidence-entry" aria-labelledby={titleId}>
      <details data-testid="evidence-record">
        <summary
          className="engineering-evidence-summary"
          aria-controls={detailsId}
          data-testid="evidence-record-trigger"
        >
          <span className="engineering-evidence-date" aria-hidden="true">
            <strong>{occurredAt.toFormat("dd")}</strong>
            <span>{occurredAt.toFormat("LLL")}</span>
          </span>
          <span className="engineering-evidence-type-icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="engineering-evidence-summary-copy">
            <span className="engineering-evidence-type-label">
              {getEngineeringEvidenceTypeLabel(item.type)}
            </span>
            <span id={titleId} className="engineering-evidence-title">
              {item.title}
            </span>
            <span className="engineering-evidence-summary-meta">
              <time dateTime={item.occurredAt}>
                {occurredAt.toFormat("d LLL yyyy · HH:mm")}
              </time>
              {item.project && (
                <span>
                  <FolderKanban aria-hidden="true" />
                  {item.project.name}
                </span>
              )}
              {sessionLabel && (
                <span>
                  <Clock3 aria-hidden="true" />
                  {sessionLabel}
                </span>
              )}
            </span>
          </span>
          <span className="engineering-evidence-disclosure" aria-hidden="true">
            <ChevronDown />
          </span>
        </summary>

        <div
          id={detailsId}
          className="engineering-evidence-expanded"
          data-testid="evidence-record-details"
        >
          <div className="engineering-evidence-expanded-inner">
            <div className="engineering-evidence-narrative">
              <p className="eyebrow">Record notes</p>
              {item.details ? (
                <p>{item.details}</p>
              ) : (
                <p className="engineering-evidence-no-details">
                  No additional notes were recorded.
                </p>
              )}
            </div>

            <dl className="engineering-evidence-facts">
              <div>
                <dt>Type</dt>
                <dd>{getEngineeringEvidenceTypeLabel(item.type)}</dd>
              </div>
              <div>
                <dt>Recorded</dt>
                <dd>
                  <time dateTime={item.occurredAt}>
                    {occurredAt.toFormat("d LLLL yyyy 'at' HH:mm")}
                  </time>
                </dd>
              </div>
              {item.project && (
                <div>
                  <dt>Project</dt>
                  <dd>
                    <Link href={`/engineering/projects/${item.project.id}`}>
                      {item.project.name} <ArrowRight aria-hidden="true" />
                    </Link>
                  </dd>
                </div>
              )}
              {sessionLabel && (
                <div>
                  <dt>Session context</dt>
                  <dd>{sessionLabel}</dd>
                </div>
              )}
              {!item.project && !sessionLabel && (
                <div>
                  <dt>Context</dt>
                  <dd>Independent record</dd>
                </div>
              )}
            </dl>

            <Link
              href={`/engineering/evidence/${item.id}/edit`}
              className="engineering-evidence-edit-link"
              data-testid="evidence-edit-link"
            >
              <Pencil aria-hidden="true" /> Edit record
            </Link>
          </div>
        </div>
      </details>
    </article>
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
