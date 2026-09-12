"use client";

import { useEffect, useRef, useState } from "react";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { ContentSaveState } from "@/features/content/editor/components/content-save-state.component";
import { useContentAutosave } from "@/features/content/editor/hooks/use-content-autosave.hook";
import type {
  ContentWorkspace,
  ContentWriting,
  VariantView,
} from "@/features/content/types/content.types";

export function ContentWritingEditor({
  contentId,
  variant,
  onWorkspace,
}: {
  contentId: string;
  variant: VariantView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const [draft, setDraft] = useState<ContentWriting>({
    hook: variant.hook,
    outline: variant.outline,
    script: variant.script,
    productionNotes: variant.productionNotes,
  });
  const [baseWritingVersion, setBaseWritingVersion] = useState(
    variant.writingVersion,
  );
  const [scriptOpen, setScriptOpen] = useState(Boolean(variant.script));
  const [productionNotesOpen, setProductionNotesOpen] = useState(
    Boolean(variant.productionNotes),
  );
  const autosave = useContentAutosave({
    value: draft,
    save: (value, operationKey) =>
      sendContentCommand({
        type: "SAVE_WRITING",
        operationKey,
        contentId,
        variantId: variant.id,
        expectedWritingVersion: baseWritingVersion,
        draft: value,
      }),
    onConfirmed: (result) => {
      if (result.workspace) {
        const savedVariant = result.workspace.variants.find(
          (item) => item.id === variant.id,
        );
        setBaseWritingVersion(
          result.writingVersion ??
            savedVariant?.writingVersion ??
            baseWritingVersion,
        );
        onWorkspace(result.workspace);
      }
    },
  });

  useEffect(() => {
    if (autosave.status === "saved" && !autosave.dirty) markSaved();
  }, [autosave.dirty, autosave.status, markSaved]);

  function update(field: keyof ContentWriting, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const latestWorkspace = autosave.result?.workspace;
  const latestVariant = latestWorkspace?.variants.find(
    (item) => item.id === variant.id,
  );
  const latestDraft: ContentWriting | null = latestVariant
    ? {
        hook: latestVariant.hook,
        outline: latestVariant.outline,
        script: latestVariant.script,
        productionNotes: latestVariant.productionNotes,
      }
    : null;
  const latestText = latestDraft
    ? [
        latestDraft.hook,
        latestDraft.outline,
        latestDraft.script,
        latestDraft.productionNotes,
      ]
        .filter(Boolean)
        .join("\n\n")
    : undefined;

  return (
    <section className="content-writing" aria-labelledby="writing-title">
      <header>
        <div>
          <p className="eyebrow">Make this version</p>
          <h2 id="writing-title">Find the shape before the polish.</h2>
        </div>
        <ContentSaveState
          status={autosave.status}
          savedAt={autosave.result?.savedAt}
          error={autosave.result?.error}
          copyText={[
            draft.hook,
            draft.outline,
            draft.script,
            draft.productionNotes,
          ]
            .filter(Boolean)
            .join("\n\n")}
          onRetry={autosave.retry}
          latestText={latestText}
          onUseLatest={
            latestDraft && latestWorkspace && latestVariant
              ? () => {
                  setDraft(latestDraft);
                  setBaseWritingVersion(latestVariant.writingVersion);
                  autosave.accept(latestDraft);
                  onWorkspace(latestWorkspace);
                  requestAnimationFrame(markSaved);
                }
              : undefined
          }
        />
      </header>
      <form
        ref={formRef}
        className="content-writing-form"
        onBlur={autosave.flush}
      >
        <label className="content-writing-field content-writing-field--hook">
          <span>Hook</span>
          <textarea
            name="hook"
            value={draft.hook}
            onChange={(event) => update("hook", event.target.value)}
            placeholder="What earns the next ten seconds?"
            maxLength={6000}
          />
        </label>
        <label className="content-writing-field">
          <span>Outline / talking points</span>
          <textarea
            name="outline"
            value={draft.outline}
            onChange={(event) => update("outline", event.target.value)}
            placeholder="The turns this version needs to make…"
            maxLength={30000}
          />
        </label>
        <details
          className="content-writing-disclosure"
          open={scriptOpen}
          onToggle={(event) => setScriptOpen(event.currentTarget.open)}
        >
          <summary>
            Full script <span>Optional</span>
          </summary>
          <label>
            <span className="sr-only">Full script</span>
            <textarea
              name="script"
              value={draft.script}
              onChange={(event) => update("script", event.target.value)}
              placeholder="Write freely here when this version needs every word."
              maxLength={120000}
            />
          </label>
        </details>
        <details
          className="content-writing-disclosure"
          open={productionNotesOpen}
          onToggle={(event) => setProductionNotesOpen(event.currentTarget.open)}
        >
          <summary>
            Production notes <span>Optional</span>
          </summary>
          <label>
            <span className="sr-only">Production notes</span>
            <textarea
              name="productionNotes"
              value={draft.productionNotes}
              onChange={(event) =>
                update("productionNotes", event.target.value)
              }
              placeholder="Shots, props, edit beats, packaging ideas…"
              maxLength={12000}
            />
          </label>
        </details>
      </form>
    </section>
  );
}
