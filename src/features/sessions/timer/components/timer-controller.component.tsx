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
import { Button } from "@/components/ui/buttons/button.component";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import {
  ENGINEERING_CONTEXT_OPTIONS,
  ENGINEERING_EVIDENCE_TYPE_OPTIONS,
  getEngineeringContextLabel,
} from "@/features/engineering/constants/engineering.constants";
import type {
  EngineeringContextValue,
  EngineeringEvidenceTypeValue,
  EngineeringProjectOption,
} from "@/features/engineering/types/engineering.types";
import type { DomainOption } from "@/features/sessions/types/session.types";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";
import { formatDuration } from "@/lib/dates/utils/period.util";

type TimerControllerProps = {
  domains: DomainOption[];
  engineeringProjects: EngineeringProjectOption[];
};

export function TimerTrigger({ compact = false }: { compact?: boolean }) {
  const { activeSession, elapsedSeconds } = useActiveTimer();

  if (activeSession) {
    return (
      <button
        onClick={() => window.dispatchEvent(new Event("become:stop-timer"))}
        className={cn(
          "group border-primary/30 bg-primary-subtle hover:border-primary/60 flex items-center rounded-full border text-left transition-colors",
          compact ? "size-12 justify-center" : "gap-md px-md w-full py-2.5",
        )}
        aria-label={`Stop ${activeSession.activityType.name} timer`}
        data-testid="active-timer-trigger"
        data-session-id={activeSession.id}
        data-elapsed-seconds={elapsedSeconds}
      >
        <span className="bg-primary text-on-primary relative flex size-8 shrink-0 items-center justify-center rounded-full">
          <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-15" />
          <Square className="size-3 fill-current" />
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="timer-trigger-label text-text-secondary block truncate">
              {activeSession.activityType.name}
            </span>
            <span className="timer-numerals text-primary text-body block font-semibold">
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

export function TimerController({
  domains,
  engineeringProjects,
}: TimerControllerProps) {
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
  const [engineeringContext, setEngineeringContext] = useState<
    EngineeringContextValue | ""
  >("");
  const [engineeringProjectId, setEngineeringProjectId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [completionContext, setCompletionContext] = useState<
    EngineeringContextValue | ""
  >("");
  const [completionProjectId, setCompletionProjectId] = useState("");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [evidenceType, setEvidenceType] =
    useState<EngineeringEvidenceTypeValue>("FEATURE_COMPLETED");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDetails, setEvidenceDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDomain = useMemo(
    () =>
      domains.find((domain) => domain.id === selectedDomainId) ?? domains[0],
    [domains, selectedDomainId],
  );
  const isEngineering = selectedDomain?.slug === "engineering";
  const completionProjects = useMemo(() => {
    if (
      !activeSession?.engineeringProject ||
      engineeringProjects.some(
        (project) => project.id === activeSession.engineeringProject?.id,
      )
    ) {
      return engineeringProjects;
    }
    return [activeSession.engineeringProject, ...engineeringProjects];
  }, [activeSession, engineeringProjects]);

  useEffect(() => {
    const start = () => setMode("start");
    const stop = () => {
      setCompletionContext(
        (activeSession?.engineeringContext as EngineeringContextValue | null) ??
          "",
      );
      setCompletionProjectId(activeSession?.engineeringProject?.id ?? "");
      setMode("stop");
    };
    window.addEventListener("become:start-timer", start);
    window.addEventListener("become:stop-timer", stop);
    return () => {
      window.removeEventListener("become:start-timer", start);
      window.removeEventListener("become:stop-timer", stop);
    };
  }, [activeSession]);

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
        engineeringContext: isEngineering ? engineeringContext || null : null,
        engineeringProjectId: isEngineering
          ? engineeringProjectId || null
          : null,
        description,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok)
      return setError(body.error ?? "Could not start the timer.");
    setDescription("");
    setEngineeringContext("");
    setEngineeringProjectId("");
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
      body: JSON.stringify({
        outcome,
        notes,
        ...(activeSession.domain.slug === "engineering"
          ? {
              engineeringContext: completionContext || null,
              engineeringProjectId: completionProjectId || null,
              engineeringEvidence: includeEvidence
                ? {
                    type: evidenceType,
                    title: evidenceTitle,
                    details: evidenceDetails,
                  }
                : null,
            }
          : {}),
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok)
      return setError(body.error ?? "Could not stop the timer.");
    setOutcome("");
    setNotes("");
    setIncludeEvidence(false);
    setEvidenceTitle("");
    setEvidenceDetails("");
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
                <p className="eyebrow mb-sm">
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
              <div className="space-y-2xl">
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
                          setEngineeringContext("");
                          setEngineeringProjectId("");
                        }}
                      >
                        <DomainIcon slug={domain.slug} />
                        <span>{domain.name}</span>
                        {selectedDomain?.id === domain.id && (
                          <Check className="text-primary ml-auto size-4" />
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
                {isEngineering && (
                  <div className="engineering-timer-fields">
                    <label className="block">
                      <span className="field-label">Context</span>
                      <span className="select-wrap">
                        <select
                          value={engineeringContext}
                          onChange={(event) =>
                            setEngineeringContext(
                              event.target.value as
                                EngineeringContextValue | "",
                            )
                          }
                          data-testid="engineering-context-select"
                        >
                          <option value="">Choose a context</option>
                          {ENGINEERING_CONTEXT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="size-4 rotate-90" />
                      </span>
                    </label>
                    <label className="block">
                      <span className="field-label">
                        Project{" "}
                        <span className="text-text-muted normal-case">
                          — optional
                        </span>
                      </span>
                      <span className="select-wrap">
                        <select
                          value={engineeringProjectId}
                          onChange={(event) => {
                            const projectId = event.target.value;
                            setEngineeringProjectId(projectId);
                            const project = engineeringProjects.find(
                              (candidate) => candidate.id === projectId,
                            );
                            if (project) setEngineeringContext(project.context);
                          }}
                          data-testid="engineering-project-select"
                        >
                          <option value="">No project</option>
                          {engineeringProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="size-4 rotate-90" />
                      </span>
                    </label>
                  </div>
                )}
                <label className="block">
                  <span className="field-label">
                    Focus{" "}
                    <span className="text-text-muted normal-case">
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
                  disabled={
                    pending ||
                    !selectedActivityId ||
                    (isEngineering && !engineeringContext)
                  }
                  data-testid="confirm-start-timer"
                >
                  <Play className="size-4 fill-current" />{" "}
                  {pending ? "Starting…" : "Start focus session"}
                </Button>
              </div>
            ) : activeSession ? (
              <div className="space-y-2xl">
                <div className="stop-summary">
                  <div className="gap-md flex items-center">
                    <span className="bg-primary-subtle text-primary flex size-9 items-center justify-center rounded-full">
                      <Clock3 className="size-4" />
                    </span>
                    <div>
                      <p className="text-body font-medium">
                        {activeSession.activityType.name}
                      </p>
                      <p className="dialog-supporting-text text-text-muted">
                        {activeSession.domain.name}
                        {activeSession.engineeringContext
                          ? ` · ${getEngineeringContextLabel(activeSession.engineeringContext)}`
                          : ""}
                        {activeSession.engineeringProject
                          ? ` · ${activeSession.engineeringProject.name}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="timer-numerals text-primary text-xl font-semibold">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </div>
                {activeSession.domain.slug === "engineering" && (
                  <div className="engineering-timer-fields">
                    <label className="block">
                      <span className="field-label">Context</span>
                      <span className="select-wrap">
                        <select
                          value={completionContext}
                          onChange={(event) =>
                            setCompletionContext(
                              event.target.value as
                                EngineeringContextValue | "",
                            )
                          }
                          data-testid="completion-engineering-context-select"
                        >
                          <option value="">Choose a context</option>
                          {ENGINEERING_CONTEXT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="size-4 rotate-90" />
                      </span>
                    </label>
                    <label className="block">
                      <span className="field-label">
                        Project{" "}
                        <span className="text-text-muted normal-case">
                          — optional
                        </span>
                      </span>
                      <span className="select-wrap">
                        <select
                          value={completionProjectId}
                          onChange={(event) =>
                            setCompletionProjectId(event.target.value)
                          }
                          data-testid="completion-engineering-project-select"
                        >
                          <option value="">No project</option>
                          {completionProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="size-4 rotate-90" />
                      </span>
                    </label>
                  </div>
                )}
                <label className="block">
                  <span className="field-label">
                    Outcome{" "}
                    <span className="text-text-muted normal-case">
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
                {activeSession.domain.slug === "engineering" && (
                  <div className="engineering-evidence-capture">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setIncludeEvidence((value) => !value)}
                    >
                      {includeEvidence
                        ? "Remove evidence"
                        : "Record concrete evidence"}
                    </button>
                    {includeEvidence && (
                      <div className="space-y-xl pt-lg">
                        <label className="block">
                          <span className="field-label">Evidence type</span>
                          <span className="select-wrap">
                            <select
                              value={evidenceType}
                              onChange={(event) =>
                                setEvidenceType(
                                  event.target
                                    .value as EngineeringEvidenceTypeValue,
                                )
                              }
                              data-testid="engineering-evidence-type-select"
                            >
                              {ENGINEERING_EVIDENCE_TYPE_OPTIONS.map(
                                (option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ),
                              )}
                            </select>
                            <ChevronRight className="size-4 rotate-90" />
                          </span>
                        </label>
                        <label className="block">
                          <span className="field-label">Evidence</span>
                          <input
                            className="text-input"
                            value={evidenceTitle}
                            onChange={(event) =>
                              setEvidenceTitle(event.target.value)
                            }
                            maxLength={160}
                            placeholder="What was built, solved, or learned?"
                            data-testid="engineering-evidence-title"
                          />
                        </label>
                        <label className="block">
                          <span className="field-label">
                            Details{" "}
                            <span className="text-text-muted normal-case">
                              — optional
                            </span>
                          </span>
                          <textarea
                            className="text-input text-input--textarea-sm resize-none"
                            value={evidenceDetails}
                            onChange={(event) =>
                              setEvidenceDetails(event.target.value)
                            }
                            maxLength={5000}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                <label className="block">
                  <span className="field-label">
                    Notes{" "}
                    <span className="text-text-muted normal-case">
                      — optional
                    </span>
                  </span>
                  <textarea
                    className="text-input text-input--textarea-sm resize-none"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Anything worth preserving"
                    maxLength={500}
                    data-testid="session-notes"
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <div className="gap-md flex">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setMode("closed")}
                    className="px-lg"
                  >
                    <ArrowLeft className="size-4" />
                    Keep running
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={stopTimer}
                    disabled={
                      pending ||
                      (activeSession.domain.slug === "engineering" &&
                        (!completionContext ||
                          (includeEvidence && !evidenceTitle.trim())))
                    }
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
