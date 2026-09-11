"use client";

import Link from "next/link";
import { BusinessTimerFields } from "@/features/entrepreneurship/sessions/components/business-timer-fields.component";
import { EngineeringTimerFields } from "@/features/engineering/sessions/components/engineering-timer-fields.component";
import { FinanceTimerFields } from "@/features/finance/sessions/components/finance-timer-fields.component";
import type {
  FinanceSessionInput,
  FinanceWorkOptions,
} from "@/features/finance/sessions/types/finance-session.types";
import { useEffect, useMemo, useRef, useState } from "react";
import { MOTION_DURATION_MS } from "@/components/ui/motion/constants/motion.constants";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
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
  ENGINEERING_EVIDENCE_TYPE_OPTIONS,
  getEngineeringContextLabel,
} from "@/features/engineering/constants/engineering.constants";
import { rememberEngineeringEvidenceArrival } from "@/features/engineering/evidence/utils/engineering-evidence-motion.util";
import type {
  EngineeringContextValue,
  EngineeringEvidenceTypeValue,
  EngineeringProjectOption,
} from "@/features/engineering/types/engineering.types";
import type {
  DomainOption,
  SessionDetailItem,
} from "@/features/sessions/types/session.types";
import { SESSION_RESOLUTION_STORAGE_KEY } from "@/features/sessions/constants/session-motion.constants";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";
import { formatDuration } from "@/lib/dates/utils/period.util";

type TimerControllerProps = {
  domains: DomainOption[];
  engineeringProjects: EngineeringProjectOption[];
  financeOptions: FinanceWorkOptions;
};

export function TimerTrigger({ compact = false }: { compact?: boolean }) {
  const { activeSession, elapsedSeconds } = useActiveTimer();

  if (activeSession) {
    return (
      <button
        onClick={(event) => {
          event.currentTarget.focus();
          window.dispatchEvent(new Event("become:stop-timer"));
        }}
        className={cn(
          "group border-primary/30 bg-primary-subtle hover:border-primary/60 duration-fast ease-move flex items-center rounded-full border text-left transition-[color,border-color,background-color,transform] active:translate-y-px active:scale-[0.99] motion-reduce:transform-none",
          compact ? "size-12 justify-center" : "gap-md px-md w-full py-2.5",
        )}
        aria-label={`Stop ${activeSession.activityType.name} timer`}
        data-testid="active-timer-trigger"
        data-session-id={activeSession.id}
        data-elapsed-seconds={elapsedSeconds}
      >
        <span className="bg-primary text-on-primary relative flex size-8 shrink-0 items-center justify-center rounded-full">
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
      onClick={(event) => {
        event.currentTarget.focus();
        window.dispatchEvent(new Event("become:start-timer"));
      }}
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
  financeOptions,
}: TimerControllerProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resolutionTimerRef = useRef<number | null>(null);
  const [resolvedSession, setResolvedSession] =
    useState<SessionDetailItem | null>(null);
  const [business, setBusiness] = useState({
    businessCompanyId: "",
    businessNicheId: "",
  });
  const [completionBusiness, setCompletionBusiness] = useState({
    businessCompanyId: "",
    businessNicheId: "",
  });
  const [captureSessionId, setCaptureSessionId] = useState<string | null>(null);
  const [finance, setFinance] = useState<FinanceSessionInput>({
    workSourceId: "",
    incomeOpportunityId: "",
    financeCompensationType: "UNKNOWN",
  });
  const { activeSession, elapsedSeconds, confirmCompletion } = useActiveTimer();
  const displayedSession = resolvedSession ?? activeSession;
  const [mode, setMode] = useState<"start" | "stop">("start");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolutionState, setResolutionState] = useState<"idle" | "confirmed">(
    "idle",
  );
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
  const dialogPresence = usePresence(dialogOpen);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-timer-mutation-pending",
      pending,
    );
    return () =>
      document.documentElement.removeAttribute("data-timer-mutation-pending");
  }, [pending]);

  useModalLayer({
    open: dialogOpen,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onClose: () => setDialogOpen(false),
  });

  const selectedDomain = useMemo(
    () =>
      domains.find((domain) => domain.id === selectedDomainId) ?? domains[0],
    [domains, selectedDomainId],
  );
  const financeKind =
    selectedDomain?.slug === "finance"
      ? (selectedDomain.activityTypes.find(
          (activity) => activity.id === selectedActivityId,
        )?.financeActivityKind ?? null)
      : null;
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
    const start = (event: Event) => {
      if (activeSession) {
        window.dispatchEvent(new Event("become:stop-timer"));
        return;
      }
      const workspace = /^\/entrepreneurship\/explorations\/([^/]+)/.exec(
        window.location.pathname,
      )?.[1];
      const nicheId =
        (event as CustomEvent<{ businessNicheId?: string }>).detail
          ?.businessNicheId ??
        workspace ??
        "";
      if (nicheId) {
        const domain = domains.find((item) => item.slug === "entrepreneurship");
        if (domain) {
          setSelectedDomainId(domain.id);
          setSelectedActivityId(domain.activityTypes[0]?.id ?? "");
        }
      }
      if (resolutionTimerRef.current !== null) {
        window.clearTimeout(resolutionTimerRef.current);
        resolutionTimerRef.current = null;
      }
      setOutcome("");
      setNotes("");
      setIncludeEvidence(false);
      setEvidenceTitle("");
      setEvidenceDetails("");
      setResolvedSession(null);
      setError(null);
      setResolutionState("idle");
      setCaptureSessionId(null);
      setBusiness({ businessCompanyId: "", businessNicheId: nicheId });
      setMode("start");
      setDialogOpen(true);
    };
    const stop = () => {
      if (!activeSession) return;
      if (resolutionTimerRef.current !== null) {
        window.clearTimeout(resolutionTimerRef.current);
        resolutionTimerRef.current = null;
      }
      setResolvedSession(null);
      setError(null);
      setResolutionState("idle");
      setCompletionContext(
        (activeSession?.engineeringContext as EngineeringContextValue | null) ??
          "",
      );
      setCompletionProjectId(activeSession?.engineeringProject?.id ?? "");
      setCompletionBusiness({
        businessCompanyId: activeSession.businessCompanyId ?? "",
        businessNicheId: activeSession.businessNicheId ?? "",
      });
      setMode("stop");
      setDialogOpen(true);
    };
    window.addEventListener("become:start-timer", start);
    window.addEventListener("become:stop-timer", stop);
    return () => {
      window.removeEventListener("become:start-timer", start);
      window.removeEventListener("become:stop-timer", stop);
    };
  }, [activeSession, domains]);

  useEffect(() => {
    return () => {
      if (resolutionTimerRef.current !== null) {
        window.clearTimeout(resolutionTimerRef.current);
      }
    };
  }, []);

  async function startTimer() {
    if (!selectedDomain || !selectedActivityId) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(selectedDomain.slug === "entrepreneurship"
          ? {
              businessCompanyId: business.businessCompanyId || null,
              businessNicheId: business.businessNicheId || null,
            }
          : {}),
        domainId: selectedDomain.id,
        activityTypeId: selectedActivityId,
        engineeringContext: isEngineering ? engineeringContext || null : null,
        engineeringProjectId: isEngineering
          ? engineeringProjectId || null
          : null,
        workSourceId:
          financeKind === "PAID_WORK" ? finance.workSourceId || null : null,
        incomeOpportunityId:
          financeKind && financeKind !== "FINANCE_ADMIN"
            ? finance.incomeOpportunityId || null
            : null,
        financeCompensationType:
          financeKind === "PAID_WORK" ? finance.financeCompensationType : null,
        description,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok)
      return setError(body.error ?? "Could not start the timer.");
    setDescription("");
    setFinance({
      workSourceId: "",
      incomeOpportunityId: "",
      financeCompensationType: "UNKNOWN",
    });
    setEngineeringContext("");
    setEngineeringProjectId("");
    setDialogOpen(false);
    router.refresh();
  }

  async function stopTimer() {
    if (!activeSession || pending || resolutionState === "confirmed") return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${activeSession.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome,
            notes,
            ...(activeSession.domain.slug === "entrepreneurship" &&
            (completionBusiness.businessCompanyId !==
              (activeSession.businessCompanyId ?? "") ||
              completionBusiness.businessNicheId !==
                (activeSession.businessNicheId ?? ""))
              ? {
                  businessCompanyId:
                    completionBusiness.businessCompanyId || null,
                  businessNicheId: completionBusiness.businessNicheId || null,
                }
              : {}),
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
        },
      );
      const body = (await response.json()) as {
        error?: string;
        sessionId?: string;
        evidenceId?: string | null;
        session?: SessionDetailItem;
      };
      if (!response.ok)
        return setError(body.error ?? "Could not stop the timer.");
      if (!body.session?.endedAt || body.session.id !== activeSession.id) {
        throw new Error("Missing completed session in response.");
      }
      confirmCompletion(body.session);
      setResolvedSession(body.session);
      if (body.sessionId) {
        try {
          window.sessionStorage.setItem(
            SESSION_RESOLUTION_STORAGE_KEY,
            JSON.stringify({
              sessionId: body.sessionId,
              confirmedAt: Date.now(),
            }),
          );
        } catch {
          // The confirmation itself does not depend on motion storage.
        }
      }
      if (body.evidenceId && includeEvidence && evidenceTitle.trim()) {
        rememberEngineeringEvidenceArrival(evidenceTitle.trim());
      }

      setResolutionState("confirmed");
      // Refresh secondary data immediately; timer truth no longer waits for it.
      router.refresh();
      resolutionTimerRef.current = window.setTimeout(() => {
        setOutcome("");
        setNotes("");
        setIncludeEvidence(false);
        setEvidenceTitle("");
        setEvidenceDetails("");
        setDialogOpen(false);
        if (body.session?.domain.slug === "entrepreneurship")
          setCaptureSessionId(body.session.id);
        setResolutionState("idle");
        resolutionTimerRef.current = null;
      }, MOTION_DURATION_MS.emphasis);
    } catch {
      setError(
        "Could not confirm the save. Please try again; a saved session will not be completed twice.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {captureSessionId && (
        <aside className="business-completion-note" aria-label="Session saved">
          <p>Session saved. Something worth keeping?</p>
          <Link
            href={`/entrepreneurship/interactions/capture?session=${encodeURIComponent(captureSessionId)}`}
            onClick={() => setCaptureSessionId(null)}
          >
            Log an interaction
          </Link>
          <button onClick={() => setCaptureSessionId(null)}>Not now</button>
        </aside>
      )}
      {dialogPresence.isPresent && (
        <div
          className="dialog-backdrop"
          data-state={dialogPresence.presenceState}
          aria-hidden={!dialogOpen}
          onAnimationEnd={dialogPresence.onPresenceAnimationEnd}
          role="presentation"
          onMouseDown={() => setDialogOpen(false)}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timer-dialog-title"
            className="timer-dialog"
            data-resolution={resolutionState}
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
                  className="text-h3 font-semibold tracking-[-0.04em]"
                >
                  {mode === "start"
                    ? "What are you working on?"
                    : "What came from the time?"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                className="icon-button"
                onClick={() => setDialogOpen(false)}
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
                {selectedDomain?.slug === "entrepreneurship" && (
                  <BusinessTimerFields
                    value={business}
                    onChange={setBusiness}
                  />
                )}
                <FinanceTimerFields
                  kind={financeKind}
                  options={financeOptions}
                  value={finance}
                  onChange={setFinance}
                />
                {isEngineering && (
                  <EngineeringTimerFields
                    context={engineeringContext}
                    projectId={engineeringProjectId}
                    projects={engineeringProjects}
                    onContextChange={setEngineeringContext}
                    onProjectChange={setEngineeringProjectId}
                  />
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
            ) : displayedSession ? (
              <div className="space-y-2xl">
                <div className="stop-summary">
                  <div className="gap-md flex items-center">
                    <span
                      className={cn(
                        "session-resolution-mark",
                        resolutionState === "confirmed" && "is-confirmed",
                      )}
                    >
                      {resolutionState === "confirmed" ? (
                        <Check className="size-4" />
                      ) : (
                        <Clock3 className="size-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-body font-medium">
                        {displayedSession.activityType.name}
                      </p>
                      <p className="dialog-supporting-text text-text-muted">
                        {displayedSession.domain.name}
                        {displayedSession.engineeringContext
                          ? ` · ${getEngineeringContextLabel(displayedSession.engineeringContext)}`
                          : ""}
                        {displayedSession.engineeringProject
                          ? ` · ${displayedSession.engineeringProject.name}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="timer-numerals text-primary text-h5 font-semibold">
                    {formatDuration(
                      resolvedSession?.durationSeconds ?? elapsedSeconds,
                    )}
                  </span>
                </div>
                {displayedSession.domain.slug === "entrepreneurship" && (
                  <BusinessTimerFields
                    value={completionBusiness}
                    onChange={setCompletionBusiness}
                  />
                )}
                {displayedSession.domain.slug === "engineering" && (
                  <EngineeringTimerFields
                    completion
                    context={completionContext}
                    projectId={completionProjectId}
                    projects={completionProjects}
                    onContextChange={setCompletionContext}
                    onProjectChange={setCompletionProjectId}
                  />
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
                {displayedSession.domain.slug === "engineering" && (
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
                    onClick={() => setDialogOpen(false)}
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
                      resolutionState === "confirmed" ||
                      (displayedSession.domain.slug === "engineering" &&
                        (!completionContext ||
                          (includeEvidence && !evidenceTitle.trim())))
                    }
                    data-testid="confirm-stop-timer"
                  >
                    {resolutionState === "confirmed" ? (
                      <Check className="size-4" />
                    ) : (
                      <Square className="size-3 fill-current" />
                    )}{" "}
                    {resolutionState === "confirmed"
                      ? "Session saved"
                      : pending
                        ? "Saving…"
                        : "Stop & save"}
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
