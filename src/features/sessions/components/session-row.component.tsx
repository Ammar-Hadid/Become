"use client";

import { DateTime } from "luxon";
import { ChevronRight, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getEngineeringContextLabel } from "@/features/engineering/constants/engineering.constants";
import type { SessionListItem } from "@/features/sessions/types/session.types";
import {
  SESSION_RESOLUTION_STORAGE_KEY,
  SESSION_RESOLUTION_WINDOW_MS,
} from "@/features/sessions/constants/session-motion.constants";
import { useSessionDetails } from "@/features/sessions/details/hooks/use-session-details.hook";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

export function SessionRow({
  session: serverSession,
  showDate = true,
}: {
  session: SessionListItem;
  showDate?: boolean;
}) {
  const { openSession } = useSessionDetails();
  const { completedSessions } = useActiveTimer();
  const session = serverSession.endedAt
    ? serverSession
    : (completedSessions[serverSession.id] ?? serverSession);
  const [resolved, setResolved] = useState(false);
  const startedAt = DateTime.fromISO(session.startedAt).setZone(APP_TIMEZONE);
  const activity = session.contentActivitySnapshot || session.activityType.name;
  const title = session.description || activity;
  const engineeringMetadata =
    session.domain.slug === "engineering"
      ? [
          getEngineeringContextLabel(session.engineeringContext),
          session.engineeringProject?.name,
        ].filter(Boolean)
      : [];
  const contentMetadata = session.contentId
    ? [
        session.contentTitleSnapshot || "Untitled content",
        session.contentVariantSnapshot,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
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
          {session.domain.name} · {activity}
          {engineeringMetadata.length
            ? ` · ${engineeringMetadata.join(" · ")}`
            : ""}
          {contentMetadata ? ` · ${contentMetadata}` : ""}
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

  useEffect(() => {
    if (!session.endedAt) return;
    try {
      const stored = window.sessionStorage.getItem(
        SESSION_RESOLUTION_STORAGE_KEY,
      );
      if (!stored) return;
      const resolution = JSON.parse(stored) as {
        sessionId?: string;
        confirmedAt?: number;
      };
      const expired =
        typeof resolution.confirmedAt !== "number" ||
        Date.now() - resolution.confirmedAt > SESSION_RESOLUTION_WINDOW_MS;
      if (expired) {
        window.sessionStorage.removeItem(SESSION_RESOLUTION_STORAGE_KEY);
        return;
      }
      if (resolution.sessionId !== session.id) return;

      window.sessionStorage.removeItem(SESSION_RESOLUTION_STORAGE_KEY);
      const frame = window.requestAnimationFrame(() => setResolved(true));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      try {
        window.sessionStorage.removeItem(SESSION_RESOLUTION_STORAGE_KEY);
      } catch {
        // Motion is progressive enhancement; storage availability is optional.
      }
    }
  }, [session.endedAt, session.id]);

  if (session.endedAt) {
    return (
      <button
        type="button"
        id={id}
        className="session-row session-row-link"
        onClick={() => openSession(session)}
        aria-label={`View details for ${title}`}
        data-motion-arrival={resolved ? "resolved" : undefined}
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
