"use client";

import { useRef, useState, type FormEvent } from "react";
import { Clock3, Play, Square } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
  const [timerPending, setTimerPending] = useState(false);
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
    if (!activityId || timerPending) return;
    setTimerPending(true);
    setTimerError(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: workspace.timer.domainId,
          activityTypeId: activityId,
          contentId: workspace.id,
          contentVariantId: variant.id,
          description: workspace.title || variant.name || "Content session",
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        return setTimerError(result?.error ?? "Could not start the timer.");
      router.refresh();
    } catch {
      setTimerError("Could not reach Become. Check your connection and retry.");
    } finally {
      setTimerPending(false);
    }
  }

  return (
    <aside className="content-progress" aria-label="Version progress">
      <section className="content-stage-guide">
        <p className="eyebrow">Where this version is</p>
        <ol aria-label={`Current stage: ${variant.stageLabel}`}>
          {stages.map((item, index) => (
            <li
              key={item.value}
              data-state={index === stageIndex ? "current" : "other"}
            >
              <span aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ol>
        <p className="content-stage-guidance">{variant.guidance}</p>
      </section>

      <form
        ref={formRef}
        className="content-progress-form"
        onSubmit={saveProgress}
      >
        <label>
          <span>Version name</span>
          <input
            name="versionName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Untitled version"
            maxLength={120}
            required
          />
        </label>
        <div className="content-progress-field">
          <span>Format</span>
          <Select
            label="Version format"
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
          <input
            type="date"
            name="plannedOn"
            value={plannedOn}
            onChange={(event) => setPlannedOn(event.target.value)}
          />
        </label>
        <label>
          <span>My next move</span>
          <input
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
        <button
          className="content-secondary-action"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save progress"}
        </button>
      </form>

      <section className="content-time" aria-labelledby="content-time-title">
        <header>
          <span className="content-time-icon" aria-hidden="true">
            <Clock3 />
          </span>
          <span>
            <small id="content-time-title">Recorded making time</small>
            <strong className="timer-numerals">
              {formatDuration(workspace.recordedTime.seconds, true)}
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
        {workspace.recordedTime.activeSessionId ? (
          <button
            type="button"
            className="content-timer-active"
            onClick={() => window.dispatchEvent(new Event("become:stop-timer"))}
          >
            <Square aria-hidden="true" /> Complete active session
          </button>
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
            <button
              type="button"
              onClick={startTimer}
              disabled={!activityId || timerPending}
            >
              <Play aria-hidden="true" />{" "}
              {timerPending ? "Starting…" : "Start focus"}
            </button>
          </div>
        )}
        {timerError && (
          <p className="content-form-error" role="alert">
            {timerError}
          </p>
        )}
      </section>

      <p className="content-version-caption">{formatLabel(variant.format)}</p>
    </aside>
  );
}
