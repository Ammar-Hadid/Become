"use client";

import { Card } from "@/components/ui/cards/card.component";

import { Input } from "@/components/ui/forms/input.component";

import { useRef, useState, type FormEvent } from "react";
import { Clock3, Play, Square } from "lucide-react";
import { Select } from "@/components/ui/forms/select.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { useContentOperation } from "@/features/content/commands/hooks/use-content-operation.hook";
import type {
  ContentFormat,
  ContentStage,
  ContentWorkspace,
  VariantView,
} from "@/features/content/types/content.types";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { Button } from "@/components/ui/buttons/button.component";
import { SessionTimerActions } from "@/features/sessions/timer/components/session-timer-actions.component";

const stages: { value: ContentStage; label: string }[] = [
  { value: "PLANNING", label: "Plan" },
  { value: "WRITING", label: "Write" },
  { value: "RECORDING", label: "Record" },
  { value: "EDITING", label: "Edit" },
  { value: "READY", label: "Ready" },
];

function formatLabel(format: ContentFormat) {
  if (format === "SHORT_VERTICAL") return "Short vertical";
  if (format === "LONG_FORM") return "Long form";
  return "Other";
}

export function ContentProgressRail({
  workspace,
  variant,
  onWorkspace,
}: {
  workspace: ContentWorkspace;
  variant: VariantView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const {
    activeSession,
    elapsedSeconds,
    completedSessions,
    startSession,
    pendingOperation,
    recoveryRequired,
  } = useActiveTimer();
  const workingHere = activeSession?.contentId === workspace.id;
  // Include confirmed completions until the refreshed workspace incorporates them.
  const newlyRecordedSeconds = Object.values(completedSessions)
    .filter(
      (session) =>
        session.contentId === workspace.id &&
        !workspace.sessions.some(
          (saved) => saved.id === session.id && saved.endedAt,
        ),
    )
    .reduce((total, session) => total + session.durationSeconds, 0);
  const makingSeconds =
    workspace.recordedTime.seconds +
    newlyRecordedSeconds +
    (workingHere ? elapsedSeconds : 0);
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useContentOperation();
  const [stage, setStage] = useState(variant.stage);
  const [name, setName] = useState(variant.name);
  const [format, setFormat] = useState(variant.format);
  const [nextStep, setNextStep] = useState(variant.nextStep);
  const [plannedOn, setPlannedOn] = useState(variant.plannedOn ?? "");
  const [baseVersion, setBaseVersion] = useState(variant.version);
  const [activityId, setActivityId] = useState(
    workspace.timer.activities[0]?.id ?? "",
  );
  const [pending, setPending] = useState(false);
  const timerPending = Boolean(pendingOperation);
  const [error, setError] = useState<string | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [latest, setLatest] = useState<{
    workspace: ContentWorkspace;
    variant: VariantView;
  } | null>(null);
  const stageIndex = stages.findIndex((item) => item.value === variant.stage);

  async function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setLatest(null);
    const draft = {
      name,
      format,
      stage,
      nextStep,
      plannedOn: plannedOn || null,
    };
    const result = await run(draft, (operationKey) =>
      sendContentCommand({
        type: "SAVE_VARIANT",
        operationKey,
        contentId: workspace.id,
        variantId: variant.id,
        expectedVersion: baseVersion,
        ...draft,
        archived: Boolean(variant.archivedAt),
      }),
    );
    setPending(false);
    if (result.error || !result.workspace) {
      const latestVariant = result.workspace?.variants.find(
        (item) => item.id === variant.id,
      );
      if (result.workspace && latestVariant) {
        setLatest({ workspace: result.workspace, variant: latestVariant });
      }
      return setError(
        result.error ??
          "The progress was saved, but the workspace could not refresh.",
      );
    }
    const savedVariant = result.workspace.variants.find(
      (item) => item.id === variant.id,
    );
    setBaseVersion(result.version ?? savedVariant?.version ?? baseVersion);
    markSaved();
    onWorkspace(result.workspace);
  }

  function useLatest() {
    if (!latest) return;
    setName(latest.variant.name);
    setFormat(latest.variant.format);
    setStage(latest.variant.stage);
    setNextStep(latest.variant.nextStep);
    setPlannedOn(latest.variant.plannedOn ?? "");
    setBaseVersion(latest.variant.version);
    onWorkspace(latest.workspace);
    setLatest(null);
    setError(null);
    requestAnimationFrame(markSaved);
  }

  async function startTimer() {
    if (!activityId || activeSession || timerPending || recoveryRequired)
      return;
    setTimerError(null);
    const result = await startSession({
      domainId: workspace.timer.domainId,
      activityTypeId: activityId,
      contentId: workspace.id,
      contentVariantId: variant.id,
      description: workspace.title || variant.name || "Content session",
    });
    if (!result.ok) setTimerError(result.error ?? "Could not start the timer.");
  }

  return (
    <aside className="content-progress" aria-label="Variant progress">
      <Card className="content-progress-card">
        <section className="content-stage-guide">
          <p className="eyebrow">Where this variant is</p>
          <ol aria-label={`Current stage: ${variant.stageLabel}`}>
            {stages.map((item, index) => (
              <li
                key={item.value}
                data-state={
                  index < stageIndex
                    ? "complete"
                    : index === stageIndex
                      ? "current"
                      : "upcoming"
                }
                aria-current={index === stageIndex ? "step" : undefined}
              >
                <span className="content-stage-marker" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="content-stage-card">
                  <span>{item.label}</span>
                  {index === stageIndex && (
                    <span className="content-stage-now" aria-hidden="true">
                      Now · {index + 1}/{stages.length}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="content-stage-guidance">
            <span>Current move</span>
            <p>{variant.guidance}</p>
          </div>
        </section>

        <form
          ref={formRef}
          className="content-progress-form"
          onSubmit={saveProgress}
        >
          <label>
            <span>Variant name</span>
            <Input
              name="versionName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Untitled variant"
              maxLength={120}
              required
            />
          </label>
          <div className="content-progress-field">
            <span>Format</span>
            <Select
              label="Variant format"
              name="format"
              value={format}
              options={[
                { value: "SHORT_VERTICAL", label: "Short vertical" },
                { value: "LONG_FORM", label: "Long form" },
                { value: "OTHER", label: "Other" },
              ]}
              onValueChange={setFormat}
            />
          </div>
          <div className="content-progress-field">
            <span>Stage</span>
            <Select
              label="Production stage"
              name="stage"
              value={stage}
              options={stages}
              onValueChange={setStage}
            />
          </div>
          <label>
            <span>Planned for</span>
            <Input
              type="date"
              name="plannedOn"
              value={plannedOn}
              onChange={(event) => setPlannedOn(event.target.value)}
            />
          </label>
          <label>
            <span>My next move</span>
            <Input
              name="nextStep"
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              placeholder={variant.guidance}
              maxLength={2000}
            />
          </label>
          {error && (
            <div className="content-form-error" role="alert">
              <p>{error}</p>
              {latest && (
                <button type="button" onClick={useLatest}>
                  Use latest saved progress
                </button>
              )}
            </div>
          )}
          <Button
            variant="secondary"
            className="content-action"
            type="submit"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save progress"}
          </Button>
        </form>

        <section className="content-time" aria-labelledby="content-time-title">
          <header>
            <span className="content-time-icon" aria-hidden="true">
              <Clock3 />
            </span>
            <span>
              <small id="content-time-title">
                Making time{workingHere ? " · Live" : ""}
              </small>
              <strong className="timer-numerals">
                {formatDuration(makingSeconds, !workingHere)}
              </strong>
            </span>
          </header>
          {workspace.recordedTime.byActivity.length > 0 && (
            <dl>
              {workspace.recordedTime.byActivity.map((activity) => (
                <div key={activity.name}>
                  <dt>{activity.name}</dt>
                  <dd className="timer-numerals">
                    {formatDuration(activity.seconds)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {activeSession ? (
            <div className="space-y-md mt-lg">
              <p className="text-body-sm text-text-secondary">
                {activeSession.status === "PAUSED" ? "Paused" : "Running"}
                {workingHere
                  ? " · This content"
                  : ` · ${activeSession.domain.name} · ${activeSession.description || activeSession.activityType.name}`}
              </p>
              {workingHere ? (
                <SessionTimerActions />
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      window.dispatchEvent(new Event("become:manage-timer"))
                    }
                  >
                    View current session
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={timerPending}
                    onClick={() =>
                      window.dispatchEvent(new Event("become:stop-timer"))
                    }
                  >
                    <Square
                      className="size-3 fill-current"
                      aria-hidden="true"
                    />{" "}
                    Complete other session
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="content-timer-start">
              <div className="content-timer-activity">
                <span className="sr-only">Activity</span>
                <Select
                  label="Focus activity"
                  value={activityId}
                  options={workspace.timer.activities.map((activity) => ({
                    value: activity.id,
                    label: activity.name,
                  }))}
                  onValueChange={setActivityId}
                />
              </div>
              <Button
                type="button"
                onClick={startTimer}
                disabled={!activityId || timerPending || recoveryRequired}
              >
                <Play aria-hidden="true" />{" "}
                {timerPending ? "Starting…" : "Start focus"}
              </Button>
            </div>
          )}
          {timerError && !activeSession && (
            <p className="content-form-error" role="alert">
              {timerError}
            </p>
          )}
        </section>

        <p className="content-version-caption">{formatLabel(variant.format)}</p>
      </Card>
    </aside>
  );
}
