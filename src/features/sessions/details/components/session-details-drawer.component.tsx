"use client";

import { DateTime } from "luxon";
import { CalendarDays, Clock3, X } from "lucide-react";
import { useId, useRef, type AnimationEvent } from "react";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import type { MotionPresenceState } from "@/components/ui/motion/hooks/use-presence.hook";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import type { SessionListItem } from "@/features/sessions/types/session.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";

type SessionDetailsDrawerProps = {
  session: SessionListItem;
  open: boolean;
  presenceState: MotionPresenceState;
  onPresenceAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function SessionDetailsDrawer({
  session,
  open,
  presenceState,
  onPresenceAnimationEnd,
  onClose,
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
        aria-labelledby={titleId}
        data-testid="session-details"
      >
        <header className="session-details-header">
          <div className="min-w-0">
            <p className="eyebrow mb-md">Session details</p>
            <h2
              id={titleId}
              className="text-2xl font-semibold tracking-[-0.04em]"
            >
              {focus || session.activityType.name}
            </h2>
            <p className="text-text-secondary mt-sm text-body">
              {session.domain.name} · {session.activityType.name}
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
              {session.activityType.name}
            </p>
          </div>
        </div>

        <dl className="session-details-timing">
          <div>
            <dt>
              <CalendarDays /> Started
            </dt>
            <dd data-testid="session-detail-start">
              {formatDateTime(startedAt)}
            </dd>
          </div>
          {endedAt && (
            <div>
              <dt>
                <CalendarDays /> Ended
              </dt>
              <dd data-testid="session-detail-end">
                {formatDateTime(endedAt)}
              </dd>
            </div>
          )}
          <div>
            <dt>
              <Clock3 /> Duration
            </dt>
            <dd
              className="timer-numerals"
              data-testid="session-detail-duration"
            >
              {formatDetailDuration(session.durationSeconds)}
            </dd>
          </div>
        </dl>

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
      <p className="text-text-secondary text-body leading-6 whitespace-pre-wrap">
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
