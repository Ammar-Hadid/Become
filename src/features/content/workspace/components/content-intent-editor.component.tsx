"use client";

import { useEffect, useRef, useState } from "react";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { ContentSaveState } from "@/features/content/editor/components/content-save-state.component";
import { useContentAutosave } from "@/features/content/editor/hooks/use-content-autosave.hook";
import type {
  ContentIntent,
  ContentWorkspace,
} from "@/features/content/types/content.types";

export function ContentIntentEditor({
  workspace,
  onWorkspace,
}: {
  workspace: ContentWorkspace;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<ContentIntent>({
    title: workspace.title,
    purpose: workspace.purpose,
    audience: workspace.audience,
    notes: workspace.notes,
  });
  const [baseVersion, setBaseVersion] = useState(workspace.version);
  const [notesOpen, setNotesOpen] = useState(Boolean(workspace.notes));
  const autosave = useContentAutosave({
    value: draft,
    save: (value, operationKey) =>
      sendContentCommand({
        type: "SAVE_CONTENT",
        operationKey,
        contentId: workspace.id,
        expectedVersion: baseVersion,
        draft: value,
      }),
    onConfirmed: (result) => {
      if (result.workspace) {
        setBaseVersion(result.version ?? result.workspace.version);
        onWorkspace(result.workspace);
      }
    },
  });
  const markSaved = useRecordFormGuard(formRef, autosave.flush);

  useEffect(() => {
    if (autosave.status === "saved" && !autosave.dirty) markSaved();
  }, [autosave.dirty, autosave.status, markSaved]);

  function update(field: keyof ContentIntent, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const latestWorkspace = autosave.result?.workspace;
  const latestDraft: ContentIntent | null = latestWorkspace
    ? {
        title: latestWorkspace.title,
        purpose: latestWorkspace.purpose,
        audience: latestWorkspace.audience,
        notes: latestWorkspace.notes,
      }
    : null;

  return (
    <form
      ref={formRef}
      className="content-intent"
      onBlur={autosave.flush}
      aria-label="Content intent"
    >
      <h1 className="sr-only">{draft.title.trim() || "Untitled content"}</h1>
      <div className="content-intent-title-row">
        <label>
          <span className="sr-only">Working title</span>
          <input
            name="title"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Untitled content"
            maxLength={240}
            required
          />
        </label>
        <ContentSaveState
          status={autosave.status}
          savedAt={autosave.result?.savedAt}
          error={autosave.result?.error}
          copyText={[draft.title, draft.purpose, draft.audience, draft.notes]
            .filter(Boolean)
            .join("\n\n")}
          onRetry={autosave.retry}
          latestText={
            latestDraft
              ? [
                  latestDraft.title,
                  latestDraft.purpose,
                  latestDraft.audience,
                  latestDraft.notes,
                ]
                  .filter(Boolean)
                  .join("\n\n")
              : undefined
          }
          onUseLatest={
            latestDraft && latestWorkspace
              ? () => {
                  setDraft(latestDraft);
                  setBaseVersion(latestWorkspace.version);
                  autosave.accept(latestDraft);
                  onWorkspace(latestWorkspace);
                  requestAnimationFrame(markSaved);
                }
              : undefined
          }
        />
      </div>
      <div className="content-intent-body">
        <div className="content-intent-fields">
          <label>
            <span>Purpose</span>
            <textarea
              name="purpose"
              value={draft.purpose}
              onChange={(event) => update("purpose", event.target.value)}
              placeholder="What should this change for the person who sees it?"
              maxLength={6000}
            />
          </label>
          <label>
            <span>For</span>
            <textarea
              name="audience"
              value={draft.audience}
              onChange={(event) => update("audience", event.target.value)}
              placeholder="Who is this for, right now?"
              maxLength={3000}
            />
          </label>
        </div>
        <details
          className="content-intent-notes"
          open={notesOpen}
          onToggle={(event) => setNotesOpen(event.currentTarget.open)}
        >
          <summary>
            Creative notes <span>Optional</span>
          </summary>
          <label>
            <span className="sr-only">Creative notes</span>
            <textarea
              name="notes"
              value={draft.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="References, constraints, loose thoughts…"
              maxLength={12000}
            />
          </label>
        </details>
      </div>
    </form>
  );
}
