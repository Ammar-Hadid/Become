"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Play,
  Sparkles,
} from "lucide-react";
import { TimeBarChart } from "@/components/ui/charts/time-bar-chart.component";
import type { DashboardData } from "@/features/dashboard/analytics/types/dashboard.types";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getDomainHref } from "@/features/domains/identity/utils/domain.util";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import type { SessionListItem } from "@/features/sessions/types/session.types";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";
import {
  formatDuration,
  TIMEFRAMES,
  type Timeframe,
} from "@/lib/dates/utils/period.util";

export function Dashboard({
  userName,
  season,
  weekNumber,
  seasonProgress,
  initialData,
  recentSessions,
}: {
  userName: string;
  season: string;
  weekNumber: number;
  seasonProgress: number;
  initialData: DashboardData;
  recentSessions: SessionListItem[];
}) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const { activeSession, elapsedSeconds } = useActiveTimer();

  function selectTimeframe(timeframe: Timeframe) {
    if (timeframe === data.timeframe) return;
    startTransition(async () => {
      const response = await fetch(`/api/dashboard?timeframe=${timeframe}`);
      if (response.ok) setData((await response.json()) as DashboardData);
    });
  }

  const highestDomain = [...data.domains].sort(
    (a, b) => b.seconds - a.seconds,
  )[0];
  const greeting = getGreeting();

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <div className="dashboard-context text-text-muted mb-lg gap-md flex flex-wrap items-center">
            <span className="season-pill">
              <span className="bg-primary size-1.5 rounded-full" />
              {season}
            </span>
            <span>Week {weekNumber}</span>
          </div>
          <h1>
            {greeting}, {userName.split(" ")[0]}.
          </h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            A quiet view of where your attention is going—and what it is
            producing.
          </p>
        </div>
        <div
          className="hidden h-11 w-[132px] shrink-0 sm:block"
          aria-hidden="true"
        />
      </header>

      {activeSession ? (
        <button
          className="active-session-hero"
          onClick={() => window.dispatchEvent(new Event("become:stop-timer"))}
          data-testid="dashboard-active-session"
          data-session-id={activeSession.id}
          data-elapsed-seconds={elapsedSeconds}
        >
          <div className="gap-lg flex min-w-0 items-center">
            <span className="active-orbit">
              <span />
            </span>
            <div className="min-w-0 text-left">
              <p className="eyebrow text-primary">In focus now</p>
              <p className="mt-xs truncate text-lg font-medium">
                {activeSession.description || activeSession.activityType.name}
              </p>
              <p className="active-session-meta text-text-secondary mt-xs">
                {activeSession.domain.name} · {activeSession.activityType.name}
              </p>
            </div>
          </div>
          <div className="gap-lg flex shrink-0 items-center">
            <div className="hidden text-right sm:block">
              <p
                className="timer-numerals text-primary text-2xl font-semibold"
                data-testid="dashboard-active-session-time"
              >
                {formatDuration(elapsedSeconds)}
              </p>
              <p className="active-session-meta text-text-muted mt-xs">
                Tap to complete
              </p>
            </div>
            <span className="bg-primary text-on-primary flex size-10 items-center justify-center rounded-full">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </button>
      ) : (
        <button
          className="empty-focus-strip cursor-pointer"
          onClick={() => window.dispatchEvent(new Event("become:start-timer"))}
        >
          <span className="bg-primary-subtle text-primary flex size-12 items-center justify-center rounded-full">
            <Play className="size-4 fill-current" />
          </span>
          <span className="text-left">
            <strong>Ready when you are.</strong>
            <small>Start a focused session</small>
          </span>
          <ChevronRight className="text-text-muted ml-auto size-4" />
        </button>
      )}

      <div className="border-border mt-4xl gap-lg pb-2xl flex flex-col border-b sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-sm">Focused time</p>
          <p className="timer-numerals text-[clamp(2.3rem,5vw,4.2rem)] leading-none font-semibold tracking-[-0.06em]">
            {formatDuration(data.totalSeconds, true)}
          </p>
          <p className="text-text-secondary mt-md text-body">
            {data.comparisonPercent === null ? (
              "First recorded time in this period"
            ) : data.comparisonPercent === 0 ? (
              "Level with the previous period"
            ) : (
              <>
                <span
                  className={
                    data.comparisonPercent > 0
                      ? "text-success"
                      : "text-text-secondary"
                  }
                >
                  {data.comparisonPercent > 0 ? "+" : ""}
                  {data.comparisonPercent}%
                </span>{" "}
                from the previous {data.timeframe}
              </>
            )}
          </p>
        </div>
        <div className="timeframe-switcher" aria-label="Analytics timeframe">
          {TIMEFRAMES.map((timeframe) => (
            <button
              key={timeframe}
              className={cn(data.timeframe === timeframe && "active")}
              onClick={() => selectTimeframe(timeframe)}
              disabled={pending}
            >
              {timeframe[0].toUpperCase() + timeframe.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <section
        className={cn("dashboard-analytics", pending && "opacity-60")}
        aria-busy={pending}
      >
        <div className="border-border py-3xl lg:pr-4xl min-w-0 border-b lg:border-r lg:border-b-0">
          <div className="mb-lg flex items-center justify-between">
            <div>
              <h2 className="section-title">Rhythm</h2>
              <p className="section-description">
                {data.periodLabel} · {data.activeDays} active{" "}
                {data.activeDays === 1 ? "day" : "days"}
              </p>
            </div>
            <Clock3 className="text-text-muted size-4" />
          </div>
          <TimeBarChart data={data.chart} />
        </div>

        <div className="py-3xl lg:pl-4xl">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h2 className="section-title">Direction</h2>
              <p className="section-description">
                Allocation across your domains
              </p>
            </div>
            <span className="dashboard-context text-text-muted">
              {formatDuration(data.todaySeconds, true)} today
            </span>
          </div>
          <div className="space-y-xl">
            {data.domains.map((domain) => {
              const share = data.totalSeconds
                ? (domain.seconds / data.totalSeconds) * 100
                : 0;
              return (
                <Link
                  href={getDomainHref(domain.slug)}
                  className="domain-metric group"
                  key={domain.id}
                >
                  <span
                    className="domain-metric-icon"
                    style={{ color: domain.color }}
                  >
                    <DomainIcon slug={domain.slug} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="gap-lg flex items-center justify-between">
                      <span className="text-body font-medium">
                        {domain.name}
                      </span>
                      <span className="timer-numerals text-body">
                        {formatDuration(domain.seconds, true)}
                      </span>
                    </span>
                    <span className="metric-track">
                      <span
                        style={{
                          width: `${Math.max(share, domain.seconds ? 2 : 0)}%`,
                          backgroundColor: domain.color,
                        }}
                      />
                    </span>
                  </span>
                  <ArrowUpRight className="text-text-muted size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-border bg-border mt-lg grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-3">
        <div className="signal-cell">
          <CalendarDays />
          <p className="signal-value">{Math.round(seasonProgress)}%</p>
          <p className="signal-label">Season elapsed</p>
          <span className="signal-line">
            <span style={{ width: `${seasonProgress}%` }} />
          </span>
        </div>
        <div className="signal-cell">
          <Clock3 />
          <p className="signal-value">{data.activeDays}</p>
          <p className="signal-label">Active days · {data.periodLabel}</p>
        </div>
        <div className="signal-cell">
          <Sparkles />
          <p className="signal-copy">
            {highestDomain?.seconds
              ? `${highestDomain.name} holds the largest share of your recorded focus this ${data.timeframe}.`
              : "Your direction becomes visible as you record focused time."}
          </p>
          <p className="signal-label">Recent signal</p>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-lg flex items-end justify-between">
          <div>
            <p className="eyebrow mb-sm">Evidence</p>
            <h2 className="section-title text-lg">Recent sessions</h2>
          </div>
          <Link href="/sessions" className="text-link">
            View history <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-border border-border divide-y border-y">
          {recentSessions.length ? (
            recentSessions
              .slice(0, 5)
              .map((session) => (
                <SessionRow key={session.id} session={session} />
              ))
          ) : (
            <div className="empty-state">
              <p>No sessions yet.</p>
              <button
                onClick={() =>
                  window.dispatchEvent(new Event("become:start-timer"))
                }
              >
                Record your first focus block <ArrowRight />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
