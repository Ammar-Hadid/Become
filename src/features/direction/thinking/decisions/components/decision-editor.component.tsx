"use client";

import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Copy,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";
import {
  searchDirectionOptions,
  type DirectionOptionKind,
} from "@/features/direction/options/utils/direction-option-client.util";
import type {
  DecisionDraft,
  DecisionContext,
  DecisionView,
  ThinkingOptions,
} from "@/features/direction/thinking/types/thinking.types";

type DecisionDialogMode = "create" | "edit" | "follow-up";

function optionFor(
  options: ReusableEntityOption[],
  id: string | undefined,
  decision?: DecisionView,
) {
  if (!id) return null;
  const option = options.find((item) => item.id === id);
  if (option) return option;
  const linked = decision?.links.find((item) => item.id === id);
  return linked ? { id: linked.id, name: linked.label } : null;
}

function emptyDecision(
  decidedOn: string,
  context: DecisionContext = {},
): DecisionDraft {
  return {
    choice: "",
    reason: "",
    decidedOn,
    context: "",
    alternatives: "",
    expectedOutcome: "",
    reconsiderWhen: "",
    reviewOn: null,
    ...context,
  };
}

function DecisionRelation({
  label,
  entityName,
  optionKind,
  options,
  selected,
  onChange,
}: {
  label: string;
  entityName: string;
  optionKind: DirectionOptionKind;
  options: ReusableEntityOption[];
  selected: ReusableEntityOption | null;
  onChange: (option: ReusableEntityOption | null) => void;
}) {
  const search = useCallback(
    (query: string) => searchDirectionOptions(optionKind, query),
    [optionKind],
  );
  return (
    <ReusableEntityCombobox
      key={`${entityName}:${selected?.id ?? ""}`}
      label={label}
      entityName={entityName}
      idFieldName={`${entityName}Id`}
      queryFieldName={`${entityName}Query`}
      options={options}
      initialId={selected?.id}
      initialName={selected?.name}
      placeholder={`Find ${entityName}…`}
      onSelectedOptionChange={onChange}
      searchAction={search}
    />
  );
}

function DecisionForm({
  mode,
  decision,
  supersedes,
  options,
  defaultDecidedOn,
  initialContext,
  onSaved,
}: {
  mode: DecisionDialogMode;
  decision?: DecisionView;
  supersedes?: DecisionView;
  options: ThinkingOptions;
  defaultDecidedOn: string;
  initialContext?: DecisionContext;
  onSaved?: (decision: DecisionView) => void;
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const initial = decision ?? emptyDecision(defaultDecidedOn, initialContext);
  const [draft, setDraft] = useState<DecisionDraft>({
    choice: initial.choice,
    reason: initial.reason,
    decidedOn: initial.decidedOn,
    context:
      mode === "follow-up"
        ? `A follow-up to “${supersedes?.choice ?? "the earlier decision"}”.`
        : initial.context,
    alternatives: initial.alternatives,
    expectedOutcome: initial.expectedOutcome,
    reconsiderWhen: initial.reconsiderWhen,
    reviewOn: initial.reviewOn,
    contentId: initial.contentId,
    projectId: initial.projectId,
    goalId: initial.goalId,
    experimentId: initial.experimentId,
    nicheId: initial.nicheId,
    seasonId: initial.seasonId,
  });
  const [baseVersion, setBaseVersion] = useState(decision?.version);
  const [content, setContent] = useState<ReusableEntityOption | null>(
    optionFor(options.content, initial.contentId, decision),
  );
  const [project, setProject] = useState<ReusableEntityOption | null>(
    optionFor(options.projects, initial.projectId, decision),
  );
  const [goal, setGoal] = useState<ReusableEntityOption | null>(
    optionFor(options.goals, initial.goalId, decision),
  );
  const [experiment, setExperiment] = useState<ReusableEntityOption | null>(
    optionFor(options.experiments, initial.experimentId, decision),
  );
  const [niche, setNiche] = useState<ReusableEntityOption | null>(
    optionFor(options.niches, initial.nicheId, decision),
  );
  const [season, setSeason] = useState<ReusableEntityOption | null>(
    optionFor(options.seasons, initial.seasonId, decision),
  );
  const [relationsOpen, setRelationsOpen] = useState(
    Boolean(decision?.links.length),
  );
  const [changeReason, setChangeReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<DecisionView | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function patch(value: Partial<DecisionDraft>) {
    setDraft((current) => ({ ...current, ...value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const completeDraft: DecisionDraft = {
      ...draft,
      contentId: content?.id,
      projectId: project?.id,
      goalId: goal?.id,
      experimentId: experiment?.id,
      nicheId: niche?.id,
      seasonId: season?.id,
    };
    const identity = {
      id: decision?.id,
      version: baseVersion,
      supersedesId: supersedes?.id,
      changeReason,
      draft: completeDraft,
    };
    setPending(true);
    setError(null);
    setFieldErrors({});
    const result = await run(identity, (operationKey) =>
      sendThinkingCommand({
        type: "SAVE_DECISION",
        operationKey,
        id: decision?.id,
        expectedVersion: baseVersion,
        draft: completeDraft,
        changeReason: mode === "edit" ? changeReason : undefined,
        supersedesId: supersedes?.id,
      }),
    );
    setPending(false);
    if (result.error) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setLatest(result.decision ?? null);
      return;
    }
    markSaved();
    if (result.decision) onSaved?.(result.decision);
    close?.();
    if (mode !== "edit" && result.id) {
      router.push(`/direction/decisions/${result.id}`);
    }
    router.refresh();
  }

  const errorFor = (name: keyof DecisionDraft) =>
    fieldErrors[name] ?? fieldErrors[`draft.${name}`];

  function useLatest() {
    if (!latest) return;
    setDraft({
      choice: latest.choice,
      reason: latest.reason,
      decidedOn: latest.decidedOn,
      context: latest.context,
      alternatives: latest.alternatives,
      expectedOutcome: latest.expectedOutcome,
      reconsiderWhen: latest.reconsiderWhen,
      reviewOn: latest.reviewOn,
      contentId: latest.contentId,
      projectId: latest.projectId,
      goalId: latest.goalId,
      experimentId: latest.experimentId,
      nicheId: latest.nicheId,
      seasonId: latest.seasonId,
    });
    setContent(optionFor(options.content, latest.contentId, latest));
    setProject(optionFor(options.projects, latest.projectId, latest));
    setGoal(optionFor(options.goals, latest.goalId, latest));
    setExperiment(optionFor(options.experiments, latest.experimentId, latest));
    setNiche(optionFor(options.niches, latest.nicheId, latest));
    setSeason(optionFor(options.seasons, latest.seasonId, latest));
    setBaseVersion(latest.version);
    setChangeReason("");
    setLatest(null);
    setError(null);
    setFieldErrors({});
    requestAnimationFrame(markSaved);
  }

  const copyText = [
    draft.choice,
    draft.reason,
    draft.context,
    draft.alternatives,
    draft.expectedOutcome,
    draft.reconsiderWhen,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <form
      ref={formRef}
      className="decision-form"
      onSubmit={submit}
      aria-busy={pending}
    >
      {mode === "follow-up" && supersedes && (
        <p className="decision-follow-up-note">
          The earlier decision stays intact. This entry will point back to it as
          the choice that came before.
        </p>
      )}
      <label className="decision-writing-field decision-writing-field--choice">
        <span>Decision</span>
        <textarea
          name="choice"
          value={draft.choice}
          onChange={(event) => patch({ choice: event.target.value })}
          placeholder="I will…"
          maxLength={500}
          required
          autoFocus
          aria-invalid={Boolean(errorFor("choice")) || undefined}
        />
        {errorFor("choice") && <small>{errorFor("choice")}</small>}
      </label>
      <label className="decision-writing-field decision-writing-field--reason">
        <span>Because</span>
        <textarea
          name="reason"
          value={draft.reason}
          onChange={(event) => patch({ reason: event.target.value })}
          placeholder="The evidence, constraint, or conviction behind the choice…"
          maxLength={12000}
          required
          aria-invalid={Boolean(errorFor("reason")) || undefined}
        />
        {errorFor("reason") && <small>{errorFor("reason")}</small>}
      </label>
      <div className="decision-date-row">
        <label className="thinking-form-field">
          <span>Decided on</span>
          <input
            type="date"
            name="decidedOn"
            value={draft.decidedOn}
            onChange={(event) => patch({ decidedOn: event.target.value })}
            required
            aria-invalid={Boolean(errorFor("decidedOn")) || undefined}
          />
        </label>
        <label className="thinking-form-field">
          <span>Review on · optional</span>
          <input
            type="date"
            name="reviewOn"
            value={draft.reviewOn ?? ""}
            min={draft.decidedOn}
            onChange={(event) =>
              patch({ reviewOn: event.target.value || null })
            }
            aria-invalid={Boolean(errorFor("reviewOn")) || undefined}
          />
        </label>
      </div>
      <details
        className="decision-supporting-fields"
        open={relationsOpen}
        onToggle={(event) => setRelationsOpen(event.currentTarget.open)}
      >
        <summary>Context, alternatives, and related work</summary>
        <div className="decision-supporting-grid">
          <label className="thinking-form-field thinking-form-field--wide">
            <span>Situation · optional</span>
            <textarea
              name="context"
              value={draft.context}
              onChange={(event) => patch({ context: event.target.value })}
              maxLength={12000}
              placeholder="What was true when you made this choice?"
            />
          </label>
          <label className="thinking-form-field">
            <span>Alternatives considered · optional</span>
            <textarea
              name="alternatives"
              value={draft.alternatives}
              onChange={(event) => patch({ alternatives: event.target.value })}
              maxLength={6000}
            />
          </label>
          <label className="thinking-form-field">
            <span>Expected outcome · optional</span>
            <textarea
              name="expectedOutcome"
              value={draft.expectedOutcome}
              onChange={(event) =>
                patch({ expectedOutcome: event.target.value })
              }
              maxLength={6000}
            />
          </label>
          <label className="thinking-form-field thinking-form-field--wide">
            <span>Reconsider when · optional</span>
            <textarea
              name="reconsiderWhen"
              value={draft.reconsiderWhen}
              onChange={(event) =>
                patch({ reconsiderWhen: event.target.value })
              }
              maxLength={6000}
              placeholder="A signal that should bring this decision back into question…"
            />
          </label>
          <DecisionRelation
            label="Content"
            entityName="content"
            optionKind="content"
            options={options.content}
            selected={content}
            onChange={setContent}
          />
          <DecisionRelation
            label="Project"
            entityName="project"
            optionKind="project"
            options={options.projects}
            selected={project}
            onChange={setProject}
          />
          <DecisionRelation
            label="Goal"
            entityName="goal"
            optionKind="goal"
            options={options.goals}
            selected={goal}
            onChange={setGoal}
          />
          <DecisionRelation
            label="Experiment"
            entityName="experiment"
            optionKind="experiment"
            options={options.experiments}
            selected={experiment}
            onChange={setExperiment}
          />
          <DecisionRelation
            label="Niche"
            entityName="niche"
            optionKind="niche"
            options={options.niches}
            selected={niche}
            onChange={setNiche}
          />
          <DecisionRelation
            label="Season"
            entityName="season"
            optionKind="season"
            options={options.seasons}
            selected={season}
            onChange={setSeason}
          />
        </div>
      </details>
      {mode === "edit" && (
        <label className="thinking-form-field">
          <span>What changed?</span>
          <input
            name="changeReason"
            value={changeReason}
            onChange={(event) => setChangeReason(event.target.value)}
            placeholder="Why this version is more accurate"
            maxLength={2000}
            required
          />
        </label>
      )}
      {(error || Object.keys(fieldErrors).length > 0) && (
        <div className="thinking-form-error" role="alert">
          <strong>{error ?? "Some entries need attention."}</strong>
          {Object.keys(fieldErrors).length > 0 && (
            <ul>
              {Object.entries(fieldErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          )}
          <div className="thinking-conflict-actions">
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(copyText)}
            >
              <Copy aria-hidden="true" /> Copy my draft
            </button>
            {latest && (
              <button type="button" onClick={useLatest}>
                <RefreshCw aria-hidden="true" /> Use latest saved copy
              </button>
            )}
          </div>
        </div>
      )}
      <footer className="thinking-dialog-actions">
        <button
          type="submit"
          className="thinking-primary-action"
          disabled={pending}
        >
          {pending
            ? "Saving…"
            : mode === "edit"
              ? "Save revision"
              : "Record decision"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </button>
      </footer>
    </form>
  );
}

export function DecisionDialog({
  mode = "create",
  decision,
  supersedes,
  options,
  defaultDecidedOn,
  onSaved,
  className,
  children,
  initialContext,
}: {
  mode?: DecisionDialogMode;
  decision?: DecisionView;
  supersedes?: DecisionView;
  options: ThinkingOptions;
  defaultDecidedOn: string;
  onSaved?: (decision: DecisionView) => void;
  className?: string;
  children?: ReactNode;
  initialContext?: DecisionContext;
}) {
  const copy =
    mode === "edit"
      ? {
          eyebrow: "Revise with context",
          label: "Edit decision",
          title: "Make the record more accurate.",
          description:
            "The earlier version remains in history with the reason for this change.",
          icon: <Pencil aria-hidden="true" />,
        }
      : mode === "follow-up"
        ? {
            eyebrow: "A new choice",
            label: "Record follow-up",
            title: "The situation changed. Record what comes next.",
            description:
              "This creates a new decision and preserves the one it supersedes.",
            icon: <GitBranch aria-hidden="true" />,
          }
        : {
            eyebrow: "Decision journal",
            label: "Record a decision",
            title: "What have you chosen?",
            description:
              "Capture enough reasoning for your future self to understand the choice.",
            icon: <Plus aria-hidden="true" />,
          };

  return (
    <RecordDialog
      eyebrow={copy.eyebrow}
      triggerLabel={copy.label}
      title={copy.title}
      description={copy.description}
      unstyledTrigger
      className={className ?? "thinking-primary-action"}
      triggerIcon={copy.icon}
    >
      {children ?? (
        <DecisionForm
          mode={mode}
          decision={decision}
          supersedes={supersedes}
          options={options}
          defaultDecidedOn={defaultDecidedOn}
          initialContext={initialContext}
          onSaved={onSaved}
        />
      )}
    </RecordDialog>
  );
}

export function DecisionStandaloneEditor({
  options,
  defaultDecidedOn,
  initialContext,
  returnHref,
}: {
  options: ThinkingOptions;
  defaultDecidedOn: string;
  initialContext?: DecisionContext;
  returnHref: string;
}) {
  return (
    <div className="decision-standalone">
      <Link href={returnHref} className="thinking-back-link">
        <ArrowLeft aria-hidden="true" /> Leave for now
      </Link>
      <header>
        <p className="eyebrow">Decision journal</p>
        <h1>What have you chosen?</h1>
        <p>
          Capture enough reasoning for your future self to understand the
          choice.
        </p>
      </header>
      <DecisionForm
        mode="create"
        options={options}
        defaultDecidedOn={defaultDecidedOn}
        initialContext={initialContext}
      />
    </div>
  );
}
