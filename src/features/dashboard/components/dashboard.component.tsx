"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, ChartNoAxesColumnIncreasing, Check, Clock3,
  Send, Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { Tooltip } from "@/components/ui/tooltips/tooltip.component";
import { AiTypingText } from "@/components/ui/typing/ai-typing-text.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import type { DashboardData } from "@/features/dashboard/analytics/types/dashboard.types";
import { currentWeekStreakDays } from "@/features/dashboard/analytics/utils/current-week-streak.util";
import { DashboardActiveSession } from "@/features/dashboard/components/dashboard-active-session.component";
import { CotsDailyMessage } from "@/features/dashboard/components/cots-daily-message.component";
import { DashboardAttentionWidget } from "@/features/dashboard/attention/components/dashboard-attention-widget.component";
import type { DashboardAttentionItem } from "@/features/dashboard/attention/types/dashboard-attention.types";
import { DashboardGoalWidget } from "@/features/dashboard/goals/components/dashboard-goal-widget.component";
import { DashboardLenses } from "@/features/dashboard/lenses/components/dashboard-lenses.component";
import { NexoSeasonInsight } from "@/features/nexo/components/nexo-season-insight.component";
import { NEXO_INTERACTIVE_REQUEST_TIMEOUT_MS } from "@/features/nexo/constants/nexo-task.constants";
import { cotsDailyPreviewMessages } from "@/features/dashboard/lenses/constants/cots-daily-preview.constants";
import { SeasonOpeningArrival } from "@/features/seasons/home/components/season-opening-arrival.component";
import { useSeasonAttention } from "@/features/seasons/home/hooks/use-season-attention.hook";
import { formatDuration } from "@/lib/dates/utils/period.util";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import type { LivingSeasonFacts } from "@/features/seasons/living/types/living-season.types";
import type { getLivingSeasonScene } from "@/features/seasons/living/queries/living-season.query";
import { desktopArtworkFocusStyle } from "@/features/seasons/living/utils/living-artwork-focus.util";

function formatSeasonDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function durationHours(seconds: number) {
  return Math.round((seconds / 3600) * 10) / 10;
}

function chartDayLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function Dashboard({
  userName, currentWeekday, initialData, seasonDirection, seasonProgress, attention,
  livingFacts, livingScene,
  transition, transitionUnavailable = false, seasonRecoveryScope,
}: {
  userName: string;
  currentWeekday: number;
  initialData: DashboardData;
  seasonDirection: SeasonView;
  seasonProgress: number;
  livingFacts: LivingSeasonFacts;
  livingScene: Awaited<ReturnType<typeof getLivingSeasonScene>>;
  attention: DashboardAttentionItem[];
  transition?: SeasonTransitionView | null;
  transitionUnavailable?: boolean;
  seasonRecoveryScope?: string;
}) {
  const { play } = useInterfaceSound();
  const [composerOpen, setComposerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [conversationTurns, setConversationTurns] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [conversationBusy, setConversationBusy] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [failedMobileHref, setFailedMobileHref] = useState<string | null>(null);
  const [failedDesktopHref, setFailedDesktopHref] = useState<string | null>(null);
  const mobileArtFailed = failedMobileHref === livingScene?.mobileHref;
  const desktopArtFailed = failedDesktopHref === livingScene?.desktopHref;
  const heroTriggerRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const seasonAttention = useSeasonAttention({
    season: seasonDirection,
    transition,
    transitionUnavailable,
    recoveryScope: seasonRecoveryScope,
  });
  const allAttention = useMemo(() => [...seasonAttention, ...attention], [seasonAttention, attention]);
  const previousAttentionIds = useRef(new Set(allAttention.map((item) => item.id)));
  const firstName = userName.trim().split(/\s+/)[0] || "friend";
  const calendar = seasonDirection.calendar;
  const goals = seasonDirection.goals.map(({ goal }) => ({
    id: goal.id,
    title: goal.title,
    reached: goal.evaluation.criteria.filter((criterion) => criterion.reached === true).length,
    total: goal.evaluation.criteria.length,
    domainIds: goal.domainIds,
  }));
  const maxChartSeconds = Math.max(1, ...initialData.chart.map((day) => day.seconds));
  const streakDays = currentWeekStreakDays(initialData.chart, currentWeekday);
  const streakActiveDays = streakDays.filter((day) => day.seconds > 0).length;
  const chartScaleHours = Math.max(4, Math.ceil(maxChartSeconds / 3600 / 4) * 4);

  useEffect(() => {
    const nextIds = new Set(allAttention.map((item) => item.id));
    if (allAttention.some((item) => !previousAttentionIds.current.has(item.id))) {
      play("attentionArrived");
    }
    previousAttentionIds.current = nextIds;
  }, [allAttention, play]);

  function changeComposerOpen(next: boolean) {
    if (next === composerOpen) return;
    play(next ? "layerOpened" : "returned");
    setComposerOpen(next);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || conversationBusy) return;
    setConversationError("");
    setConversationBusy(true);
    const history = conversationTurns.slice(-12);
    setConversationTurns((prior) => [...prior, { role: "user", content: trimmed }]);
    setQuestion("");
    const signal = AbortSignal.timeout(NEXO_INTERACTIVE_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/cots/conversation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
        signal,
      });
      const result = await response.json() as { status?: string; reply?: string; reason?: string; error?: string };
      if (!response.ok || result.status !== "READY" || !result.reply)
        throw new Error(result.reason ?? result.error ?? "C.O.T.S could not answer yet.");
      setConversationTurns((prior) => [...prior, { role: "assistant", content: result.reply! }]);
    } catch (error) {
      setConversationTurns((prior) => prior.slice(0, -1));
      setQuestion((current) => current || trimmed);
      setConversationError(signal.aborted
        ? "The answer took too long. Please try again."
        : error instanceof Error ? error.message : "C.O.T.S could not answer yet.");
    } finally { setConversationBusy(false); }
  }

  return (
    <div className="dashboard-v2">
      <SeasonOpeningArrival
        season={seasonDirection}
        transition={transition}
        transitionUnavailable={transitionUnavailable}
        recoveryScope={seasonRecoveryScope}
      />

      <section className="dashboard-v2-hero" data-living-art={Boolean(livingScene)} aria-labelledby="dashboard-v2-hero-title">
        <div className="dashboard-v2-hero-art-frame">
          {livingScene ? <>
            <Image src={desktopArtFailed ? livingScene.fallbackDesktopHref : livingScene.desktopHref} alt="" fill priority unoptimized sizes="100vw" className="dashboard-v2-hero-art dashboard-v2-hero-art-desktop" style={desktopArtworkFocusStyle(livingScene.desktopFocalX, livingScene.desktopFocalY)} onError={() => setFailedDesktopHref(livingScene.desktopHref)} />
            <Image src={mobileArtFailed ? livingScene.fallbackMobileHref : livingScene.mobileHref} alt="" fill priority unoptimized sizes="100vw" className="dashboard-v2-hero-art dashboard-v2-hero-art-mobile" onError={() => setFailedMobileHref(livingScene.mobileHref)} />
          </> : <Image src="/images/dashboard-season-hero.png" alt="" fill priority sizes="100vw" className="dashboard-v2-hero-art" />}
        </div>
        <div className="dashboard-v2-hero-shade" aria-hidden="true" />
        {livingScene && <span className="sr-only">{livingScene.characterName}, Season chapter {livingScene.chapter}. Season status: {livingScene.state.toLowerCase().replaceAll("_", " ")}.</span>}
        <div className="dashboard-v2-hero-copy">
          <p className="type-hero-kicker">Talk to your <strong>C.O.T.S</strong></p>
          <Button
            ref={heroTriggerRef}
            type="button"
            variant="ghost"
            className="dashboard-v2-ask type-hero"
            onClick={() => changeComposerOpen(true)}
            aria-label="Ask C.O.T.S anything"
          >
            <span id="dashboard-v2-hero-title">ASK ME ANYTHING</span><span className="dashboard-v2-caret" aria-hidden="true" />
          </Button>
        </div>
        <p className="dashboard-v2-hero-aside type-overline">Same you.<br />A higher version.</p>
      </section>

      <div className="dashboard-v2-content">
        <DashboardLenses firstName={firstName} goals={goals} domains={initialData.domains}>
        <div className="dashboard-v2-grid dashboard-v2-grid-top">
          <section className="dashboard-v2-card material-glass dashboard-v2-streak" aria-labelledby="dashboard-v2-streak-title">
            <div className="dashboard-v2-card-heading">
              <div className="dashboard-v2-title-group"><IconFrame treatment="compact" area="dashboard"><CalendarDays /></IconFrame><h2 className="type-widget-title" id="dashboard-v2-streak-title">Weekly Streak</h2></div>
              <span className="type-caption dashboard-v2-muted">Keep going.</span>
            </div>
            <div className="dashboard-v2-days">
              {streakDays.map((day) => (
                <div className="dashboard-v2-day" key={day.label}>
                  <span className="dashboard-v2-day-box" data-active={day.seconds > 0}>{day.seconds > 0 && <Check aria-hidden="true" />}</span>
                  <span className="type-caption">{day.label}</span>
                </div>
              ))}
            </div>
            <p className="type-caption dashboard-v2-card-footnote">{streakActiveDays} of 7 days with recorded focus this week</p>
          </section>

          <section className="dashboard-v2-card material-glass dashboard-v2-season" aria-labelledby="dashboard-v2-season-title">
            <div className="dashboard-v2-card-heading">
              <div className="dashboard-v2-title-group"><IconFrame treatment="compact" area="dashboard"><Sprout /></IconFrame><h2 className="type-widget-title" id="dashboard-v2-season-title">Season Progress</h2></div>
              <Badge variant="live-numeral">{Math.round(seasonProgress)}%</Badge>
            </div>
            <div className="dashboard-v2-season-meta">
              <Link className="type-label" href={`/direction/seasons/${calendar.year}/${calendar.quarter}`}>{seasonDirection.title || calendar.label}</Link>
              <span className="type-caption dashboard-v2-muted">{formatSeasonDate(calendar.startOn)} – {formatSeasonDate(calendar.endOn)}</span>
            </div>
            <ProgressIndicator variant="season-ticks" value={seasonProgress} label="Season calendar elapsed" area="dashboard" />
            <div className="dashboard-v2-season-bottom type-caption"><span>0%</span><span>{calendar.daysAfterToday} {calendar.daysAfterToday === 1 ? "day" : "days"} left</span></div>
            <div className="dashboard-v2-season-insight"><p className="type-caption dashboard-v2-card-footnote">{livingFacts.state === "INSUFFICIENT_EVIDENCE" ? "Goal pace needs recorded evidence" : `${Math.round(livingFacts.actualPercent!)}% recorded · ${Math.round(livingFacts.expectedPercent!)}% planned · ${livingFacts.state.toLowerCase().replaceAll("_", " ")}`}</p><NexoSeasonInsight /></div>
          </section>

          <CotsDailyMessage area="dashboard" message={cotsDailyPreviewMessages.dashboard.replace("{name}", firstName)} />
        </div>

        <div className="dashboard-v2-grid dashboard-v2-grid-bottom">
          <section className="dashboard-v2-card material-glass dashboard-v2-time" aria-labelledby="dashboard-v2-time-title">
            <div className="dashboard-v2-card-heading">
              <div className="dashboard-v2-title-group"><IconFrame treatment="compact" area="dashboard"><ChartNoAxesColumnIncreasing /></IconFrame><h2 className="type-widget-title" id="dashboard-v2-time-title">Time Invested</h2></div>
              <span className="type-caption dashboard-v2-muted">Last 7 days</span>
            </div>
            <div className="dashboard-v2-time-main">
              <div className="dashboard-v2-chart" role="group" aria-label="Recorded focused time by day over the last 7 days">
                <div className="dashboard-v2-chart-grid" aria-hidden="true">{[4, 3, 2, 1, 0].map((step) => <span key={step}>{chartScaleHours * step / 4}</span>)}</div>
                <div className="dashboard-v2-chart-bars">
                  {initialData.chart.map((day) => {
                    const detail = `${chartDayLabel(day.date)} · ${formatDuration(day.seconds, true)} focused`;
                    return (
                      <div className="dashboard-v2-chart-day" key={day.date}>
                        <Tooltip content={detail} area="dashboard" side="right">
                          <button className="dashboard-v2-bar-track" type="button" aria-label={detail}>
                            <span aria-hidden="true" style={{ height: `${(day.seconds / (chartScaleHours * 3600)) * 100}%` }} />
                          </button>
                        </Tooltip>
                        <span className="type-caption" aria-hidden="true">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="dashboard-v2-time-total"><strong className="type-metric-lg">{durationHours(initialData.totalSeconds)}</strong><span className="type-body">hours</span></div>
            </div>
            <div className="dashboard-v2-time-footer type-caption">
              <span><Clock3 aria-hidden="true" />{initialData.comparisonPercent === null ? "First recorded period" : `${initialData.comparisonPercent > 0 ? "+" : ""}${initialData.comparisonPercent}% from prior 7 days`}</span>
              <span>Time compounds.</span>
            </div>
          </section>

          <DashboardAttentionWidget area="dashboard" items={allAttention} />

          <DashboardGoalWidget area="dashboard" goals={goals} />
        </div>
        </DashboardLenses>

        <DashboardActiveSession />
        <footer className="dashboard-v2-footer type-system">
          {calendar.label}
        </footer>
      </div>

      <Dialog
        open={composerOpen}
        onOpenChange={changeComposerOpen}
        eyebrow="Talk to your C.O.T.S"
        title="Ask me anything"
        description="Ask your Season’s character about your current progress. Replies use the approved profile and recorded Become facts."
        initialFocusRef={composerRef}
        returnFocusRef={heroTriggerRef}
        className="dashboard-v2-composer"
      >
        {conversationTurns.length > 0 && <div className="dashboard-v2-composer-history" role="log" aria-label="C.O.T.S conversation">{conversationTurns.map((turn, index) => <div className="dashboard-v2-composer-turn" key={index}>
          <p className="type-overline">{turn.role === "user" ? "You" : "C.O.T.S"}</p>
          {turn.role === "assistant" && index === conversationTurns.length - 1 ? <AiTypingText text={turn.content} /> : <p className="type-body">{turn.content}</p>}
        </div>)}</div>}
        {conversationError && <p className="type-body-sm dashboard-v2-composer-error" role="alert">{conversationError}</p>}
        <form onSubmit={submitQuestion} className="dashboard-v2-composer-form">
          <Textarea label="Your question" size="md" ref={composerRef} id="dashboard-cots-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} placeholder="What would you like to ask?" />
          <div className="dashboard-v2-composer-actions"><span className="type-caption">{conversationBusy ? "C.O.T.S is thinking…" : `${question.length}/1000`}</span><Button type="submit" disabled={!question.trim() || conversationBusy}><Send aria-hidden="true" /> Send question</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
