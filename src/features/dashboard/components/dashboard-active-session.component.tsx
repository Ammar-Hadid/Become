"use client";

import { DateTime } from "luxon";
import { Pause } from "lucide-react";
import { getEngineeringContextLabel } from "@/features/engineering/constants/engineering.constants";
import { SessionTimerActions } from "@/features/sessions/timer/components/session-timer-actions.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

export function DashboardActiveSession() {
  const {
    activeSession: session,
    elapsedSeconds,
    pendingOperation,
  } = useActiveTimer();
  if (!session) return null;
  const paused = session.status === "PAUSED";
  const activity = session.contentActivitySnapshot || session.activityType.name;
  const context = [
    session.domain.name,
    activity,
    session.engineeringContext
      ? getEngineeringContextLabel(session.engineeringContext)
      : null,
    session.engineeringProject?.name,
    session.contentTitleSnapshot,
    session.contentVariantSnapshot,
    session.businessCompanySnapshot,
    session.businessNicheSnapshot,
  ]
    .filter(Boolean)
    .join(" · ");
  const started = DateTime.fromISO(session.startedAt)
    .setZone(APP_TIMEZONE)
    .toFormat("HH:mm");
  const pauseTime = session.pausedAt
    ? DateTime.fromISO(session.pausedAt).setZone(APP_TIMEZONE).toFormat("HH:mm")
    : null;

  return (
    <article
      className="dashboard-session-panel"
      data-status={session.status}
      aria-labelledby="dashboard-session-title"
      aria-busy={Boolean(pendingOperation)}
      data-testid="dashboard-active-session"
      data-session-id={session.id}
      data-elapsed-seconds={elapsedSeconds}
    >
      <div className="dashboard-session-heading">
        <span
          className={paused ? "dashboard-session-pause-mark" : "active-orbit"}
          aria-hidden="true"
        >
          {paused ? <Pause className="size-4 fill-current" /> : <span />}
        </span>
        <div className="min-w-0">
          <p
            className={
              paused ? "eyebrow text-text-secondary" : "eyebrow text-primary"
            }
          >
            {paused ? "Session paused" : "In focus now"}
          </p>
          <h2
            id="dashboard-session-title"
            className="text-h5 mt-sm font-semibold"
          >
            {session.description || activity}
          </h2>
          <p className="text-text-secondary text-body-sm mt-xs">{context}</p>
        </div>
      </div>
      <div className="dashboard-session-time">
        <div>
          <p className="text-text-muted text-body-sm">Focused time</p>
          <p
            className="timer-numerals text-h4 mt-xs font-semibold"
            data-testid="dashboard-active-session-time"
          >
            {formatDuration(elapsedSeconds)}
          </p>
        </div>
        <p className="text-text-muted text-body-sm">
          Started {started}
          {pauseTime ? <> · Paused at {pauseTime}</> : null}
          <span className="text-text-secondary mt-xs block">
            {paused
              ? "Break time is excluded. Resume when you’re ready."
              : "One session. Room for a break."}
          </span>
        </p>
      </div>
      <SessionTimerActions className="dashboard-session-actions" />
    </article>
  );
}
