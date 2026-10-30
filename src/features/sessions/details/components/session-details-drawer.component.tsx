"use client";

import { DateTime } from "luxon";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Coffee,
  FileText,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useId, useRef, type AnimationEvent } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import type { MotionPresenceState } from "@/components/ui/motion/hooks/use-presence.hook";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { SessionTimeEditor } from "@/features/sessions/details/components/session-time-editor.component";
import styles from "@/features/sessions/details/styles/session-details-drawer.component.module.css";
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
  const descriptionId = useId();
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

  return (
    <Drawer
      open={open}
      presenceState={presenceState}
      exiting={exiting}
      onPresenceAnimationEnd={onPresenceAnimationEnd}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      domain={session.domain.slug}
      initialFocusRef={closeButtonRef}
      testId="session-details"
      backdropTestId="session-details-backdrop"
      header={
        <>
          <div className={styles.headingCopy}>
            <p className={`type-overline ${styles.eyebrow}`}>Session details</p>
            <h2 id={titleId} className="type-section-title">
              {focus || activity}
            </h2>
            <p
              id={descriptionId}
              className={`type-body-sm ${styles.secondary}`}
            >
              {session.domain.name} · {activity}
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close session details"
          >
            <X aria-hidden="true" />
          </Button>
        </>
      }
    >
      <div className={`${styles.identity} ${styles.card}`}>
        <DomainIcon slug={session.domain.slug} treatment="featured" />
        <div className={styles.identityCopy}>
          <p className="type-widget-title" data-testid="session-detail-domain">
            {session.domain.name}
          </p>
          <p
            className={`type-body-sm ${styles.secondary}`}
            data-testid="session-detail-activity"
          >
            {activity}
          </p>
          {session.contentId && (
            <Link
              href={`/content/${session.contentId}`}
              className={`type-body-sm ${styles.contentLink}`}
            >
              {session.contentTitleSnapshot || "Untitled content"}
              {session.contentVariantSnapshot
                ? ` · ${session.contentVariantSnapshot}`
                : ""}
            </Link>
          )}
        </div>
        {session.contentId ? (
          <ChevronRight className={styles.chevron} aria-hidden="true" />
        ) : null}
      </div>

      <div className={styles.metrics}>
        <div
          className={`${styles.card} ${styles.metric} ${styles.focusMetric}`}
        >
          <div className={styles.metricHeading}>
            <IconFrame area={session.domain.slug} treatment="compact">
              <Clock3 />
            </IconFrame>
            <p className="type-label">Focused time</p>
          </div>
          <p
            className={`type-metric-md ${styles.accentText}`}
            data-testid="session-detail-duration"
          >
            {formatDetailDuration(session.durationSeconds)}
          </p>
        </div>
        {session.totalPausedMilliseconds > 0 && (
          <div className={`${styles.card} ${styles.metric}`}>
            <div className={styles.metricHeading}>
              <IconFrame area={session.domain.slug} treatment="compact">
                <Coffee />
              </IconFrame>
              <p className="type-label">Break time</p>
            </div>
            <p
              className="type-metric-sm"
              data-testid="session-detail-break-time"
            >
              {formatDetailDuration(
                Math.floor(session.totalPausedMilliseconds / 1000),
              )}
            </p>
            <p className={`type-caption ${styles.muted}`}>
              Excluded from focused time
            </p>
          </div>
        )}
      </div>

      <SessionTimeEditor session={session} onSaved={onSessionUpdated} />

      <dl className={`${styles.card} ${styles.timeline}`}>
        <div className={styles.timelineRow}>
          <IconFrame area={session.domain.slug} treatment="compact">
            <CalendarDays />
          </IconFrame>
          <div>
            <dt className={`type-label ${styles.muted}`}>Started</dt>
            <dd
              className={`type-body ${styles.secondary}`}
              data-testid="session-detail-start"
            >
              {formatDateTime(startedAt)}
            </dd>
          </div>
        </div>
        {endedAt && (
          <div className={styles.timelineRow}>
            <IconFrame area={session.domain.slug} treatment="compact">
              <CalendarDays />
            </IconFrame>
            <div>
              <dt className={`type-label ${styles.muted}`}>Ended</dt>
              <dd
                className={`type-body ${styles.secondary}`}
                data-testid="session-detail-end"
              >
                {formatDateTime(endedAt)}
              </dd>
            </div>
          </div>
        )}
      </dl>

      {hasEvidence && (
        <div className={styles.details}>
          {focus && (
            <DetailSection
              label="Focus / intention"
              testId="session-detail-focus"
              icon={<Target />}
              area={session.domain.slug}
            >
              {focus}
            </DetailSection>
          )}
          {outcome && (
            <DetailSection
              label="Outcome"
              testId="session-detail-outcome"
              icon={<BarChart3 />}
              area={session.domain.slug}
            >
              {outcome}
            </DetailSection>
          )}
          {notes && (
            <DetailSection
              label="Notes"
              testId="session-detail-notes"
              icon={<FileText />}
              area={session.domain.slug}
            >
              {notes}
            </DetailSection>
          )}
          {children ? (
            <div className={styles.detailExtras}>{children}</div>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}

function DetailSection({
  label,
  testId,
  icon,
  area,
  children,
}: {
  label: string;
  testId: string;
  icon: React.ReactNode;
  area: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.detail} data-testid={testId}>
      <div className={styles.detailHeading}>
        <IconFrame area={area} treatment="compact">
          {icon}
        </IconFrame>
        <h3 className="type-widget-title">{label}</h3>
      </div>
      <p className={`type-body ${styles.secondary} whitespace-pre-wrap`}>
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
