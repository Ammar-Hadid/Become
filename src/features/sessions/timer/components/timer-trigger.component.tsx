"use client";

import { Clock3, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { cn } from "@/lib/styles/utils/class-name.util";

export function TimerTrigger({ compact = false }: { compact?: boolean }) {
  const {
    activeSession,
    elapsedSeconds,
    recoveryRequired,
    reconcileTimer,
    pendingOperation,
  } = useActiveTimer();
  if (activeSession) {
    const paused = activeSession.status === "PAUSED";
    const activity =
      activeSession.contentActivitySnapshot || activeSession.activityType.name;
    const context = activeSession.contentTitleSnapshot
      ? `${activity} · ${activeSession.contentTitleSnapshot}`
      : activity;
    return (
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.focus();
          window.dispatchEvent(new Event("become:manage-timer"));
        }}
        className={cn(
          "become-button duration-control ease-move focus-visible:outline-primary flex items-center rounded-full border text-left transition-[color,border-color,background-color,transform] focus-visible:outline-2 focus-visible:outline-offset-2",
          paused
            ? "border-border bg-surface-elevated hover:border-primary/40"
            : "border-primary/30 bg-primary-subtle hover:border-primary/60",
          compact ? "size-12 justify-center" : "gap-md px-md w-full py-2.5",
        )}
        aria-label={`View ${paused ? "paused" : "running"} ${context} session`}
        data-testid="active-timer-trigger"
        data-session-id={activeSession.id}
        data-status={activeSession.status}
        data-elapsed-seconds={elapsedSeconds}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            paused
              ? "bg-surface text-text-secondary"
              : "bg-primary text-on-primary",
          )}
        >
          {paused ? (
            <Pause className="size-3.5 fill-current" aria-hidden="true" />
          ) : (
            <Clock3 className="size-4" aria-hidden="true" />
          )}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="timer-trigger-label text-text-secondary block truncate">
              {context}
            </span>
            <span
              className={cn(
                "timer-numerals text-body block font-semibold",
                paused ? "text-text-primary" : "text-primary",
              )}
            >
              {formatDuration(elapsedSeconds)}{" "}
              <span className="text-body-sm font-normal">
                · {paused ? "Paused" : "Running"}
              </span>
            </span>
          </span>
        )}
      </button>
    );
  }
  return (
    <Button
      onClick={(event) => {
        event.currentTarget.focus();
        if (recoveryRequired) void reconcileTimer();
        else window.dispatchEvent(new Event("become:start-timer"));
      }}
      disabled={Boolean(pendingOperation)}
      className={cn(compact ? "size-12 px-0" : "w-full")}
      aria-label={recoveryRequired ? "Check timer status" : "Start timer"}
      data-testid="start-timer-trigger"
    >
      {recoveryRequired ? (
        <Clock3 className="size-4" />
      ) : (
        <Play className="size-4 fill-current" />
      )}
      {!compact && (recoveryRequired ? "Check timer status" : "Start timer")}
    </Button>
  );
}
