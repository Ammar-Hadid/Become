"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Lightbulb, Plus, X } from "lucide-react";
import {
  confirmRecordFormDiscard,
  useRecordFormGuard,
} from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import type {
  IdeaDraft,
  IdeaView,
} from "@/features/direction/thinking/types/thinking.types";
import type { OwnedOption } from "@/features/direction/types/direction.types";

function IdeaCaptureComposer({
  domains,
  onSaved,
  onClose,
}: {
  domains: OwnedOption[];
  onSaved: (idea: IdeaView) => void;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [draft, setDraft] = useState<IdeaDraft>({
    title: "",
    notes: "",
    domainIds: [],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function close() {
    if (confirmRecordFormDiscard(formRef.current ?? undefined)) onClose();
  }

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
    if (pending || !draft.title.trim()) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const result = await run(draft, (operationKey) =>
      sendThinkingCommand({
        type: "SAVE_IDEA",
        operationKey,
        draft,
      }),
    );
    setPending(false);
    if (result.error || !result.idea) {
      setError(
        result.error ?? "The idea was saved, but could not be shown yet.",
      );
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    markSaved();
    onSaved(result.idea);
    onClose();
  }

  function handleKeys(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <form
      ref={formRef}
      className="idea-capture-form"
      onSubmit={submit}
      onKeyDown={handleKeys}
    >
      <header>
        <div>
          <p className="eyebrow">Park an idea</p>
          <h2>Keep the spark. Shape it later.</h2>
        </div>
        <button type="button" onClick={close} aria-label="Close idea composer">
          <X aria-hidden="true" />
        </button>
      </header>
      <label className="thinking-writing-field">
        <span>Idea</span>
        <input
          name="title"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          placeholder="A thought worth returning to…"
          maxLength={500}
          required
          aria-invalid={Boolean(fieldErrors.title) || undefined}
          autoFocus
        />
        {fieldErrors.title && <small>{fieldErrors.title}</small>}
      </label>
      <label className="thinking-writing-field">
        <span>
          Note <small>Optional</small>
        </span>
        <textarea
          name="notes"
          value={draft.notes}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          placeholder="What made it feel interesting?"
          maxLength={12000}
        />
      </label>
      <details className="idea-domain-picker">
        <summary>
          Place it near a domain <span>Optional</span>
        </summary>
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
        <p className="thinking-form-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <span>⌘/Ctrl + Enter</span>
        <button
          type="submit"
          className="thinking-primary-action"
          disabled={pending}
        >
          {pending ? "Parking…" : "Park idea"}
        </button>
      </footer>
    </form>
  );
}

export function IdeaCapture({
  domains,
  onSaved,
}: {
  domains: OwnedOption[];
  onSaved: (idea: IdeaView) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);

  function close() {
    setExpanded(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  if (expanded) {
    return (
      <IdeaCaptureComposer
        domains={domains}
        onSaved={onSaved}
        onClose={close}
      />
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className="idea-capture-trigger"
      onClick={() => setExpanded(true)}
    >
      <span aria-hidden="true">
        <Lightbulb />
      </span>
      <span>
        <strong>What might matter later?</strong>
        <small>Park an idea before it disappears</small>
      </span>
      <Plus aria-hidden="true" />
    </button>
  );
}
