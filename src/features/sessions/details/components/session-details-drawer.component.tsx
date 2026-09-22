"use client";

import { DateTime } from "luxon";
import { CalendarDays, Clock3, Pause, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, type AnimationEvent } from "react";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import type { MotionPresenceState } from "@/components/ui/motion/hooks/use-presence.hook";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { SessionTimeEditor } from "@/features/sessions/details/components/session-time-editor.component";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

type SessionDetailsDrawerProps = {
  session: SessionDetailItem;
  open: boolean;
  presenceState: MotionPresenceState;
  exiting: boolean;
  onPresenceAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  onClose: () => void;
  onSessionUpdated: (session: SessionDetailItem) => void;
  children?: React.ReactNode;
};

export function SessionDetailsDrawer({
  session,
  open,
  presenceState,
  exiting,
  onPresenceAnimationEnd,
  onClose,
  onSessionUpdated,
  children,
}: SessionDetailsDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const startedAt = DateTime.fromISO(session.startedAt).setZone(APP_TIMEZONE);
  const endedAt = session.endedAt
    ? DateTime.fromISO(session.endedAt).setZone(APP_TIMEZONE)
    : null;
  const focus = session.description?.trim();
  const outcome = session.outcome?.trim();
  const notes = session.notes?.trim();
  const hasEvidence = Boolean(focus || outcome || notes || children);
  const activity = session.contentActivitySnapshot || session.activityType.name;

  useModalLayer({
    open,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  return (
    <div
      className="session-details-backdrop"
      data-state={presenceState}
      aria-hidden={!open}
      inert={exiting}
      onAnimationEnd={onPresenceAnimationEnd}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="session-details-backdrop"
    >
      <section
        ref={drawerRef}
        className="session-details-drawer"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={titleId}
        data-testid="session-details"
      >
        <header className="session-details-header">
          <div className="min-w-0">
            <p className="eyebrow mb-md">Session details</p>
            <h2
              id={titleId}
              className="text-h3 font-semibold tracking-[-0.04em]"
            >
              {focus || activity}
            </h2>
            <p className="text-text-secondary mt-sm text-body">
              {session.domain.name} · {activity}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button shrink-0"
            onClick={onClose}
            aria-label="Close session details"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="session-details-summary">
          <div
            className="session-details-domain-icon"
            style={{ color: session.domain.analyticsColor ?? undefined }}
          >
            <DomainIcon slug={session.domain.slug} />
          </div>
          <div>
            <p
              className="text-body font-medium"
              data-testid="session-detail-domain"
            >
              {session.domain.name}
            </p>
            <p
              className="text-text-muted mt-xs text-body"
              data-testid="session-detail-activity"
            >
              {activity}
            </p>
            {session.contentId && (
              <Link
                href={`/content/${session.contentId}`}
                className="text-primary mt-sm text-body-sm hover:text-primary-hover focus-visible:outline-primary block focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {session.contentTitleSnapshot || "Untitled content"}
                {session.contentVariantSnapshot
                  ? ` · ${session.contentVariantSnapshot}`
                  : ""}
              </Link>
            )}
          </div>
        </div>

        <dl className="session-details-timing">
          <div>
            <dt>
              <CalendarDays aria-hidden="true" /> Started
            </dt>
            <dd data-testid="session-detail-start">
              {formatDateTime(startedAt)}
            </dd>
          </div>
          {endedAt && (
            <div>
              <dt>
                <CalendarDays aria-hidden="true" /> Ended
              </dt>
              <dd data-testid="session-detail-end">
                {formatDateTime(endedAt)}
              </dd>
            </div>
          )}
        </dl>

        <dl className="session-details-durations">
          <div className="session-details-duration-focus">
            <dt>
              <Clock3 aria-hidden="true" /> Focused time
            </dt>
            <dd
              className="timer-numerals"
              data-testid="session-detail-duration"
            >
              {formatDetailDuration(session.durationSeconds)}
            </dd>
          </div>
          {session.totalPausedMilliseconds > 0 && (
            <div>
              <dt>
                <Pause aria-hidden="true" /> Break time
              </dt>
              <dd>
                <span
                  className="timer-numerals"
                  data-testid="session-detail-break-time"
                >
                  {formatDetailDuration(
                    Math.floor(session.totalPausedMilliseconds / 1000),
                  )}
                </span>
                <span className="session-details-duration-note">
                  Excluded from focused time
                </span>
              </dd>
            </div>
          )}
        </dl>

        <SessionTimeEditor session={session} onSaved={onSessionUpdated} />

        {hasEvidence && (
          <div className="session-details-evidence">
            {focus && (
              <DetailSection
                label="Focus / intention"
                testId="session-detail-focus"
              >
                {focus}
              </DetailSection>
            )}
            {outcome && (
              <DetailSection label="Outcome" testId="session-detail-outcome">
                {outcome}
              </DetailSection>
            )}
            {notes && (
              <DetailSection label="Notes" testId="session-detail-notes">
                {notes}
              </DetailSection>
            )}
            {children}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailSection({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section data-testid={testId}>
      <h3 className="eyebrow mb-sm">{label}</h3>
      <p className="text-text-secondary text-body whitespace-pre-wrap">
        {children}
      </p>
    </section>
  );
}

function formatDateTime(value: DateTime) {
  return value.toFormat("cccc, d LLLL yyyy 'at' HH:mm");
}

function formatDetailDuration(totalSeconds: number) {
  if (totalSeconds < 60) return "Less than a minute";
  return formatDuration(totalSeconds, true);
}
