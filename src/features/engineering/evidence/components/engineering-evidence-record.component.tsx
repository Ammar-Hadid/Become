"use client";

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
  Pencil,
  Rocket,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { getEngineeringEvidenceTypeLabel } from "@/features/engineering/constants/engineering.constants";
import type {
  EngineeringEvidenceListItem,
  EngineeringEvidenceTypeValue,
} from "@/features/engineering/types/engineering.types";
import { consumeEngineeringEvidenceArrival } from "@/features/engineering/evidence/utils/engineering-evidence-motion.util";
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

export function EngineeringEvidenceRecord({
  item,
  arrivedFromNavigation = false,
}: {
  item: EngineeringEvidenceListItem;
  arrivedFromNavigation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [arrived, setArrived] = useState(arrivedFromNavigation);
  const occurredAt = DateTime.fromISO(item.occurredAt).setZone(APP_TIMEZONE);
  const Icon = EVIDENCE_TYPE_ICONS[item.type];
  const detailsId = `evidence-details-${item.id}`;
  const titleId = `evidence-title-${item.id}`;
  const sessionLabel = item.session?.description || item.session?.activityName;

  useEffect(() => {
    const arrivedFromTimer = consumeEngineeringEvidenceArrival(item.id);
    if (!arrivedFromNavigation && !arrivedFromTimer) return;
    if (arrivedFromNavigation) {
      const url = new URL(window.location.href);
      url.searchParams.delete("created");
      window.history.replaceState(window.history.state, "", url);
    }
    const frame = window.requestAnimationFrame(() => setArrived(true));
    return () => window.cancelAnimationFrame(frame);
  }, [arrivedFromNavigation, item.id]);

  return (
    <li data-motion-arrival={arrived ? "new" : undefined}>
      <article className="engineering-evidence-entry" aria-labelledby={titleId}>
        <div
          className="engineering-evidence-entry-state"
          data-state={open ? "open" : "closed"}
          data-testid="evidence-record"
        >
          <button
            type="button"
            className="engineering-evidence-summary"
            aria-controls={detailsId}
            aria-expanded={open}
            data-testid="evidence-record-trigger"
            onClick={() => setOpen((value) => !value)}
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
            <span
              className="engineering-evidence-disclosure"
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </button>

          <div
            id={detailsId}
            className="engineering-evidence-expanded"
            aria-hidden={!open}
            inert={!open}
            data-testid="evidence-record-details"
          >
            <div className="engineering-evidence-expanded-clip">
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
          </div>
        </div>
      </article>
    </li>
  );
}
