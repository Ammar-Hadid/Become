"use client";

import { Textarea } from "@/components/ui/forms/textarea.component";

import { Input } from "@/components/ui/forms/input.component";

import { WorkspacePanel } from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { CriterionBuilder } from "@/features/direction/criteria/components/criterion-builder.component";
import { useExperimentSave } from "@/features/direction/experiments/hooks/use-experiment-save.hook";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";
import { previewDirection } from "@/features/direction/preview/utils/direction-preview-client.util";
import type {
  CriterionEvaluation,
  ExperimentDraft,
  ExperimentView,
  OwnedOption,
} from "@/features/direction/types/direction.types";

export function ExperimentEditor({
  experiment,
  repeatFrom,
  domainOptions,
  defaultStartOn,
}: {
  experiment?: ExperimentView;
  repeatFrom?: ExperimentView;
  domainOptions: OwnedOption[];
  defaultStartOn: string;
}) {
  const router = useRouter();
  const initialProtocol = experiment ?? repeatFrom;
  const [protocol, setProtocol] = useState({
    title: initialProtocol?.title ?? "",
    question: initialProtocol?.question ?? "",
    approach: initialProtocol?.approach ?? "",
    stoppingCondition: initialProtocol?.stoppingCondition ?? "",
    expectedEvidence: initialProtocol?.expectedEvidence ?? "",
    startOn: experiment?.startOn ?? defaultStartOn,
    targetOn: experiment?.targetOn ?? "",
  });
  const repeatRequest = useRef(0);
  const [repeatPending, setRepeatPending] = useState(false);
  const [repeatError, setRepeatError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const [domains, setDomains] = useState<ReusableEntityOption[]>(
    initialProtocol?.domains ?? [],
  );
  const [goal, setGoal] = useState<ReusableEntityOption | null>(
    initialProtocol?.goal ?? null,
  );
  const [previousAttempt, setPreviousAttempt] =
    useState<ReusableEntityOption | null>(
      experiment?.previousAttempt ??
        (repeatFrom ? { id: repeatFrom.id, name: repeatFrom.title } : null),
    );
  const [outreach, setOutreach] = useState<ReusableEntityOption[]>(
    experiment?.sources.map((source) => ({
      id: source.id,
      name: source.label,
      description: source.note ?? undefined,
    })) ?? [],
  );
  const [contentSources, setContentSources] = useState<ReusableEntityOption[]>(
    experiment?.evaluation.contentCohort?.sources.map((source) => ({
      id: source.id,
      name: source.label,
      description: source.archived
        ? "Archived creative work"
        : `${source.variantCount} ${source.variantCount === 1 ? "version" : "versions"} · ${source.publicationCount} ${source.publicationCount === 1 ? "release" : "releases"}`,
    })) ?? [],
  );
  const [criteria, setCriteria] = useState(experiment?.criteria ?? []);
  const [criterionMode, setCriterionMode] = useState<"ALL" | "ANY">(
    experiment?.criterionMode ?? "ALL",
  );
  const [preview, setPreview] = useState<CriterionEvaluation[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const {
    fieldErrors,
    pending,
    recoveredDraft,
    requiresRevisionReason,
    result,
    save,
  } = useExperimentSave(experiment);

  async function selectPreviousAttempt(option: ReusableEntityOption | null) {
    const request = ++repeatRequest.current;
    setPreviousAttempt(option);
    setRepeatError(null);
    setRepeatPending(Boolean(option));
    if (!option) return;
    try {
      const response = await fetch(
        `/api/direction/experiments/${encodeURIComponent(option.id)}`,
        { cache: "no-store", signal: AbortSignal.timeout(15_000) },
      );
      if (!response.ok) throw new Error();
      const prior: ExperimentView = await response.json();
      if (prior.status !== "CONCLUDED" || prior.archivedAt) throw new Error();
      if (request !== repeatRequest.current) return;
      setProtocol({
        title: prior.title,
        question: prior.question,
        approach: prior.approach,
        stoppingCondition: prior.stoppingCondition ?? "",
        expectedEvidence: prior.expectedEvidence ?? "",
        startOn: defaultStartOn,
        targetOn: "",
      });
      setGoal(prior.goal);
      setDomains(prior.domains);
      setOutreach([]);
      setContentSources([]);
      setCriteria([]);
      setCriterionMode("ALL");
      setPreview([]);
      setPreviewError(null);
    } catch {
      if (request === repeatRequest.current)
        setRepeatError(
          "Could not load this protocol. Select the concluded attempt again to retry, or clear the selection.",
        );
    } finally {
      if (request === repeatRequest.current) setRepeatPending(false);
    }
  }

  function readDraft(data: FormData): ExperimentDraft {
    return {
      title: String(data.get("title") ?? ""),
      question: String(data.get("question") ?? ""),
      approach: String(data.get("approach") ?? ""),
      startOn: String(data.get("startOn") ?? ""),
      targetOn: String(data.get("targetOn") ?? "") || undefined,
      stoppingCondition:
        String(data.get("stoppingCondition") ?? "") || undefined,
      expectedEvidence: String(data.get("expectedEvidence") ?? "") || undefined,
      goalId: goal?.id,
      repeatedFromId: experiment?.repeatedFromId ?? previousAttempt?.id,
      domainIds: domains.map(({ id }) => id),
      criterionMode,
      criteria,
      sourceInteractionIds: outreach.map(({ id }) => id),
      sourceContentIds: contentSources.map(({ id }) => id),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (repeatPending || repeatError) return;
    const data = new FormData(event.currentTarget);
    const response = await save(
      readDraft(data),
      requiresRevisionReason ? String(data.get("reason") ?? "") : undefined,
    );
    if (response.error) return;
    markSaved();
    router.push(`/direction/experiments/${response.id ?? experiment?.id}`);
    router.refresh();
  }

  async function previewEvidence() {
    if (!formRef.current) return;
    setPreviewPending(true);
    setPreviewError(null);
    const response = await previewDirection({
      kind: "EXPERIMENT",
      id: experiment?.id,
      draft: readDraft(new FormData(formRef.current)),
    });
    setPreview(response.evaluation?.criteria ?? []);
    setPreviewError(response.error);
    setPreviewPending(false);
  }

  return (
    <div className="direction-editor direction-editor--experiment">
      <header className="direction-editor-header">
        <Link
          className="direction-back-link"
          href={
            experiment
              ? `/direction/experiments/${experiment.id}`
              : "/direction/experiments"
          }
        >
          <ArrowLeft aria-hidden="true" />{" "}
          {experiment ? "Back to experiment" : "Leave for now"}
        </Link>
        <p className="eyebrow">
          {experiment ? "Refine the trial" : "A bounded way to learn"}
        </p>
        <h1>{experiment ? "Edit experiment" : "Try something new"}</h1>
        <p>
          {!experiment && previousAttempt
            ? `A fresh attempt after “${previousAttempt.name}”. Its earlier result stays unchanged.`
            : "Choose a question, a practical approach, and a clear moment to stop and learn."}
        </p>
      </header>

      <form
        ref={formRef}
        className="direction-goal-form"
        onSubmit={submit}
        aria-busy={pending}
      >
        <WorkspacePanel
          title="What are you testing?"
          description="Name the experiment, ask a question, and choose an approach."
          spacing="action"
        >
          <div className="direction-form-grid">
            <label className="direction-field-wide">
              <span className="field-label">Experiment name</span>
              <Input
                className="text-input"
                name="title"
                value={protocol.title}
                onChange={(event) =>
                  setProtocol({ ...protocol, title: event.target.value })
                }
                maxLength={200}
                required
                autoFocus
                aria-invalid={Boolean(fieldErrors.title) || undefined}
              />
            </label>
            <label className="direction-field-wide">
              <span className="field-label">Question</span>
              <Textarea
                className="text-input text-input--textarea-md"
                name="question"
                value={protocol.question}
                onChange={(event) =>
                  setProtocol({ ...protocol, question: event.target.value })
                }
                maxLength={6000}
                required
                placeholder="Will a narrower message earn more useful conversations?"
                aria-invalid={Boolean(fieldErrors.question) || undefined}
              />
            </label>
            <label className="direction-field-wide">
              <span className="field-label">Approach</span>
              <Textarea
                className="text-input text-input--textarea-md"
                name="approach"
                value={protocol.approach}
                onChange={(event) =>
                  setProtocol({ ...protocol, approach: event.target.value })
                }
                maxLength={6000}
                required
                placeholder="What will you do, with whom, and what will stay constant?"
                aria-invalid={Boolean(fieldErrors.approach) || undefined}
              />
            </label>
          </div>
        </WorkspacePanel>
        <WorkspacePanel
          title="When will you check the result?"
          description="Choose a target date or describe a clear stopping point."
          spacing="action"
        >
          <div className="direction-form-grid">
            <label>
              <span className="field-label">Starts</span>
              <Input
                className="text-input"
                type="date"
                name="startOn"
                value={protocol.startOn}
                onChange={(event) =>
                  setProtocol({ ...protocol, startOn: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span className="field-label">
                Target date <span>— optional with a stopping condition</span>
              </span>
              <Input
                className="text-input"
                type="date"
                name="targetOn"
                value={protocol.targetOn}
                onChange={(event) =>
                  setProtocol({ ...protocol, targetOn: event.target.value })
                }
              />
            </label>
            <label className="direction-field-wide">
              <span className="field-label">
                Stopping condition <span>— optional with a target date</span>
              </span>
              <Input
                className="text-input"
                name="stoppingCondition"
                value={protocol.stoppingCondition}
                onChange={(event) =>
                  setProtocol({
                    ...protocol,
                    stoppingCondition: event.target.value,
                  })
                }
                maxLength={3000}
                placeholder="After 12 selected outreach attempts have had seven days to receive a reply"
                aria-invalid={
                  Boolean(fieldErrors.stoppingCondition) || undefined
                }
              />
            </label>
          </div>
        </WorkspacePanel>
        <WorkspaceDisclosure
          title="Links & context"
          description="Connect a goal, domains, earlier attempts, or the records you will follow."
          defaultOpen={Boolean(experiment || repeatFrom)}
        >
          <div className="direction-form-grid">
            <label className="direction-field-wide">
              <span className="field-label">
                Evidence you expect <span>— optional</span>
              </span>
              <Textarea
                className="text-input text-input--textarea-sm"
                name="expectedEvidence"
                value={protocol.expectedEvidence}
                onChange={(event) =>
                  setProtocol({
                    ...protocol,
                    expectedEvidence: event.target.value,
                  })
                }
                maxLength={6000}
                placeholder="What would make the result interpretable?"
              />
            </label>
            <ReusableEntityCombobox
              key={`goal-${goal?.id ?? "none"}`}
              label="Goal this tests"
              entityName="goal"
              idFieldName="goalId"
              queryFieldName="goalSearch"
              options={goal ? [goal] : []}
              initialId={goal?.id}
              initialName={goal?.name}
              searchAction={(query) => searchDirectionOptions("goal", query)}
              onSelectedOptionChange={setGoal}
              placeholder="Search goals…"
            />
            {!experiment && (
              <ReusableEntityCombobox
                label="Repeat a concluded attempt"
                entityName="experiment"
                idFieldName="repeatedFromId"
                queryFieldName="repeatedFromSearch"
                options={previousAttempt ? [previousAttempt] : []}
                initialId={previousAttempt?.id}
                initialName={previousAttempt?.name}
                searchAction={(query) =>
                  searchDirectionOptions("concludedExperiment", query)
                }
                onSelectedOptionChange={(option) =>
                  void selectPreviousAttempt(option)
                }
                placeholder="Search concluded attempts…"
              />
            )}
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
                placeholder="Add domains…"
              />
            </div>
            <div className="direction-field-wide">
              <ReusableEntityCombobox
                label="Creative work cohort"
                entityName="creative work"
                idFieldName="sourceContentIds"
                queryFieldName="contentSourceSearch"
                options={contentSources}
                selectedOptions={contentSources}
                onSelectionChange={setContentSources}
                searchAction={(query) =>
                  searchDirectionOptions("content", query)
                }
                placeholder="Choose the work this experiment follows…"
              />
              <p className="direction-field-hint">
                This is the exact set of creative work made for the experiment.
                A content criterion uses it only when “Only work selected for
                this experiment” is turned on.
              </p>
            </div>
            <div className="direction-field-wide">
              <ReusableEntityCombobox
                label="Selected outreach records"
                entityName="outreach record"
                idFieldName="sourceInteractionIds"
                queryFieldName="outreachSearch"
                options={outreach}
                selectedOptions={outreach}
                onSelectionChange={setOutreach}
                searchAction={(query) =>
                  searchDirectionOptions("outreach", query)
                }
                placeholder="Link the exact outreach cohort…"
              />
              <p className="direction-field-hint">
                These records apply only when a conversation criterion
                explicitly uses the selected outreach cohort. That scoped
                criterion stays unconfigured until you choose at least one
                record; ordinary conversation criteria still use their company,
                exploration, and date scope.
              </p>
            </div>
          </div>
        </WorkspaceDisclosure>
        {requiresRevisionReason && (
          <label className="direction-field-wide">
            <span className="field-label">Reason for this revision</span>
            <Textarea
              className="text-input text-input--textarea-sm"
              name="reason"
              maxLength={2000}
              required
              placeholder={
                recoveredDraft
                  ? "What changed after the recovered save?"
                  : "What changed in this attempt or its evidence definition?"
              }
            />
          </label>
        )}

        {!experiment && previousAttempt && (
          <p className="direction-field-hint" role="status">
            {repeatPending
              ? "Loading the previous protocol…"
              : "Protocol, goal, and life domains are prefilled. Dates, creative work, outreach records, and evidence definitions start fresh; configure evidence for this attempt before using it to draw a conclusion."}
          </p>
        )}
        {repeatError && (
          <p role="alert" className="season-form-error">
            {repeatError}
          </p>
        )}

        <WorkspaceDisclosure
          title="Optional measurements"
          description="Add evidence-based checks when a simple observation is not enough."
          defaultOpen={criteria.length > 0}
        >
          <CriterionBuilder
            context="EXPERIMENT"
            criteria={criteria}
            criterionMode={criterionMode}
            scopeOptions={experiment?.criterionScopes}
            preview={preview}
            previewError={previewError}
            previewPending={previewPending}
            onChange={setCriteria}
            onModeChange={setCriterionMode}
            onPreview={() => void previewEvidence()}
          />
        </WorkspaceDisclosure>

        {(result.error || Object.keys(fieldErrors).length > 0) && (
          <div className="season-form-error" role="alert">
            <strong>{result.error || "Some entries need attention."}</strong>
            {Object.values(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <footer className="direction-editor-actions">
          <Link
            href={
              experiment
                ? `/direction/experiments/${experiment.id}`
                : "/direction/experiments"
            }
          >
            Cancel
          </Link>
          <Button
            type="submit"
            size="lg"
            disabled={pending || repeatPending || Boolean(repeatError)}
          >
            <Save aria-hidden="true" />{" "}
            {pending
              ? "Saving…"
              : experiment
                ? "Save changes"
                : "Begin experiment"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
