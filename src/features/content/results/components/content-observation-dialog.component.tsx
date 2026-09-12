"use client";

import { useRef, useState, type FormEvent } from "react";
import { DateTime } from "luxon";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { useContentOperation } from "@/features/content/commands/hooks/use-content-operation.hook";
import type {
  ContentWorkspace,
  ObservationDraft,
  PublicationView,
} from "@/features/content/types/content.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

function localDateTime() {
  return DateTime.now().setZone(APP_TIMEZONE).toFormat("yyyy-MM-dd'T'HH:mm");
}

function ContentObservationForm({
  contentId,
  publication,
  onWorkspace,
}: {
  contentId: string;
  publication: PublicationView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useContentOperation();
  const [observedAt, setObservedAt] = useState(localDateTime);
  const [draft, setDraft] = useState<Omit<ObservationDraft, "observedAt">>({
    views: null,
    likes: null,
    comments: null,
    note: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const hasMetric =
    draft.views !== null || draft.likes !== null || draft.comments !== null;

  function metric(field: "views" | "likes" | "comments", value: string) {
    setDraft((current) => ({ ...current, [field]: value || null }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const canonicalObservedAt = DateTime.fromISO(observedAt, {
      zone: APP_TIMEZONE,
    }).toISO();
    if (!canonicalObservedAt) {
      setPending(false);
      setError("Choose a valid observation time.");
      return;
    }
    const submission: ObservationDraft = {
      ...draft,
      observedAt: canonicalObservedAt,
    };
    const result = await run(submission, (operationKey) =>
      sendContentCommand({
        type: "RECORD_OBSERVATION",
        operationKey,
        contentId,
        publicationId: publication.id,
        draft: submission,
      }),
    );
    setPending(false);
    if (result.error || !result.workspace) {
      setError(
        result.error ??
          "The results were saved, but the workspace could not refresh.",
      );
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    markSaved();
    onWorkspace(result.workspace);
    close?.();
  }

  return (
    <form ref={formRef} className="content-dialog-form" onSubmit={submit}>
      <p className="content-results-context">
        <strong>{publication.channel.displayName}</strong>
        <span>
          {publication.publishedTitle || "This version"} · lifetime totals
        </span>
      </p>
      <label className="content-form-field content-form-field--wide">
        <span>Observed at · Amsterdam time</span>
        <input
          type="datetime-local"
          name="observedAt"
          value={observedAt}
          onChange={(event) => setObservedAt(event.target.value)}
          required
          aria-invalid={Boolean(fieldErrors.observedAt) || undefined}
        />
      </label>
      {(["views", "likes", "comments"] as const).map((field) => (
        <label className="content-form-field" key={field}>
          <span>
            {field[0].toUpperCase() + field.slice(1)} <small>Optional</small>
          </span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            name={field}
            value={draft[field] ?? ""}
            onChange={(event) => metric(field, event.target.value)}
            placeholder="Not reported"
            aria-invalid={Boolean(fieldErrors[field]) || undefined}
          />
        </label>
      ))}
      {!hasMetric && (
        <p className="content-form-hint content-form-field--wide">
          Enter at least one number you observed.
        </p>
      )}
      <label className="content-form-field content-form-field--wide">
        <span>
          Note <small>Optional</small>
        </span>
        <textarea
          name="note"
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          placeholder="Anything useful about this reading…"
          maxLength={6000}
        />
      </label>
      {error && (
        <p className="content-form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="content-dialog-actions">
        <button
          type="submit"
          className="content-primary-action"
          disabled={pending || !hasMetric}
        >
          {pending ? "Recording…" : "Record results"}
        </button>
      </footer>
    </form>
  );
}

export function ContentObservationDialog(props: {
  contentId: string;
  publication: PublicationView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  return (
    <RecordDialog
      eyebrow="Manual results"
      triggerLabel="Record results"
      title="What does this release show now?"
      description="Enter lifetime totals as observed. Leave anything you did not check as Not reported."
      unstyledTrigger
      className="content-observation-trigger"
      icon={false}
    >
      <ContentObservationForm {...props} />
    </RecordDialog>
  );
}
