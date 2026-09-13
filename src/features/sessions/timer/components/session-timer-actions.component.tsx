"use client";

import { useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";

export function SessionTimerActions({
  className,
  onEnd,
}: {
  className?: string;
  onEnd?: () => void;
}) {
  const {
    activeSession,
    pauseSession,
    resumeSession,
    pendingOperation,
    recoveryRequired,
    reconcileTimer,
  } = useActiveTimer();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  if (!activeSession) return null;
  const paused = activeSession.status === "PAUSED";

  async function changeState() {
    setError(null);
    if (!activeSession) return;
    const result = await (paused
      ? resumeSession(activeSession.id)
      : pauseSession(activeSession.id));
    if (!result.ok)
      setError(result.error ?? "Could not save the timer change.");
  }

  return (
    <div className={cn("space-y-md", className)}>
      <div className="gap-sm flex flex-wrap">
        <Button
          className="flex-1"
          variant={paused ? "primary" : "secondary"}
          onClick={changeState}
          disabled={Boolean(pendingOperation) || recoveryRequired || checking}
          data-testid={paused ? "resume-session" : "pause-session"}
        >
          {paused ? (
            <Play className="size-4 fill-current" aria-hidden="true" />
          ) : (
            <Pause className="size-4 fill-current" aria-hidden="true" />
          )}
          {pendingOperation === "pause"
            ? "Pausing…"
            : pendingOperation === "resume"
              ? "Resuming…"
              : paused
                ? "Resume"
                : "Pause"}
        </Button>
        <Button
          className="flex-1"
          variant="ghost"
          disabled={Boolean(pendingOperation) || checking}
          onClick={(event) => {
            event.currentTarget.focus();
            setError(null);
            if (onEnd) onEnd();
            else window.dispatchEvent(new Event("become:stop-timer"));
          }}
          data-testid="end-session"
        >
          <Square className="size-3 fill-current" aria-hidden="true" /> End
          session
        </Button>
      </div>
      {error && (
        <p className="text-danger text-body-sm" role="alert">
          {error}
        </p>
      )}
      {recoveryRequired && (
        <Button
          variant="ghost"
          size="sm"
          disabled={checking || Boolean(pendingOperation)}
          onClick={async () => {
            setChecking(true);
            const checked = await reconcileTimer();
            setChecking(false);
            if (checked) setError(null);
            else
              setError(
                "Could not check the timer. Check your connection and try again.",
              );
          }}
        >
          {checking ? "Checking…" : "Check timer status"}
        </Button>
      )}
    </div>
  );
}
