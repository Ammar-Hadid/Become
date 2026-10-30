"use client";

import { useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Check, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { DocumentEditorStage } from "@/components/ui/document-editor/components/document-editor-stage.component";
import { DocumentEditorGuide } from "@/components/ui/document-editor/components/document-editor-guide.component";
import { DocumentEditorToolbar } from "@/components/ui/document-editor/components/document-editor-toolbar.component";
import { getDocumentEditorExtensions } from "@/components/ui/document-editor/config/document-editor.config";
import {
  documentFromText,
  documentToText,
} from "@/components/ui/document-editor/utils/document-editor-text.util";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import "../styles/living-reference-prompt.css";

export function LivingReferencePrompt({
  prompt,
  promptPackage,
  document,
  customized,
  busy,
  error,
  onSave,
}: {
  prompt: string | null;
  promptPackage: {
    prompt: string;
    receipt: string;
    templateVersions: { key: string; version: number }[];
    references: { kind: string; id: string; href: string }[];
    variant: string;
    profileVersion: number;
    briefRevision: number;
    intentVersion: number;
    seasonOverride: boolean;
  } | null;
  document: JSONContent | null;
  customized: boolean;
  busy: boolean;
  error: string;
  onSave: (document: JSONContent) => Promise<boolean>;
}) {
  const { play } = useInterfaceSound();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(prompt ?? "");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const manuscriptRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef("");
  const extensions = useMemo(
    () => getDocumentEditorExtensions({ links: false }),
    [],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: document ?? documentFromText(prompt ?? ""),
    editorProps: {
      attributes: {
        class: "living-reference-prompt-prose document-editor-prose",
        role: "textbox",
        "aria-label": "Reference-sheet prompt document",
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },
    onUpdate({ editor: current }) {
      setDraft(documentToText(current.getJSON()));
    },
  });

  function hasEdits() {
    return Boolean(
      editor && JSON.stringify(editor.getJSON()) !== baselineRef.current,
    );
  }

  function beginEditing() {
    if (!prompt || !editor) return;
    editor.commands.setContent(document ?? documentFromText(prompt), {
      emitUpdate: false,
    });
    editor.commands.setTextSelection(1);
    baselineRef.current = JSON.stringify(editor.getJSON());
    setDraft(prompt);
    setOpen(true);
    play("controlConfirmed");
  }

  function requestClose() {
    if (busy) return;
    if (hasEdits()) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  }

  async function copyPrompt() {
    if (!promptPackage) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(promptPackage, null, 2),
      );
      setCopied(true);
      setCopyError(false);
      play("controlConfirmed");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError(true);
      play("actionBlocked");
    }
  }

  async function save() {
    if (!draft.trim() || draft.length > 12000) return;
    if (!hasEdits()) {
      setOpen(false);
      return;
    }
    if (editor && (await onSave(editor.getJSON()))) setOpen(false);
  }

  return (
    <>
      <Card
        as="article"
        material="solid"
        spacing="action"
        className="living-reference-prompt-card"
      >
        <div className="living-reference-prompt-actions">
          <Button
            ref={editButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              copied ? "Package copied" : "Copy reference-sheet prompt package"
            }
            title={copied ? "Copied" : "Copy package"}
            disabled={!promptPackage}
            onClick={copyPrompt}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </Button>
          <span className="type-overline living-reference-prompt-kicker">
            Reference sheet
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!prompt || busy || !editor}
            onClick={beginEditing}
          >
            <Pencil aria-hidden="true" /> Edit
          </Button>
        </div>
        <div className="living-reference-prompt-sheet">
          <div className="living-reference-prompt-heading">
            <div>
              <p className="type-overline">Image direction / 01</p>
              <h3 className="type-widget-title">Reference-sheet prompt</h3>
            </div>
            {customized ? (
              <span className="type-caption">Edited for this Season</span>
            ) : null}
          </div>
          <div className="living-reference-prompt-preview type-body">
            {prompt ?? "Approve the character profile to prepare this prompt."}
          </div>
          <div className="living-reference-prompt-foot type-caption">
            <span>Ready for ChatGPT or reference generation</span>
            <span>
              {prompt
                ? `${prompt.trim().split(/\s+/).length} words`
                : "Draft pending"}
            </span>
          </div>
        </div>
        {copyError ? (
          <p
            className="type-caption living-reference-prompt-error"
            role="alert"
          >
            Could not copy the prompt package. Try again.
          </p>
        ) : null}
        {copied ? (
          <span className="sr-only" role="status">
            Prompt package copied to clipboard.
          </span>
        ) : null}
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        returnFocusRef={editButtonRef}
        eyebrow="Living Season / Reference"
        title="Edit reference-sheet prompt"
        description="Shape the prompt in Become’s document editor. Saving updates the text used for copying and future reference generation."
        className="living-reference-prompt-dialog"
        footer={
          <>
            <span className="type-caption living-reference-prompt-count">
              {draft.length.toLocaleString()} / 12,000 characters
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                busy || draft.trim().length < 20 || draft.length > 12000
              }
              onClick={save}
            >
              {busy ? "Saving…" : "Save prompt"}
            </Button>
          </>
        }
      >
        {editor ? (
          <DocumentEditorToolbar editor={editor} readOnly={false} mode="text" />
        ) : null}
        <DocumentEditorStage
          label="Reference-sheet prompt editor"
          className="living-reference-prompt-stage"
        >
          <div
            ref={manuscriptRef}
            className="living-reference-prompt-manuscript"
          >
            <DocumentEditorGuide editor={editor} containerRef={manuscriptRef} />
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <p className="type-body">Opening editor…</p>
            )}
          </div>
        </DocumentEditorStage>
        {error ? (
          <p
            className="type-caption living-reference-prompt-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </Dialog>

      <Dialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard prompt edits?"
        description="Your changes have not been saved."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDiscardOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setDiscardOpen(false);
                setOpen(false);
              }}
            >
              Discard changes
            </Button>
          </>
        }
      />
    </>
  );
}
