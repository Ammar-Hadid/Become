"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Input } from "@/components/ui/forms/input.component";

import { Textarea } from "@/components/ui/forms/textarea.component";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/forms/select.component";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { useContentOperation } from "@/features/content/commands/hooks/use-content-operation.hook";
import type {
  ContentFormat,
  ContentIntent,
} from "@/features/content/types/content.types";

const emptyIntent: ContentIntent = {
  title: "",
  purpose: "",
  audience: "",
  notes: "",
};

function ContentCreateForm({ ideaId }: { ideaId?: string }) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useContentOperation();
  const [intent, setIntent] = useState(emptyIntent);
  const [format, setFormat] = useState<ContentFormat>("SHORT_VERTICAL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredId, setRecoveredId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setRecoveredId(null);
    setFieldErrors({});
    const identity = { intent, format, ideaId };
    const result = await run(identity, (operationKey) =>
      sendContentCommand({
        type: "CREATE_CONTENT",
        operationKey,
        draft: intent,
        format,
        ideaId,
      }),
    );
    setPending(false);
    if (result.error || !result.id) {
      if (result.error && (result.id || result.workspace?.id))
        setRecoveredId(result.id ?? result.workspace!.id);
      setError(
        result.error ?? "The content was saved, but could not be opened.",
      );
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    markSaved();
    close?.();
    router.push(`/content/${result.id}`);
    router.refresh();
  }

  return (
    <form ref={formRef} className="content-dialog-form" onSubmit={submit}>
      <label className="content-form-field content-form-field--wide">
        <span>Working title</span>
        <Input
          name="title"
          value={intent.title}
          onChange={(event) =>
            setIntent({ ...intent, title: event.target.value })
          }
          placeholder="A working title"
          maxLength={240}
          required
          aria-invalid={Boolean(fieldErrors.title) || undefined}
          autoFocus
        />
        {fieldErrors.title && <small>{fieldErrors.title}</small>}
      </label>
      <label className="content-form-field content-form-field--wide">
        <span>What should this do?</span>
        <Textarea
          name="purpose"
          value={intent.purpose}
          onChange={(event) =>
            setIntent({ ...intent, purpose: event.target.value })
          }
          placeholder="Teach one useful idea, tell a story, test a point of view…"
          maxLength={6000}
        />
      </label>
      <div className="content-form-field">
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
      {error && (
        <div className="content-form-error" role="alert">
          <p>{error}</p>
          {recoveredId && (
            <Link
              href={`/content/${recoveredId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open the content already created
            </Link>
          )}
        </div>
      )}
      <footer className="content-dialog-actions">
        <Button
          variant="primary"
          type="submit"
          className="content-action"
          disabled={pending}
        >
          {pending ? "Starting…" : "Start making"}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </footer>
    </form>
  );
}

export function ContentCreate({
  ideaId,
  triggerLabel = "Start content",
  variant = "primary",
}: {
  ideaId?: string;
  triggerLabel?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <RecordDialog
      treatment="workspace"
      eyebrow="Create content"
      triggerLabel={triggerLabel}
      title="Start with the idea, not the paperwork."
      description="One variant is ready for you. Add another only when the work needs a different cut or format."
      variant={variant}
      icon={false}
    >
      <ContentCreateForm ideaId={ideaId} />
    </RecordDialog>
  );
}
