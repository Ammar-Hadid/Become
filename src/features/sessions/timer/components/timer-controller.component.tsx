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
  ActiveSessionData,
  SessionDetailItem,
} from "@/features/sessions/types/session.types";
import { SESSION_RESOLUTION_STORAGE_KEY } from "@/features/sessions/constants/session-motion.constants";
import { SessionTimerActions } from "@/features/sessions/timer/components/session-timer-actions.component";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";
import { formatDuration } from "@/lib/dates/utils/period.util";

type TimerControllerProps = {
  domains: DomainOption[];
  engineeringProjects: EngineeringProjectOption[];
  financeOptions: FinanceWorkOptions;
};

function focusVisibleTimerTrigger() {
  const trigger = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-testid="active-timer-trigger"], [data-testid="start-timer-trigger"]',
    ),
  ).find((element) => element.getClientRects().length > 0);
  trigger?.focus({ preventScroll: true });
}

export function TimerController({
  domains,
  engineeringProjects,
  financeOptions,
}: TimerControllerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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
  const {
    activeSession,
    elapsedSeconds,
    completedSessions,
    pendingOperation,
    recoveryRequired,
    startSession,
    completeSession,
  } = useActiveTimer();
  const [completionTarget, setCompletionTarget] =
    useState<ActiveSessionData | null>(null);
  const displayedSession =
    resolvedSession ??
    (completionTarget
      ? activeSession?.id === completionTarget.id
        ? activeSession
        : (completedSessions[completionTarget.id] ?? completionTarget)
      : null);
  const [mode, setMode] = useState<"start" | "manage" | "stop">("start");
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
  const pending = Boolean(pendingOperation);
  const [error, setError] = useState<string | null>(null);
  const dialogPresence = usePresence(dialogOpen);

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
      !completionTarget?.engineeringProject ||
      engineeringProjects.some(
        (project) => project.id === completionTarget.engineeringProject?.id,
      )
    ) {
      return engineeringProjects;
    }
    return [completionTarget.engineeringProject, ...engineeringProjects];
  }, [completionTarget, engineeringProjects]);

  useEffect(() => {
    const start = (event: Event) => {
      if (activeSession) {
        window.dispatchEvent(new Event("become:manage-timer"));
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
    const manage = () => {
      if (!activeSession) return;
      setResolvedSession(null);
      setError(null);
      setMode("manage");
      setDialogOpen(true);
    };
    const stop = () => {
      if (!activeSession) return;
      if (completionTarget?.id !== activeSession.id) {
        setOutcome("");
        setNotes("");
        setIncludeEvidence(false);
        setEvidenceType("FEATURE_COMPLETED");
        setEvidenceTitle("");
        setEvidenceDetails("");
        setCompletionContext(
          (activeSession.engineeringContext as EngineeringContextValue | null) ??
            "",
        );
        setCompletionProjectId(activeSession.engineeringProject?.id ?? "");
        setCompletionBusiness({
          businessCompanyId: activeSession.businessCompanyId ?? "",
          businessNicheId: activeSession.businessNicheId ?? "",
        });
      }
      setCompletionTarget(activeSession);
      setResolvedSession(null);
      setError(null);
      setResolutionState("idle");
      setMode("stop");
      setDialogOpen(true);
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    };
    window.addEventListener("become:start-timer", start);
    window.addEventListener("become:stop-timer", stop);
    window.addEventListener("become:manage-timer", manage);
    return () => {
      window.removeEventListener("become:start-timer", start);
      window.removeEventListener("become:stop-timer", stop);
      window.removeEventListener("become:manage-timer", manage);
    };
  }, [activeSession, completionTarget?.id, domains]);

  async function startTimer() {
    if (
      !selectedDomain ||
      !selectedActivityId ||
      pending ||
      activeSession ||
      recoveryRequired
    )
      return;
    setError(null);
    const result = await startSession({
      ...(selectedDomain.slug === "entrepreneurship"
        ? {
            businessCompanyId: business.businessCompanyId || null,
            businessNicheId: business.businessNicheId || null,
          }
        : {}),
      domainId: selectedDomain.id,
      activityTypeId: selectedActivityId,
      engineeringContext: isEngineering ? engineeringContext || null : null,
      engineeringProjectId: isEngineering ? engineeringProjectId || null : null,
      workSourceId:
        financeKind === "PAID_WORK" ? finance.workSourceId || null : null,
      incomeOpportunityId:
        financeKind && financeKind !== "FINANCE_ADMIN"
          ? finance.incomeOpportunityId || null
          : null,
      financeCompensationType:
        financeKind === "PAID_WORK" ? finance.financeCompensationType : null,
      description,
    });
    if (!result.ok)
      return setError(result.error ?? "Could not start the timer.");
    setDescription("");
    setFinance({
      workSourceId: "",
      incomeOpportunityId: "",
      financeCompensationType: "UNKNOWN",
    });
    setEngineeringContext("");
    setEngineeringProjectId("");
    setDialogOpen(false);
  }

  async function stopTimer() {
    if (!completionTarget || pending || resolutionState === "confirmed") return;
    setError(null);
    try {
      const body = await completeSession(completionTarget.id, {
        outcome,
        notes,
        ...(completionTarget.domain.slug === "entrepreneurship" &&
        (completionBusiness.businessCompanyId !==
          (completionTarget.businessCompanyId ?? "") ||
          completionBusiness.businessNicheId !==
            (completionTarget.businessNicheId ?? ""))
          ? {
              businessCompanyId: completionBusiness.businessCompanyId || null,
              businessNicheId: completionBusiness.businessNicheId || null,
            }
          : {}),
        ...(completionTarget.domain.slug === "engineering"
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
      });
      if (!body.ok) return setError(body.error ?? "Could not stop the timer.");
      if (!body.session?.endedAt || body.session.id !== completionTarget.id) {
        throw new Error("Missing completed session in response.");
      }
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
      if (body.evidenceId && includeEvidence) {
        rememberEngineeringEvidenceArrival(body.evidenceId);
      }

      setResolutionState("confirmed");
      setOutcome("");
      setNotes("");
      setIncludeEvidence(false);
      setEvidenceTitle("");
      setEvidenceDetails("");
      setDialogOpen(false);
      window.requestAnimationFrame(focusVisibleTimerTrigger);
      if (body.session?.domain.slug === "entrepreneurship")
        setCaptureSessionId(body.session.id);
      setResolutionState("idle");
    } catch {
      setError(
        "Could not confirm the save. Please try again; a saved session will not be completed twice.",
      );
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (dialogOpen && mode !== "start") closeButtonRef.current?.focus();
      else if (!dialogOpen && document.activeElement === document.body)
        focusVisibleTimerTrigger();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dialogOpen, mode]);

  // Reconcile this component's mode before committing obsolete start controls.
  if (dialogOpen && mode === "start" && activeSession) setMode("manage");
  if (dialogOpen && mode === "manage" && !activeSession) setDialogOpen(false);

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
          inert={dialogPresence.isExiting}
          onAnimationEnd={dialogPresence.onPresenceAnimationEnd}
          role="presentation"
          onMouseDown={() => setDialogOpen(false)}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
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
                    : mode === "manage"
                      ? "Current session"
                      : "Complete session"}
                </p>
                <h2
                  id="timer-dialog-title"
                  className="text-h3 font-semibold tracking-[-0.04em]"
                >
                  {mode === "start"
                    ? "What are you working on?"
                    : mode === "manage"
                      ? activeSession?.status === "PAUSED"
                        ? "Ready to pick it back up?"
                        : "Your focus session"
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
                    Boolean(activeSession) ||
                    recoveryRequired ||
                    !selectedActivityId ||
                    (isEngineering && !engineeringContext)
                  }
                  data-testid="confirm-start-timer"
                >
                  <Play className="size-4 fill-current" />{" "}
                  {pending ? "Starting…" : "Start focus session"}
                </Button>
              </div>
            ) : mode === "manage" && activeSession ? (
              <div className="space-y-2xl">
                <div className="stop-summary gap-lg">
                  <div className="min-w-0">
                    <p className="text-body font-medium">
                      {activeSession.description ||
                        activeSession.contentActivitySnapshot ||
                        activeSession.activityType.name}
                    </p>
                    <p className="dialog-supporting-text text-text-secondary mt-xs">
                      {activeSession.domain.name} ·{" "}
                      {activeSession.contentActivitySnapshot ||
                        activeSession.activityType.name}
                    </p>
                    {activeSession.contentTitleSnapshot && (
                      <p className="dialog-supporting-text text-text-secondary mt-xs">
                        {activeSession.contentTitleSnapshot}
                        {activeSession.contentVariantSnapshot
                          ? ` · ${activeSession.contentVariantSnapshot}`
                          : ""}
                      </p>
                    )}
                    {activeSession.engineeringProject && (
                      <p className="dialog-supporting-text text-text-secondary mt-xs">
                        {activeSession.engineeringProject.name}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-body-sm text-text-muted">Focused time</p>
                    <p className="timer-numerals text-h5 mt-xs font-semibold">
                      {formatDuration(elapsedSeconds)}
                    </p>
                  </div>
                </div>
                <p className="text-body text-text-secondary">
                  {activeSession.status === "PAUSED"
                    ? "Your session is paused. Break time is excluded, and you can end the session here without resuming."
                    : "Take a break without losing this session, or finish and save what came from the time."}
                </p>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <SessionTimerActions />
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
                        {displayedSession.contentActivitySnapshot ||
                          displayedSession.activityType.name}
                      </p>
                      <p className="dialog-supporting-text text-text-muted">
                        {displayedSession.domain.name}
                        {displayedSession.engineeringContext
                          ? ` · ${getEngineeringContextLabel(displayedSession.engineeringContext)}`
                          : ""}
                        {displayedSession.engineeringProject
                          ? ` · ${displayedSession.engineeringProject.name}`
                          : ""}
                        {displayedSession.contentTitleSnapshot
                          ? ` · ${displayedSession.contentTitleSnapshot}`
                          : ""}
                        {displayedSession.contentVariantSnapshot
                          ? ` · ${displayedSession.contentVariantSnapshot}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="timer-numerals text-primary text-h5 font-semibold">
                    {formatDuration(
                      displayedSession.endedAt
                        ? displayedSession.durationSeconds
                        : activeSession?.id === displayedSession.id
                          ? elapsedSeconds
                          : displayedSession.durationSeconds,
                    )}
                  </span>
                </div>
                {(displayedSession.status === "PAUSED" ||
                  (displayedSession.endedAt &&
                    completionTarget?.status === "PAUSED")) && (
                  <p
                    className="text-text-secondary text-body-sm"
                    data-testid="paused-wrap-up"
                  >
                    {displayedSession.endedAt
                      ? "Break time is excluded from your saved session."
                      : "Session paused. Break time stays excluded while you wrap up."}
                  </p>
                )}
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
                    {displayedSession.endedAt
                      ? "Close"
                      : displayedSession.status === "PAUSED"
                        ? "Keep paused"
                        : "Keep running"}
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
                        : "End & save"}
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
