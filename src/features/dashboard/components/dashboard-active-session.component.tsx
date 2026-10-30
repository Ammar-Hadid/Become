"use client";

import { DateTime } from "luxon";
import { Clock3 } from "lucide-react";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { SessionTimerActions } from "@/features/sessions/timer/components/session-timer-actions.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

export function DashboardActiveSession() {
  const { activeSession: session, elapsedSeconds, pendingOperation } = useActiveTimer();
  if (!session) return null;
  const paused = session.status === "PAUSED";
  const activity = session.contentActivitySnapshot || session.activityType.name;
  const context = [session.domain.name, activity, session.engineeringProject?.name]
    .filter(Boolean)
    .join(" · ");
  const started = DateTime.fromISO(session.startedAt).setZone(APP_TIMEZONE).toFormat("HH:mm");

  return (
    <article
      className="dashboard-v2-active-session material-glass"
      data-status={session.status}
      aria-labelledby="dashboard-v2-active-title"
      aria-busy={Boolean(pendingOperation)}
      data-testid="dashboard-active-session"
      data-session-id={session.id}
      data-elapsed-seconds={elapsedSeconds}
    >
      <div className="dashboard-v2-active-main">
        <IconFrame treatment="compact" area="dashboard"><Clock3 /></IconFrame>
        <div>
          <p className="type-overline">{paused ? "Session paused" : "In focus now"}</p>
          <h2 className="type-widget-title" id="dashboard-v2-active-title">{session.description || activity}</h2>
          <p className="type-caption">{context} · Started {started}</p>
        </div>
      </div>
      <div className="dashboard-v2-active-time">
        <span className="type-caption">Focused time</span>
        <strong className="type-metric-md timer-numerals" data-testid="dashboard-active-session-time">{formatDuration(elapsedSeconds)}</strong>
        {paused && <span className="type-caption">Breaks excluded</span>}
      </div>
      <SessionTimerActions className="dashboard-v2-active-actions" />
    </article>
  );
}
