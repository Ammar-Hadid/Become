"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Textarea } from "@/components/ui/forms/textarea.component";

import { Input } from "@/components/ui/forms/input.component";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Beaker, Compass, Link2, Play } from "lucide-react";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { Select } from "@/components/ui/forms/select.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import type {
  IdeaView,
  ThinkingOptions,
} from "@/features/direction/thinking/types/thinking.types";
import type {
  ContentFormat,
  ContentIntent,
} from "@/features/content/types/content.types";
import type {
  ExperimentDraft,
  GoalDraft,
} from "@/features/direction/types/direction.types";

function PromotionNote({ action }: { action: string }) {
  return (
    <p className="idea-promotion-safety">
      Nothing is created until you choose <strong>{action}</strong>. This idea
      stays here and can inspire more work later.
    </p>
  );
}

function PromotionError({
  error,
  recoveredHref,
  recoveredLabel,
}: {
  error: string | null;
  recoveredHref?: string | null;
  recoveredLabel?: string;
}) {
  return error ? (
    <div className="thinking-form-error" role="alert">
      <p>{error}</p>
      {recoveredHref && (
        <Link href={recoveredHref} target="_blank" rel="noreferrer">
          Open the {recoveredLabel ?? "record"} already created
        </Link>
      )}
    </div>
  ) : null;
}

function IdeaContentForm({ idea }: { idea: IdeaView }) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [draft, setDraft] = useState<ContentIntent>({
    title: idea.title,
    purpose: "",
    audience: "",
    notes: idea.notes,
  });
  const [format, setFormat] = useState<ContentFormat>("SHORT_VERTICAL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredHref, setRecoveredHref] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setRecoveredHref(null);
    setFieldErrors({});
    const identity = { ideaId: idea.id, draft, format };
    const result = await run(identity, (operationKey) =>
      sendThinkingCommand({
        type: "PROMOTE_IDEA",
        operationKey,
        ideaId: idea.id,
        destination: "CONTENT",
        draft,
        format,
      }),
    );
    setPending(false);
    const href = result.href ?? (result.id ? `/content/${result.id}` : null);
    if (result.error || !href) {
      setFieldErrors(result.fieldErrors ?? {});
      if (result.error && href) setRecoveredHref(href);
      return setError(
        result.error ?? "The content was created, but could not be opened.",
      );
    }
    markSaved();
    close?.();
    router.push(href);
    router.refresh();
  }

  return (
    <form ref={formRef} className="thinking-dialog-form" onSubmit={submit}>
      <PromotionNote action="Create content" />
      <p className="thinking-form-hint thinking-form-field--wide">
        The original idea and its full note stay linked as the source. Shape a
        working title and purpose for the content here.
      </p>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Working title</span>
        <Input
          name="title"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          maxLength={240}
          required
          autoFocus
          aria-invalid={
            Boolean(fieldErrors.title || fieldErrors["draft.title"]) ||
            draft.title.length > 240 ||
            undefined
          }
        />
        {draft.title.length > 240 && (
          <small>Shorten the working title to 240 characters.</small>
        )}
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Purpose</span>
        <Textarea
          name="purpose"
          value={draft.purpose}
          onChange={(event) =>
            setDraft({ ...draft, purpose: event.target.value })
          }
          maxLength={6000}
          placeholder="What should this change for the person who sees it?"
        />
      </label>
      <div className="thinking-form-field">
        <span>First variant</span>
        <Select
          label="First variant format"
          name="format"
          value={format}
          options={[
            { value: "SHORT_VERTICAL", label: "Short vertical" },
            { value: "LONG_FORM", label: "Long form" },
            { value: "OTHER", label: "Something else" },
          ]}
          onValueChange={setFormat}
        />
      </div>
      <PromotionError
        error={error}
        recoveredHref={recoveredHref}
        recoveredLabel="content"
      />
      <footer className="thinking-dialog-actions">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create content"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}

function IdeaGoalForm({
  idea,
  defaultStartOn,
}: {
  idea: IdeaView;
  defaultStartOn: string;
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [draft, setDraft] = useState<GoalDraft>({
    title: idea.title,
    description: idea.notes,
    startOn: defaultStartOn,
    targetOn: undefined,
    domainIds: idea.domainIds,
    criterionMode: "ALL",
    criteria: [],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredHref, setRecoveredHref] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setRecoveredHref(null);
    setFieldErrors({});
    const result = await run({ ideaId: idea.id, draft }, (operationKey) =>
      sendThinkingCommand({
        type: "PROMOTE_IDEA",
        operationKey,
        ideaId: idea.id,
        destination: "GOAL",
        draft,
      }),
    );
    setPending(false);
    const href =
      result.href ?? (result.id ? `/direction/goals/${result.id}` : null);
    if (result.error || !href) {
      setFieldErrors(result.fieldErrors ?? {});
      if (result.error && href) setRecoveredHref(href);
      return setError(
        result.error ?? "The goal was created, but could not be opened.",
      );
    }
    markSaved();
    close?.();
    router.push(href);
    router.refresh();
  }

  return (
    <form ref={formRef} className="thinking-dialog-form" onSubmit={submit}>
      <PromotionNote action="Create goal" />
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Goal</span>
        <Input
          name="goalTitle"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          maxLength={200}
          required
          autoFocus
          aria-invalid={
            Boolean(fieldErrors.title || fieldErrors["draft.title"]) ||
            draft.title.length > 200 ||
            undefined
          }
        />
        {draft.title.length > 200 && (
          <small>Shorten the goal title to 200 characters.</small>
        )}
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Why this matters · optional</span>
        <Textarea
          name="goalDescription"
          value={draft.description ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
          maxLength={6000}
          aria-invalid={
            Boolean(
              fieldErrors.description || fieldErrors["draft.description"],
            ) ||
            (draft.description?.length ?? 0) > 6000 ||
            undefined
          }
        />
        {(draft.description?.length ?? 0) > 6000 && (
          <small>
            This idea note is longer than a goal description. Shorten it to
            6,000 characters; the original idea stays linked in full.
          </small>
        )}
      </label>
      <label className="thinking-form-field">
        <span>Starts</span>
        <Input
          type="date"
          name="goalStartOn"
          value={draft.startOn}
          onChange={(event) =>
            setDraft({ ...draft, startOn: event.target.value })
          }
          required
        />
      </label>
      <label className="thinking-form-field">
        <span>Target date · optional</span>
        <Input
          type="date"
          name="goalTargetOn"
          value={draft.targetOn ?? ""}
          min={draft.startOn}
          onChange={(event) =>
            setDraft({ ...draft, targetOn: event.target.value || undefined })
          }
        />
      </label>
      <p className="thinking-form-hint thinking-form-field--wide">
        You can assign domains and update the goal after creating it.
      </p>
      <PromotionError
        error={error}
        recoveredHref={recoveredHref}
        recoveredLabel="goal"
      />
      <footer className="thinking-dialog-actions">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create goal"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}

function IdeaExperimentForm({
  idea,
  defaultStartOn,
}: {
  idea: IdeaView;
  defaultStartOn: string;
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [draft, setDraft] = useState<ExperimentDraft>({
    title: idea.title,
    question: idea.notes || idea.title,
    approach: "",
    startOn: defaultStartOn,
    targetOn: undefined,
    stoppingCondition: "",
    expectedEvidence: "",
    domainIds: idea.domainIds,
    criterionMode: "ALL",
    criteria: [],
    sourceInteractionIds: [],
    sourceContentIds: [],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredHref, setRecoveredHref] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setRecoveredHref(null);
    setFieldErrors({});
    const result = await run({ ideaId: idea.id, draft }, (operationKey) =>
      sendThinkingCommand({
        type: "PROMOTE_IDEA",
        operationKey,
        ideaId: idea.id,
        destination: "EXPERIMENT",
        draft,
      }),
    );
    setPending(false);
    const href =
      result.href ?? (result.id ? `/direction/experiments/${result.id}` : null);
    if (result.error || !href) {
      setFieldErrors(result.fieldErrors ?? {});
      if (result.error && href) setRecoveredHref(href);
      return setError(
        result.error ?? "The experiment was created, but could not be opened.",
      );
    }
    markSaved();
    close?.();
    router.push(href);
    router.refresh();
  }

  return (
    <form ref={formRef} className="thinking-dialog-form" onSubmit={submit}>
      <PromotionNote action="Create experiment" />
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Experiment name</span>
        <Input
          name="experimentTitle"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          maxLength={200}
          required
          autoFocus
          aria-invalid={
            Boolean(fieldErrors.title || fieldErrors["draft.title"]) ||
            draft.title.length > 200 ||
            undefined
          }
        />
        {draft.title.length > 200 && (
          <small>Shorten the experiment name to 200 characters.</small>
        )}
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Question</span>
        <Textarea
          name="experimentQuestion"
          value={draft.question}
          onChange={(event) =>
            setDraft({ ...draft, question: event.target.value })
          }
          maxLength={6000}
          required
          placeholder="What are you trying to learn?"
          aria-invalid={
            Boolean(fieldErrors.question || fieldErrors["draft.question"]) ||
            draft.question.length > 6000 ||
            undefined
          }
        />
        {draft.question.length > 6000 && (
          <small>
            This idea note is longer than an experiment question. Shorten it to
            6,000 characters; the original idea stays linked in full.
          </small>
        )}
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Approach</span>
        <Textarea
          name="experimentApproach"
          value={draft.approach}
          onChange={(event) =>
            setDraft({ ...draft, approach: event.target.value })
          }
          maxLength={6000}
          required
          placeholder="What will you try?"
        />
      </label>
      <label className="thinking-form-field">
        <span>Starts</span>
        <Input
          type="date"
          name="experimentStartOn"
          value={draft.startOn}
          onChange={(event) =>
            setDraft({ ...draft, startOn: event.target.value })
          }
          required
        />
      </label>
      <label className="thinking-form-field">
        <span>Target date · optional</span>
        <Input
          type="date"
          name="experimentTargetOn"
          value={draft.targetOn ?? ""}
          min={draft.startOn}
          onChange={(event) =>
            setDraft({ ...draft, targetOn: event.target.value || undefined })
          }
        />
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>Or stop when…</span>
        <Input
          name="experimentStoppingCondition"
          value={draft.stoppingCondition ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, stoppingCondition: event.target.value })
          }
          maxLength={3000}
          placeholder="Ten interviews are complete"
        />
      </label>
      <p className="thinking-form-hint thinking-form-field--wide">
        Choose a target date or a stopping condition. Evidence can be refined
        after creation.
      </p>
      <PromotionError
        error={error}
        recoveredHref={recoveredHref}
        recoveredLabel="experiment"
      />
      <footer className="thinking-dialog-actions">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create experiment"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}

type LinkDestination = "CONTENT" | "GOAL" | "EXPERIMENT";

function IdeaLinkForm({
  idea,
  options,
}: {
  idea: IdeaView;
  options: ThinkingOptions;
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [destination, setDestination] = useState<LinkDestination>("CONTENT");
  const [selected, setSelected] = useState<ReusableEntityOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destinationOptions =
    destination === "CONTENT"
      ? options.content
      : destination === "GOAL"
        ? options.goals
        : options.experiments;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !selected) return;
    setPending(true);
    setError(null);
    const identity = {
      ideaId: idea.id,
      destination,
      destinationId: selected.id,
    };
    const result = await run(identity, (operationKey) =>
      sendThinkingCommand({
        type: "LINK_IDEA",
        operationKey,
        ideaId: idea.id,
        destination,
        destinationId: selected.id,
      }),
    );
    setPending(false);
    if (result.error) return setError(result.error);
    markSaved();
    close?.();
    router.refresh();
  }

  return (
    <form ref={formRef} className="thinking-dialog-form" onSubmit={submit}>
      <p className="idea-promotion-safety">
        Connect this idea to work that already exists. Neither record is changed
        or duplicated.
      </p>
      <div className="thinking-form-field">
        <span>Kind of work</span>
        <Select
          label="Kind of work"
          name="destination"
          value={destination}
          options={[
            { value: "CONTENT", label: "Content" },
            { value: "GOAL", label: "Goal" },
            { value: "EXPERIMENT", label: "Experiment" },
          ]}
          onValueChange={(value) => {
            setDestination(value);
            setSelected(null);
          }}
        />
      </div>
      <div className="thinking-form-field thinking-form-field--wide">
        <ReusableEntityCombobox
          key={destination}
          label={`Choose ${destination.toLowerCase()}`}
          entityName={destination.toLowerCase()}
          idFieldName="destinationId"
          queryFieldName="destinationQuery"
          options={destinationOptions}
          placeholder={`Find ${destination.toLowerCase()}…`}
          optional={false}
          required
          onSelectedOptionChange={setSelected}
        />
      </div>
      <PromotionError error={error} />
      <footer className="thinking-dialog-actions">
        <Button variant="primary" type="submit" disabled={pending || !selected}>
          {pending ? "Linking…" : "Link existing"}
          {!pending && <Link2 aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}

export function IdeaPromote({
  idea,
  options,
  defaultStartOn,
}: {
  idea: IdeaView;
  options: ThinkingOptions;
  defaultStartOn: string;
}) {
  return (
    <div className="idea-promotion-actions">
      <RecordDialog
        treatment="workspace"
        eyebrow="From thought to work"
        triggerLabel="Create content"
        title="Give this idea a place to become real."
        description="A content workspace opens with one version. You can change its format or add another later."
        triggerIcon={<Play aria-hidden="true" />}
      >
        <IdeaContentForm idea={idea} />
      </RecordDialog>
      <RecordDialog
        treatment="workspace"
        eyebrow="From thought to direction"
        variant="secondary"
        triggerLabel="Set a goal"
        title="Name the outcome this idea points toward."
        description="Start with the outcome. Add dates or notes when they help."
        triggerIcon={<Compass aria-hidden="true" />}
      >
        <IdeaGoalForm idea={idea} defaultStartOn={defaultStartOn} />
      </RecordDialog>
      <RecordDialog
        treatment="workspace"
        eyebrow="From thought to learning"
        variant="secondary"
        triggerLabel="Run an experiment"
        title="Turn this idea into one bounded attempt."
        description="Choose what you will try and when you will stop to learn."
        triggerIcon={<Beaker aria-hidden="true" />}
      >
        <IdeaExperimentForm idea={idea} defaultStartOn={defaultStartOn} />
      </RecordDialog>
      <RecordDialog
        treatment="workspace"
        eyebrow="Connect the thread"
        variant="quiet"
        triggerLabel="Link existing"
        title="This idea already became something."
        description="Point to existing content, a goal, or an experiment without creating a copy."
        triggerIcon={<Link2 aria-hidden="true" />}
      >
        <IdeaLinkForm idea={idea} options={options} />
      </RecordDialog>
    </div>
  );
}
