"use client";

import { Textarea } from "@/components/ui/forms/textarea.component";

import { NativeSelect } from "@/components/ui/forms/native-select.component";

import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import {
  confirmRecordFormDiscard,
  useRecordFormGuard,
} from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import type {
  ExperimentOutcome,
  ExperimentView,
  GoalOutcome,
  GoalView,
} from "@/features/direction/types/direction.types";

type LifecycleAction =
  "PAUSE" | "RESUME" | "CONCLUDE" | "REOPEN" | "ARCHIVE" | "RESTORE";

const actionCopy: Record<
  LifecycleAction,
  { title: string; reason: string; submit: string }
> = {
  PAUSE: {
    title: "Pause this direction?",
    reason: "Why are you setting it down for now?",
    submit: "Pause",
  },
  RESUME: {
    title: "Continue this direction?",
    reason: "What makes this the right time to return?",
    submit: "Resume",
  },
  CONCLUDE: {
    title: "Make a dated conclusion.",
    reason: "What is your honest conclusion from the evidence and experience?",
    submit: "Conclude",
  },
  REOPEN: {
    title: "Continue after the conclusion?",
    reason: "What changed or still deserves another season?",
    submit: "Reopen",
  },
  ARCHIVE: {
    title: "Move this out of your active library?",
    reason: "Why are you archiving it?",
    submit: "Archive",
  },
  RESTORE: {
    title: "Return this to your library?",
    reason: "Why are you restoring it?",
    submit: "Restore",
  },
};

export function DirectionLifecycleControl({
  kind,
  view,
  compact = false,
}: {
  compact?: boolean;
  kind: "GOAL" | "EXPERIMENT";
  view: GoalView | ExperimentView;
}) {
  const router = useRouter();
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const runStable = useStableOperation();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);

  const actions: LifecycleAction[] = view.archivedAt
    ? ["RESTORE"]
    : [
        ...(view.status === "ACTIVE" ? (["PAUSE", "CONCLUDE"] as const) : []),
        ...(view.status === "PAUSED" ? (["RESUME", "CONCLUDE"] as const) : []),
        ...(view.status === "CONCLUDED" ? (["REOPEN"] as const) : []),
        "ARCHIVE",
      ];
  const primaryActions = actions.filter(
    (item) => item !== "ARCHIVE" && item !== "RESTORE",
  );
  const managementAction = actions.find(
    (item) => item === "ARCHIVE" || item === "RESTORE",
  );

  useEffect(() => {
    if (!action) return;
    formRef.current?.querySelector<HTMLElement>("select, textarea")?.focus();
  }, [action]);

  function chooseAction(next: LifecycleAction) {
    if (
      action &&
      action !== next &&
      !confirmRecordFormDiscard(formRef.current ?? undefined)
    )
      return;
    setAction(next);
    setError(null);
    setFieldErrors({});
  }

  function dismiss() {
    if (confirmRecordFormDiscard(formRef.current ?? undefined)) setAction(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const identity = {
      type: "DIRECTION_LIFECYCLE",
      kind,
      id: view.id,
      expectedVersion: view.version,
      action,
      reason: String(data.get("reason") ?? ""),
      outcome: (String(data.get("outcome") ?? "") || undefined) as
        GoalOutcome | ExperimentOutcome | undefined,
      result: String(data.get("result") ?? "") || undefined,
      learning: String(data.get("learning") ?? "") || undefined,
      previewFingerprint:
        action === "CONCLUDE" ? view.evaluation.fingerprint : undefined,
    } as const;
    const response = await runStable(identity, (operationKey) =>
      sendDirectionCommand({ ...identity, operationKey }),
    );
    setPending(false);
    setError(response.recoveredPrevious ? null : response.error);
    setFieldErrors(response.fieldErrors ?? {});
    if (!response.error || response.recoveredPrevious) {
      markSaved();
      setAction(null);
      router.refresh();
    }
  }

  return (
    <section
      className="direction-lifecycle"
      aria-labelledby={compact ? undefined : "direction-lifecycle-title"}
      aria-label={compact ? "Goal actions" : undefined}
    >
      <header>
        {!compact && (
          <div>
            <p className="eyebrow">State and conclusion</p>
            <h2 id="direction-lifecycle-title">Choose what happens next.</h2>
          </div>
        )}
        <div className="direction-lifecycle-actions">
          {primaryActions.map((item) => (
            <Button
              variant="secondary"
              type="button"
              key={item}
              onClick={() => chooseAction(item)}
            >
              {item === "PAUSE" && <Pause aria-hidden="true" />}
              {item === "RESUME" && <Play aria-hidden="true" />}
              {item === "CONCLUDE" && <CheckCircle2 aria-hidden="true" />}
              {item === "REOPEN" && <RotateCcw aria-hidden="true" />}
              {item[0] + item.slice(1).toLowerCase()}
            </Button>
          ))}
          {managementAction && (
            <SubMenu
              label="Manage record"
              placement="bottom-end"
              trigger={(props) => (
                <Button variant="ghost" {...props}>
                  <MoreHorizontal aria-hidden="true" /> Manage
                </Button>
              )}
            >
              <MenuItem
                icon={
                  managementAction === "ARCHIVE" ? (
                    <Archive />
                  ) : (
                    <ArchiveRestore />
                  )
                }
                onSelect={() => chooseAction(managementAction)}
              >
                {managementAction === "ARCHIVE" ? "Archive" : "Restore"}
              </MenuItem>
            </SubMenu>
          )}
        </div>
      </header>

      <form
        ref={formRef}
        className="direction-lifecycle-form"
        onSubmit={submit}
        hidden={!action}
      >
        {action && (
          <>
            <div className="direction-lifecycle-form-heading">
              <div>
                <p className="eyebrow">{actionCopy[action].submit}</p>
                <h3>{actionCopy[action].title}</h3>
              </div>
              <button
                type="button"
                aria-label="Close state change"
                onClick={dismiss}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            {action === "CONCLUDE" && (
              <>
                <label>
                  <span className="field-label">Conclusion</span>
                  <NativeSelect
                    name="outcome"
                    required
                    aria-invalid={Boolean(fieldErrors.outcome) || undefined}
                  >
                    <option value="">Choose an outcome</option>
                    {kind === "GOAL" ? (
                      <>
                        <option value="ACHIEVED">Achieved</option>
                        <option value="PARTIAL">Partially achieved</option>
                        <option value="STOPPED">Stopped</option>
                      </>
                    ) : (
                      <>
                        <option value="SUPPORTED">Hypothesis supported</option>
                        <option value="NOT_SUPPORTED">Not supported</option>
                        <option value="INCONCLUSIVE">Inconclusive</option>
                      </>
                    )}
                  </NativeSelect>
                  {fieldErrors.outcome && (
                    <span className="direction-field-error">
                      {fieldErrors.outcome}
                    </span>
                  )}
                </label>
                {kind === "EXPERIMENT" && (
                  <>
                    <label>
                      <span className="field-label">Result</span>
                      <Textarea
                        className="text-input text-input--textarea-sm"
                        name="result"
                        required
                        maxLength={6000}
                        aria-invalid={Boolean(fieldErrors.result) || undefined}
                      />
                    </label>
                    <label>
                      <span className="field-label">What you learned</span>
                      <Textarea
                        className="text-input text-input--textarea-sm"
                        name="learning"
                        required
                        maxLength={6000}
                        aria-invalid={
                          Boolean(fieldErrors.learning) || undefined
                        }
                      />
                    </label>
                  </>
                )}
              </>
            )}
            <label>
              <span className="field-label">{actionCopy[action].reason}</span>
              <Textarea
                className="text-input text-input--textarea-sm"
                name="reason"
                required
                maxLength={6000}
                aria-invalid={Boolean(fieldErrors.reason) || undefined}
              />
              {fieldErrors.reason && (
                <span className="direction-field-error">
                  {fieldErrors.reason}
                </span>
              )}
            </label>
            {action === "CONCLUDE" && (
              <p className="direction-lifecycle-fingerprint">
                The conclusion will preserve the definition and evidence reading
                shown on this page. If the source truth changed, Become will ask
                you to review again.
              </p>
            )}
            {error && !Object.values(fieldErrors).includes(error) && (
              <p className="season-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="direction-lifecycle-form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={dismiss}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : actionCopy[action].submit}
              </Button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
