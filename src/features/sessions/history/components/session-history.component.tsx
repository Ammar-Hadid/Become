"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { CalendarDays, Clock3, Layers3, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import { Select } from "@/components/ui/forms/select.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  Workspace,
  WorkspaceHeader,
  WorkspaceMetric,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import type { SessionListItem } from "@/features/sessions/types/session.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration } from "@/lib/dates/utils/period.util";
import "../styles/session-history.css";

export function SessionHistory({ sessions }: { sessions: SessionListItem[] }) {
  const [query, setQuery] = useState("");
  const [domainId, setDomainId] = useState("");
  const { activeSession } = useActiveTimer();
  const domains = useMemo(
    () => [
      ...new Map(
        sessions.map((session) => [session.domain.id, session.domain]),
      ).values(),
    ],
    [sessions],
  );
  const filtered = sessions.filter(
    (session) =>
      (!domainId || session.domain.id === domainId) &&
      [
        session.description,
        session.outcome,
        session.notes,
        session.activityType.name,
        session.domain.name,
        session.engineeringProject?.name,
        session.contentTitleSnapshot,
      ].some((value) =>
        value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
  );
  const days = new Map<string, SessionListItem[]>();
  for (const session of filtered) {
    const date = DateTime.fromISO(session.startedAt)
      .setZone(APP_TIMEZONE)
      .toISODate()!;
    days.set(date, [...(days.get(date) ?? []), session]);
  }
  const completed = filtered.filter((session) => session.endedAt);
  return (
    <Workspace
      area="direction"
      className="page-shell session-history-workspace"
    >
      <WorkspaceHeader
        eyebrow="Activity"
        title="Session history"
        description="Find the work, the time you gave it, and what came from it."
        actions={
          <Button
            onClick={() =>
              window.dispatchEvent(
                new Event(
                  activeSession ? "become:manage-timer" : "become:start-timer",
                ),
              )
            }
          >
            <Play />
            {activeSession ? "Current session" : "Start a session"}
          </Button>
        }
      />
      <div className="session-history-metrics">
        <WorkspaceMetric
          label="Focused time"
          value={formatDuration(
            completed.reduce(
              (sum, session) => sum + session.durationSeconds,
              0,
            ),
            true,
          )}
          detail="Completed sessions in this view"
          icon={<Clock3 />}
        />
        <WorkspaceMetric
          label="Sessions"
          value={filtered.length}
          detail="In this view"
          icon={<Layers3 />}
        />
        <WorkspaceMetric
          label="Active days"
          value={days.size}
          detail="Days represented in this view"
          icon={<CalendarDays />}
        />
      </div>
      <WorkspacePanel
        title="Your activity"
        description="Search your 100 most recent sessions. Open a completed session for its full record."
      >
        <div className="session-history-filters">
          <div>
            <Search aria-hidden />
            <Input
              aria-label="Search sessions"
              placeholder="Search work, outcomes, or notes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            label="Filter sessions by domain"
            value={domainId}
            options={[
              { value: "", label: "All domains" },
              ...domains.map((domain) => ({
                value: domain.id,
                label: domain.name,
              })),
            ]}
            onValueChange={setDomainId}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {filtered.length} matching sessions
        </p>
        {days.size ? (
          <div className="session-history-days">
            {[...days].map(([date, records]) => (
              <section
                key={date}
                aria-label={DateTime.fromISO(date).toFormat("d LLLL yyyy")}
              >
                <header>
                  <h2>{DateTime.fromISO(date).toFormat("cccc, d LLLL")}</h2>
                  <span>
                    {records.length}{" "}
                    {records.length === 1 ? "session" : "sessions"}
                  </span>
                </header>
                {records.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            pattern={query || domainId ? "search-echo" : "first-focus"}
            size="compact"
            title={
              query || domainId
                ? "No matching sessions"
                : "Your first session starts here"
            }
            description={
              query || domainId
                ? "Try another search or choose all domains."
                : "Start a timer. When you finish, the work and its outcome will be waiting here."
            }
            action={
              query || domainId ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setDomainId("");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </WorkspacePanel>
    </Workspace>
  );
}
