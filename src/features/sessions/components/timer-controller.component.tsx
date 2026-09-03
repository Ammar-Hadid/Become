"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Play,
  Square,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button.component";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import type { DomainOption } from "@/features/sessions/session.types";
import { useActiveTimer } from "@/features/sessions/use-active-timer.hook";
import { cn } from "@/lib/class-name.util";
import { formatDuration } from "@/lib/dates/period.util";

type TimerControllerProps = {
  domains: DomainOption[];
};

export function TimerTrigger({ compact = false }: { compact?: boolean }) {
  const { activeSession, elapsedSeconds } = useActiveTimer();

  if (activeSession) {
    return (
      <button
        onClick={() => window.dispatchEvent(new Event("become:stop-timer"))}
        className={cn(
          "group flex items-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-left transition-colors hover:border-[var(--primary)]/60",
          compact ? "size-12 justify-center" : "w-full gap-3 px-3 py-2.5",
        )}
        aria-label={`Stop ${activeSession.activityType.name} timer`}
        data-testid="active-timer-trigger"
        data-session-id={activeSession.id}
        data-elapsed-seconds={elapsedSeconds}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[#17110a]">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--primary)] opacity-15" />
          <Square className="size-3 fill-current" />
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="timer-trigger-label block truncate text-[var(--text-secondary)]">
              {activeSession.activityType.name}
            </span>
            <span className="timer-numerals block text-sm font-semibold text-[var(--primary)]">
              {formatDuration(elapsedSeconds)}
            </span>
          </span>
        )}
      </button>
    );
  }

  return (
    <Button
      onClick={() => window.dispatchEvent(new Event("become:start-timer"))}
      className={cn(compact ? "size-12 px-0" : "w-full")}
      aria-label="Start timer"
      data-testid="start-timer-trigger"
    >
      <Play className="size-4 fill-current" />
      {!compact && "Start timer"}
    </Button>
  );
}

export function TimerController({ domains }: TimerControllerProps) {
  const router = useRouter();
  const { activeSession, elapsedSeconds } = useActiveTimer();
  const [mode, setMode] = useState<"closed" | "start" | "stop">("closed");
  const [selectedDomainId, setSelectedDomainId] = useState(
    domains[0]?.id ?? "",
  );
  const [selectedActivityId, setSelectedActivityId] = useState(
    domains[0]?.activityTypes[0]?.id ?? "",
  );
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDomain = useMemo(
    () =>
      domains.find((domain) => domain.id === selectedDomainId) ?? domains[0],
    [domains, selectedDomainId],
  );

  useEffect(() => {
    const start = () => setMode("start");
    const stop = () => setMode("stop");
    window.addEventListener("become:start-timer", start);
    window.addEventListener("become:stop-timer", stop);
    return () => {
      window.removeEventListener("become:start-timer", start);
      window.removeEventListener("become:stop-timer", stop);
    };
  }, []);

  useEffect(() => {
    if (mode === "closed") return;
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && setMode("closed");
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mode]);

  async function startTimer() {
    if (!selectedDomain || !selectedActivityId) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domainId: selectedDomain.id,
        activityTypeId: selectedActivityId,
        description,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok)
      return setError(body.error ?? "Could not start the timer.");
    setDescription("");
    setMode("closed");
    router.refresh();
  }

  async function stopTimer() {
    if (!activeSession) return;
    setPending(true);
    setError(null);
    const response = await fetch(`/api/sessions/${activeSession.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, notes }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok)
      return setError(body.error ?? "Could not stop the timer.");
    setOutcome("");
    setNotes("");
    setMode("closed");
    router.refresh();
  }

  return (
    <>
      {mode !== "closed" && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => setMode("closed")}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="timer-dialog-title"
            className="timer-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-7 flex items-start justify-between">
              <div>
                <p className="eyebrow mb-2">
                  {mode === "start"
                    ? "Begin a focus block"
                    : "Complete session"}
                </p>
                <h2
                  id="timer-dialog-title"
                  className="text-2xl font-semibold tracking-[-0.04em]"
                >
                  {mode === "start"
                    ? "What are you working on?"
                    : "What came from the time?"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setMode("closed")}
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {mode === "start" ? (
              <div className="space-y-6">
                <fieldset>
                  <legend className="field-label">Domain</legend>
                  <div className="domain-picker">
                    {domains.map((domain) => (
                      <button
                        key={domain.id}
                        type="button"
                        className={cn(
                          "domain-choice",
                          selectedDomain?.id === domain.id && "selected",
                        )}
                        onClick={() => {
                          setSelectedDomainId(domain.id);
                          setSelectedActivityId(
                            domain.activityTypes[0]?.id ?? "",
                          );
                        }}
                      >
                        <DomainIcon slug={domain.slug} />
                        <span>{domain.name}</span>
                        {selectedDomain?.id === domain.id && (
                          <Check className="ml-auto size-4 text-[var(--primary)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="field-label">Activity</span>
                  <span className="select-wrap">
                    <select
                      value={selectedActivityId}
                      onChange={(event) =>
                        setSelectedActivityId(event.target.value)
                      }
                      data-testid="activity-select"
                    >
                      {selectedDomain?.activityTypes.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="size-4 rotate-90" />
                  </span>
                </label>
                <label className="block">
                  <span className="field-label">
                    Focus{" "}
                    <span className="text-[var(--text-muted)] normal-case">
                      — optional
                    </span>
                  </span>
                  <input
                    className="text-input"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="A short intention for this session"
                    maxLength={500}
                    data-testid="session-description"
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={startTimer}
                  disabled={pending || !selectedActivityId}
                  data-testid="confirm-start-timer"
                >
                  <Play className="size-4 fill-current" />{" "}
                  {pending ? "Starting…" : "Start focus session"}
                </Button>
              </div>
            ) : activeSession ? (
              <div className="space-y-6">
                <div className="stop-summary">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <Clock3 className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {activeSession.activityType.name}
                      </p>
                      <p className="dialog-supporting-text text-[var(--text-muted)]">
                        {activeSession.domain.name}
                      </p>
                    </div>
                  </div>
                  <span className="timer-numerals text-xl font-semibold text-[var(--primary)]">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </div>
                <label className="block">
                  <span className="field-label">
                    Outcome{" "}
                    <span className="text-[var(--text-muted)] normal-case">
                      — optional
                    </span>
                  </span>
                  <input
                    className="text-input"
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                    placeholder="What changed, shipped, or became clearer?"
                    maxLength={500}
                    data-testid="session-outcome"
                  />
                </label>
                <label className="block">
                  <span className="field-label">
                    Notes{" "}
                    <span className="text-[var(--text-muted)] normal-case">
                      — optional
                    </span>
                  </span>
                  <textarea
                    className="text-input min-h-24 resize-none"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Anything worth preserving"
                    maxLength={500}
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setMode("closed")}
                    className="px-4"
                  >
                    <ArrowLeft className="size-4" />
                    Keep running
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={stopTimer}
                    disabled={pending}
                    data-testid="confirm-stop-timer"
                  >
                    <Square className="size-3 fill-current" />{" "}
                    {pending ? "Saving…" : "Stop & save"}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}
