"use client";

import { useState, useTransition, ViewTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
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
import { SeasonHomeCard } from "@/features/seasons/home/components/season-home-card.component";
import { SeasonOpeningArrival } from "@/features/seasons/home/components/season-opening-arrival.component";
import { SeasonTransitionEntry } from "@/features/seasons/transition/components/season-transition-entry.component";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { DashboardActiveSession } from "@/features/dashboard/components/dashboard-active-session.component";
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
  businessAttention = [],
  seasonDirection,
  transition,
  transitionUnavailable = false,
  seasonRecoveryScope,
}: {
  userName: string;
  season: string;
  weekNumber: number;
  seasonProgress: number;
  initialData: DashboardData;
  recentSessions: SessionListItem[];
  businessAttention?: { id: string; text: string; href: string }[];
  seasonDirection?: SeasonView;
  transition?: SeasonTransitionView | null;
  transitionUnavailable?: boolean;
  seasonRecoveryScope?: string;
}) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const [requestedTimeframe, setRequestedTimeframe] =
    useState<Timeframe | null>(null);
  const { activeSession } = useActiveTimer();

  function selectTimeframe(timeframe: Timeframe) {
    if (timeframe === data.timeframe) return;
    setRequestedTimeframe(timeframe);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard?timeframe=${timeframe}`);
        if (response.ok) setData((await response.json()) as DashboardData);
      } finally {
        setRequestedTimeframe(null);
      }
    });
  }

  const highestDomain = [...data.domains].sort(
    (a, b) => b.seconds - a.seconds,
  )[0];
  const greeting = getGreeting();

  return (
    <div className="page-shell">
      <SeasonOpeningArrival
        season={seasonDirection}
        transition={transition}
        transitionUnavailable={transitionUnavailable}
        recoveryScope={seasonRecoveryScope}
      />
      <section className="dashboard-hero" aria-labelledby="dashboard-greeting">
        <div className="dashboard-hero-meta">
          <div className="dashboard-season-context">
            <span className="dashboard-hero-kicker">
              <span className="dashboard-status-dot" aria-hidden="true" />
              <span className="dashboard-hero-kicker-label">
                Current season
              </span>
            </span>
            <strong>{season}</strong>
          </div>
          <div className="dashboard-week-context">
            <span>Week</span>
            <strong className="timer-numerals">
              {String(weekNumber).padStart(2, "0")}
            </strong>
          </div>
        </div>

        <header className="dashboard-hero-heading">
          <h1 id="dashboard-greeting">
            <span>{greeting},</span>{" "}
            <span className="dashboard-hero-name">
              {userName.split(" ")[0]}.
            </span>
          </h1>
          <p className="page-description">
            See where your attention is going—and what it is producing.
          </p>
        </header>

        <div
          className={cn(
            "dashboard-hero-workspace",
            businessAttention.length === 0 &&
              "dashboard-hero-workspace--focus-only",
          )}
        >
          {businessAttention.length > 0 && (
            <div className="dashboard-priority">
              <div className="dashboard-priority-heading">
                <div>
                  <p className="eyebrow">Next move</p>
                  <h2>Entrepreneurship</h2>
                </div>
                <Link
                  href="/entrepreneurship"
                  className="dashboard-domain-link"
                  aria-label="Open Entrepreneurship"
                >
                  <span className="dashboard-domain-link-label">
                    Open domain
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
              <p className="dashboard-priority-scope">
                Chosen actions & source review
              </p>
              <ul className="dashboard-priority-list">
                {businessAttention.slice(0, 3).map((item, index) => (
                  <li key={item.id}>
                    <Link href={item.href}>
                      <span className="dashboard-priority-index timer-numerals">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{item.text}</span>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeSession ? (
            <DashboardActiveSession />
          ) : (
            <button
              className="dashboard-focus-action"
              onClick={() =>
                window.dispatchEvent(new Event("become:start-timer"))
              }
            >
              <span className="dashboard-focus-marker" aria-hidden="true">
                <Play />
              </span>
              <span className="dashboard-focus-copy">
                <span className="eyebrow">Focus session</span>
                <strong>Ready when you are.</strong>
                <small>Clear the noise and begin a focused block.</small>
              </span>
              <span className="dashboard-focus-end">
                <span>
                  Begin <ArrowRight aria-hidden="true" />
                </span>
              </span>
            </button>
          )}
        </div>
      </section>

      {transitionUnavailable ? (
        <p className="border-border text-text-muted text-body-sm gap-lg py-lg mt-xl flex flex-wrap items-center border-b">
          <span>The Season transition could not be loaded.</span>
          <Link
            href="/reviews"
            className="text-primary gap-sm min-h-input-height-sm inline-flex items-center"
          >
            Open reviews <ArrowRight className="size-lg" aria-hidden="true" />
          </Link>
        </p>
      ) : (
        <SeasonTransitionEntry
          view={transition}
          season={seasonDirection}
          recoveryScope={seasonRecoveryScope}
        />
      )}
      {seasonDirection && <SeasonHomeCard season={seasonDirection} />}

      <div className="border-border mt-4xl gap-lg pb-2xl flex flex-col border-b sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-sm">Focused time</p>
          <p className="timer-numerals text-h1 font-semibold tracking-[-0.06em]">
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
              className={cn(
                "motion-selection-control",
                (requestedTimeframe ?? data.timeframe) === timeframe &&
                  "active",
              )}
              onClick={() => selectTimeframe(timeframe)}
              disabled={pending}
              aria-pressed={
                (requestedTimeframe ?? data.timeframe) === timeframe
              }
            >
              {(requestedTimeframe ?? data.timeframe) === timeframe && (
                <ViewTransition
                  name="dashboard-timeframe-indicator"
                  share="motion-guide"
                  default="none"
                >
                  <span className="motion-selection-guide" aria-hidden />
                </ViewTransition>
              )}
              <span>{timeframe[0].toUpperCase() + timeframe.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      <ViewTransition
        key={data.timeframe}
        name="dashboard-analytics"
        share="motion-data-recompose"
        default="none"
      >
        <section
          className={cn("dashboard-analytics", pending && "is-pending")}
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
      </ViewTransition>

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
            <h2 className="section-title">Recent sessions</h2>
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
                {activeSession
                  ? "View current session"
                  : "Record your first focus block"}{" "}
                <ArrowRight />
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
