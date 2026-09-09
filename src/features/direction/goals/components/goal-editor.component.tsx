"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Compass, Save } from "lucide-react";
import { FormEvent, type MouseEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";
import { useGoalSave } from "@/features/direction/goals/hooks/use-goal-save.hook";
import { CriterionBuilder } from "@/features/direction/criteria/components/criterion-builder.component";
import { previewDirection } from "@/features/direction/preview/utils/direction-preview-client.util";
import type {
  CriterionEvaluation,
  GoalDraft,
  GoalView,
  OwnedOption,
} from "@/features/direction/types/direction.types";

function errorFor(errors: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean);
}

function safeReturnTo(value?: string) {
  return value?.startsWith("/direction") ? value : undefined;
}

export function GoalEditor({
  goal,
  domainOptions,
  defaultStartOn,
  returnTo,
}: {
  goal?: GoalView;
  domainOptions: OwnedOption[];
  defaultStartOn: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const [domains, setDomains] = useState<ReusableEntityOption[]>(
    goal?.domains ?? [],
  );
  const [criteria, setCriteria] = useState(goal?.criteria ?? []);
  const [criterionMode, setCriterionMode] = useState<"ALL" | "ANY">(
    goal?.criterionMode ?? "ALL",
  );
  const [preview, setPreview] = useState<CriterionEvaluation[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const {
    fieldErrors,
    recoveredDraft,
    requiresRevisionReason,
    result,
    saveGoal,
    state,
  } = useGoalSave(goal);
  const returnDestination = safeReturnTo(returnTo);
  const cancelHref =
    returnDestination ??
    (goal ? `/direction/goals/${goal.id}` : "/direction/goals");

  function cancel(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !returnDestination ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    router.push(returnDestination);
    router.refresh();
  }

  function readDraft(data: FormData): GoalDraft {
    return {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      startOn: String(data.get("startOn") ?? ""),
      targetOn: String(data.get("targetOn") ?? "") || undefined,
      domainIds: domains.map(({ id }) => id),
      criterionMode,
      criteria,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await saveGoal(
      readDraft(data),
      requiresRevisionReason ? String(data.get("reason") ?? "") : undefined,
    );
    if (response.error) return;
    markSaved();
    const destination = returnDestination;
    if (destination) router.push(destination);
    else router.push(`/direction/goals/${response.id ?? goal?.id}`);
    router.refresh();
  }

  async function previewEvidence() {
    if (!formRef.current) return;
    setPreviewPending(true);
    setPreviewError(null);
    const response = await previewDirection({
      kind: "GOAL",
      id: goal?.id,
      draft: readDraft(new FormData(formRef.current)),
    });
    setPreview(response.evaluation?.criteria ?? []);
    setPreviewError(response.error);
    setPreviewPending(false);
  }

  const titleError = errorFor(fieldErrors, "title", "draft.title");
  const startError = errorFor(fieldErrors, "startOn", "draft.startOn");
  const targetError = errorFor(fieldErrors, "targetOn", "draft.targetOn");
  const domainError = errorFor(fieldErrors, "domainIds", "draft.domainIds");

  return (
    <div className="direction-editor">
      <header className="direction-editor-header">
        <Link href={cancelHref} className="direction-back-link">
          <ArrowLeft aria-hidden="true" />{" "}
          {goal ? "Back to goal" : "Leave for now"}
        </Link>
        <p className="eyebrow">
          {goal ? "Refine direction" : "A direction worth returning to"}
        </p>
        <h1>{goal ? "Edit the goal." : "Name the outcome."}</h1>
        <p>
          Give it its own horizon. A season may carry this goal, but it never
          owns its dates or decides what completion means.
        </p>
      </header>

      <form
        ref={formRef}
        className="direction-goal-form"
        onSubmit={submit}
        aria-busy={state === "saving"}
      >
        <section
          className="direction-editor-panel"
          aria-labelledby="goal-meaning-title"
        >
          <div className="direction-editor-intro">
            <span className="direction-editor-mark" aria-hidden="true">
              <Compass />
            </span>
            <div>
              <p className="eyebrow">Meaning before measurement</p>
              <h2 id="goal-meaning-title">What are you moving toward?</h2>
              <p>
                A clear qualitative goal is complete enough to save. Evidence
                can be added when the definition is honest.
              </p>
            </div>
          </div>
          <div className="direction-form-grid">
            <label className="direction-field-wide">
              <span className="field-label">Goal</span>
              <input
                className="text-input"
                name="title"
                defaultValue={goal?.title ?? ""}
                maxLength={160}
                required
                autoFocus
                aria-invalid={Boolean(titleError) || undefined}
                aria-describedby={titleError ? "goal-title-error" : undefined}
                placeholder="Build a body of work I am proud to show"
              />
              {titleError && (
                <span className="direction-field-error" id="goal-title-error">
                  {titleError}
                </span>
              )}
            </label>
            <label className="direction-field-wide">
              <span className="field-label">
                Why this matters <span>— optional</span>
              </span>
              <textarea
                className="text-input text-input--textarea-md"
                name="description"
                defaultValue={goal?.description ?? ""}
                maxLength={2000}
                placeholder="The change this outcome would make in your life…"
              />
            </label>
            <label>
              <span className="field-label">Starts</span>
              <input
                className="text-input"
                type="date"
                name="startOn"
                defaultValue={goal?.startOn ?? defaultStartOn}
                required
                aria-invalid={Boolean(startError) || undefined}
                aria-describedby={startError ? "goal-start-error" : undefined}
              />
              {startError && (
                <span className="direction-field-error" id="goal-start-error">
                  {startError}
                </span>
              )}
            </label>
            <label>
              <span className="field-label">
                Target date <span>— optional</span>
              </span>
              <input
                className="text-input"
                type="date"
                name="targetOn"
                defaultValue={goal?.targetOn ?? ""}
                aria-invalid={Boolean(targetError) || undefined}
                aria-describedby={targetError ? "goal-target-error" : undefined}
              />
              {targetError && (
                <span className="direction-field-error" id="goal-target-error">
                  {targetError}
                </span>
              )}
            </label>
            <div className="direction-field-wide">
              <ReusableEntityCombobox
                label="Life domains"
                entityName="domain"
                idFieldName="domainIds"
                queryFieldName="domainSearch"
                options={domainOptions}
                selectedOptions={domains}
                onSelectionChange={setDomains}
                searchAction={(query) =>
                  searchDirectionOptions("domain", query)
                }
                placeholder="Add the parts of life this goal belongs to…"
              />
              {domainError && (
                <span className="direction-field-error">{domainError}</span>
              )}
            </div>
            {requiresRevisionReason && (
              <label className="direction-field-wide">
                <span className="field-label">Reason for this revision</span>
                <textarea
                  className="text-input text-input--textarea-sm"
                  name="reason"
                  maxLength={2000}
                  required
                  placeholder={
                    recoveredDraft
                      ? "What changed after the recovered save?"
                      : "What changed in the intention, horizon, or evidence definition?"
                  }
                />
              </label>
            )}
          </div>
        </section>

        <CriterionBuilder
          criteria={criteria}
          criterionMode={criterionMode}
          scopeOptions={goal?.criterionScopes}
          preview={preview}
          previewError={previewError}
          previewPending={previewPending}
          onChange={setCriteria}
          onModeChange={setCriterionMode}
          onPreview={() => void previewEvidence()}
        />

        {criteria.length === 0 && (
          <aside className="direction-qualitative-note">
            <span aria-hidden="true">01</span>
            <div>
              <strong>This goal begins as a statement of direction.</strong>
              <p>
                Become will never invent a percentage from its title. You can
                add explicit criteria later or conclude it with your own dated
                judgment.
              </p>
            </div>
          </aside>
        )}

        {(result.error || Object.keys(fieldErrors).length > 0) && (
          <div className="season-form-error" role="alert">
            <strong>{result.error || "Some entries need attention."}</strong>
            {state === "conflict" && (
              <p>
                The saved goal changed elsewhere. Your edits are still here;
                open the current goal in another tab before deciding what to
                keep.
              </p>
            )}
          </div>
        )}

        <footer className="direction-editor-actions">
          <Link
            href={cancelHref}
            prefetch={returnDestination ? false : undefined}
            onClick={cancel}
          >
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={state === "saving"}>
            <Save aria-hidden="true" />{" "}
            {state === "saving"
              ? "Saving…"
              : goal
                ? "Save changes"
                : "Create goal"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
