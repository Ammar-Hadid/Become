"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { Select } from "@/components/ui/forms/select.component";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { useContentOperation } from "@/features/content/commands/hooks/use-content-operation.hook";
import type {
  ContentFormat,
  ContentWorkspace,
} from "@/features/content/types/content.types";

function ContentAddVersionForm({
  contentId,
  onCreated,
}: {
  contentId: string;
  onCreated: (workspace: ContentWorkspace, variantId?: string) => void;
}) {
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useContentOperation();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<ContentFormat>("SHORT_VERTICAL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const identity = { contentId, name, format };
    const result = await run(identity, (operationKey) =>
      sendContentCommand({
        type: "CREATE_VARIANT",
        operationKey,
        contentId,
        name,
        format,
      }),
    );
    setPending(false);
    if (result.error || !result.workspace) {
      return setError(
        result.error ?? "The version was saved, but could not be opened.",
      );
    }
    markSaved();
    onCreated(result.workspace, result.id);
    close?.();
  }

  return (
    <form ref={formRef} className="content-dialog-form" onSubmit={submit}>
      <label className="content-form-field content-form-field--wide">
        <span>Version name</span>
        <input
          name="versionName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Spanish cut, 30-second version, tutorial…"
          maxLength={120}
          required
          autoFocus
        />
      </label>
      <div className="content-form-field content-form-field--wide">
        <span>Format</span>
        <Select
          label="Version format"
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
        <p className="content-form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="content-dialog-actions">
        <button
          type="submit"
          className="content-primary-action"
          disabled={pending}
        >
          {pending ? "Adding…" : "Add version"}
        </button>
      </footer>
    </form>
  );
}

export function ContentAddVersion(props: {
  contentId: string;
  onCreated: (workspace: ContentWorkspace, variantId?: string) => void;
}) {
  return (
    <RecordDialog
      eyebrow="Another version"
      triggerLabel="Add a version"
      title="Does the work need a different shape?"
      description="Use another version for a different cut, language, or format. Posting the same version elsewhere is a release, not a new version."
      unstyledTrigger
      className="content-add-version-trigger"
      icon={false}
    >
      <ContentAddVersionForm {...props} />
    </RecordDialog>
  );
}
