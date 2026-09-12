"use client";

import { Copy, Pencil, RefreshCw } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";
import type {
  IdeaDraft,
  IdeaView,
} from "@/features/direction/thinking/types/thinking.types";
import type { OwnedOption } from "@/features/direction/types/direction.types";

function IdeaEditForm({
  idea,
  domains,
}: {
  idea: IdeaView;
  domains: OwnedOption[];
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [draft, setDraft] = useState<IdeaDraft>({
    title: idea.title,
    notes: idea.notes,
    domainIds: idea.domainIds,
  });
  const [baseVersion, setBaseVersion] = useState(idea.version);
  const [latest, setLatest] = useState<IdeaView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function toggleDomain(id: string) {
    setDraft((current) => ({
      ...current,
      domainIds: current.domainIds.includes(id)
        ? current.domainIds.filter((item) => item !== id)
        : [...current.domainIds, id],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const identity = { id: idea.id, expectedVersion: baseVersion, draft };
    setPending(true);
    setError(null);
    setFieldErrors({});
    const result = await run(identity, (operationKey) =>
      sendThinkingCommand({
        type: "SAVE_IDEA",
        operationKey,
        id: idea.id,
        expectedVersion: baseVersion,
        draft,
      }),
    );
    setPending(false);
    if (result.error) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setLatest(result.idea ?? null);
      return;
    }
    markSaved();
    close?.();
    router.refresh();
  }

  function useLatest() {
    if (!latest) return;
    setDraft({
      title: latest.title,
      notes: latest.notes,
      domainIds: latest.domainIds,
    });
    setBaseVersion(latest.version);
    setLatest(null);
    setError(null);
    setFieldErrors({});
    requestAnimationFrame(markSaved);
  }

  const copyText = [draft.title, draft.notes].filter(Boolean).join("\n\n");

  return (
    <form ref={formRef} className="idea-capture-form" onSubmit={submit}>
      <label className="thinking-writing-field">
        <span>Idea</span>
        <input
          name="title"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          maxLength={500}
          required
          autoFocus
          aria-invalid={Boolean(fieldErrors.title) || undefined}
        />
      </label>
      <label className="thinking-writing-field">
        <span>Note · optional</span>
        <textarea
          name="notes"
          value={draft.notes}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          maxLength={12000}
        />
      </label>
      <details className="idea-domain-picker">
        <summary>Place it near a domain · optional</summary>
        <div>
          {domains.map((domain) => (
            <label key={domain.id}>
              <input
                type="checkbox"
                name="domainIds"
                value={domain.id}
                checked={draft.domainIds.includes(domain.id)}
                onChange={() => toggleDomain(domain.id)}
              />
              {domain.name}
            </label>
          ))}
        </div>
      </details>
      {error && (
        <div className="thinking-conflict" role="alert">
          <p>{error}</p>
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
      )}
      <footer>
        <span>Earlier versions remain in history</span>
        <button
          type="submit"
          className="thinking-primary-action"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </footer>
    </form>
  );
}

export function IdeaEditor({
  idea,
  domains,
}: {
  idea: IdeaView;
  domains: OwnedOption[];
}) {
  return (
    <RecordDialog
      eyebrow="Refine the thought"
      triggerLabel="Edit idea"
      title="Make the idea easier to return to."
      description="Refining the title or note keeps the idea’s earlier history intact."
      unstyledTrigger
      className="thinking-quiet-action"
      triggerIcon={<Pencil aria-hidden="true" />}
    >
      <IdeaEditForm idea={idea} domains={domains} />
    </RecordDialog>
  );
}
