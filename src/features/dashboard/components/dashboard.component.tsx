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
import { Button } from "@/components/ui/button.component";
import { FocusChart } from "@/features/dashboard/components/focus-chart.component";
import type { DashboardData } from "@/features/dashboard/dashboard.types";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import type { SessionListItem } from "@/features/sessions/session.types";
import { useActiveTimer } from "@/features/sessions/use-active-timer.hook";
import { cn } from "@/lib/class-name.util";
import {
  formatDuration,
  TIMEFRAMES,
  type Timeframe,
} from "@/lib/dates/period.util";

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
          <div className="dashboard-context mb-4 flex flex-wrap items-center gap-3 text-[var(--text-muted)]">
            <span className="season-pill">
              <span className="size-1.5 rounded-full bg-[var(--primary)]" />
              {season}
            </span>
            <span>Week {weekNumber}</span>
          </div>
          <h1>
            {greeting}, {userName.split(" ")[0]}.
          </h1>
          <p className="page-description mt-2 max-w-xl text-[var(--text-secondary)]">
            A quiet view of where your attention is going—and what it is
            producing.
          </p>
        </div>
        {!activeSession && (
          <Button
            className="hidden sm:flex"
            onClick={() =>
              window.dispatchEvent(new Event("become:start-timer"))
            }
          >
            <Play className="size-4 fill-current" /> Start timer
          </Button>
        )}
      </header>

      {activeSession ? (
        <button
          className="active-session-hero"
          onClick={() => window.dispatchEvent(new Event("become:stop-timer"))}
          data-testid="dashboard-active-session"
          data-session-id={activeSession.id}
          data-elapsed-seconds={elapsedSeconds}
        >
          <div className="flex min-w-0 items-center gap-4">
            <span className="active-orbit">
              <span />
            </span>
            <div className="min-w-0 text-left">
              <p className="eyebrow text-[var(--primary)]">In focus now</p>
              <p className="mt-1 truncate text-lg font-medium">
                {activeSession.description || activeSession.activityType.name}
              </p>
              <p className="active-session-meta mt-1 text-[var(--text-secondary)]">
                {activeSession.domain.name} · {activeSession.activityType.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden text-right sm:block">
              <p
                className="timer-numerals text-2xl font-semibold text-[var(--primary)]"
                data-testid="dashboard-active-session-time"
              >
                {formatDuration(elapsedSeconds)}
              </p>
              <p className="active-session-meta mt-1 text-[var(--text-muted)]">
                Tap to complete
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)] text-[#17110a]">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </button>
      ) : (
        <button
          className="empty-focus-strip"
          onClick={() => window.dispatchEvent(new Event("become:start-timer"))}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
            <Play className="size-4 fill-current" />
          </span>
          <span className="text-left">
            <strong>Ready when you are.</strong>
            <small>Start a focused session</small>
          </span>
          <ChevronRight className="ml-auto size-4 text-[var(--text-muted)]" />
        </button>
      )}

      <div className="mt-10 flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Focused time</p>
          <p className="timer-numerals text-[clamp(2.3rem,5vw,4.2rem)] leading-none font-semibold tracking-[-0.06em]">
            {formatDuration(data.totalSeconds, true)}
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {data.comparisonPercent === null ? (
              "First recorded time in this period"
            ) : data.comparisonPercent === 0 ? (
              "Level with the previous period"
            ) : (
              <>
                <span
                  className={
                    data.comparisonPercent > 0
                      ? "text-[var(--success)]"
                      : "text-[var(--text-secondary)]"
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
        <div className="min-w-0 border-b border-[var(--border)] py-8 lg:border-r lg:border-b-0 lg:pr-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">Rhythm</h2>
              <p className="section-description">
                {data.periodLabel} · {data.activeDays} active{" "}
                {data.activeDays === 1 ? "day" : "days"}
              </p>
            </div>
            <Clock3 className="size-4 text-[var(--text-muted)]" />
          </div>
          <FocusChart data={data.chart} />
        </div>

        <div className="py-8 lg:pl-10">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h2 className="section-title">Direction</h2>
              <p className="section-description">
                Allocation across your domains
              </p>
            </div>
            <span className="dashboard-context text-[var(--text-muted)]">
              {formatDuration(data.todaySeconds, true)} today
            </span>
          </div>
          <div className="space-y-5">
            {data.domains.map((domain) => {
              const share = data.totalSeconds
                ? (domain.seconds / data.totalSeconds) * 100
                : 0;
              return (
                <Link
                  href={`/domains/${domain.slug}`}
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
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium">{domain.name}</span>
                      <span className="timer-numerals text-sm">
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
                  <ArrowUpRight className="size-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
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
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Evidence</p>
            <h2 className="section-title text-lg">Recent sessions</h2>
          </div>
          <Link href="/sessions" className="text-link">
            View history <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {recentSessions.length ? (
            recentSessions
              .slice(0, 5)
              .map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  href={
                    session.endedAt
                      ? `/sessions#session-${session.id}`
                      : undefined
                  }
                />
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
