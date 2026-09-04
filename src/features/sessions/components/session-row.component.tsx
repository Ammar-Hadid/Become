"use client";

import { DateTime } from "luxon";
import { ChevronRight, Circle } from "lucide-react";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import type { SessionListItem } from "@/features/sessions/session.types";
import { useSessionDetails } from "@/features/sessions/use-session-details.hook";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/period.util";

export function SessionRow({
  session,
  showDate = true,
}: {
  session: SessionListItem;
  showDate?: boolean;
}) {
  const { openSession } = useSessionDetails();
  const startedAt = DateTime.fromISO(session.startedAt).setZone(APP_TIMEZONE);
  const title = session.description || session.activityType.name;
  const content = (
    <>
      <div
        className="session-domain-icon"
        style={{ color: session.domain.analyticsColor ?? undefined }}
      >
        <DomainIcon slug={session.domain.slug} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="gap-x-sm gap-y-xs flex flex-wrap items-center">
          <h3 className="text-body font-medium">{title}</h3>
          {!session.endedAt && (
            <span className="running-label">
              <Circle className="size-2 fill-current" /> Running
            </span>
          )}
        </div>
        <p className="session-metadata text-text-muted mt-xs truncate">
          {session.domain.name} · {session.activityType.name}
          {session.outcome ? ` · ${session.outcome}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="timer-numerals text-body font-medium">
          {formatDuration(session.durationSeconds, true)}
        </p>
        {showDate && (
          <p className="session-metadata text-text-muted mt-xs">
            {startedAt.toFormat("ccc, HH:mm")}
          </p>
        )}
      </div>
      {session.endedAt && (
        <ChevronRight
          className="text-text-muted hidden size-4 sm:block"
          aria-hidden="true"
        />
      )}
    </>
  );

  const id = `session-${session.id}`;
  if (session.endedAt) {
    return (
      <button
        type="button"
        id={id}
        className="session-row session-row-link"
        onClick={() => openSession(session)}
        aria-label={`View details for ${title}`}
        data-testid="session-row-trigger"
      >
        {content}
      </button>
    );
  }

  return (
    <article id={id} className="session-row" data-testid="session-row">
      {content}
    </article>
  );
}
