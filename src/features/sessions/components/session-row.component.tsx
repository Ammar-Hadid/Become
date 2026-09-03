import { DateTime } from "luxon";
import Link from "next/link";
import { ArrowUpRight, Circle } from "lucide-react";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import type { SessionListItem } from "@/features/sessions/session.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/period.util";

export function SessionRow({
  session,
  showDate = true,
  href,
}: {
  session: SessionListItem;
  showDate?: boolean;
  href?: string;
}) {
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {!session.endedAt && (
            <span className="running-label">
              <Circle className="size-2 fill-current" /> Running
            </span>
          )}
        </div>
        <p className="session-metadata mt-1 truncate text-[var(--text-muted)]">
          {session.domain.name} · {session.activityType.name}
          {session.outcome ? ` · ${session.outcome}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="timer-numerals text-sm font-medium">
          {formatDuration(session.durationSeconds, true)}
        </p>
        {showDate && (
          <p className="session-metadata mt-1 text-[var(--text-muted)]">
            {startedAt.toFormat("ccc, HH:mm")}
          </p>
        )}
      </div>
      {href && (
        <ArrowUpRight
          className="hidden size-4 text-[var(--text-muted)] sm:block"
          aria-hidden="true"
        />
      )}
    </>
  );

  const id = `session-${session.id}`;
  if (href) {
    return (
      <Link
        id={id}
        className="session-row session-row-link"
        href={href}
        aria-label={`View ${title} in session history`}
        data-testid="session-row-link"
      >
        {content}
      </Link>
    );
  }

  return (
    <article id={id} className="session-row" data-testid="session-row">
      {content}
    </article>
  );
}
