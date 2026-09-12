"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, ShieldAlert, X } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { getScriptExtensions } from "@/features/content/scripts/config/content-script-editor.config";
import {
  scriptHasContent,
  scriptPlainText,
} from "@/features/content/scripts/utils/content-script-document.util";
import type {
  ContentScriptView,
  ScriptDocument,
} from "@/features/content/scripts/types/content-script.types";

export function ContentScriptConflict({
  localDocument,
  latest,
  message,
  onCancel,
  onKeepLocal,
  onUseLatest,
}: {
  localDocument: ScriptDocument;
  latest: ContentScriptView;
  message: string | null;
  onCancel: () => void;
  onKeepLocal: () => Promise<void>;
  onUseLatest: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeCopy, setActiveCopy] = useState<"mine" | "latest">("mine");
  const [pending, setPending] = useState(false);
  const localText = scriptPlainText(localDocument);
  const latestText = scriptPlainText(latest.document);
  const localEditor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: getScriptExtensions(),
    content: localDocument.content,
    editorProps: {
      attributes: {
        class: "content-script-prose content-script-conflict-prose",
        role: "document",
        "aria-label": "Your draft",
      },
    },
  });
  const latestEditor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: getScriptExtensions(),
    content: latest.document.content,
    editorProps: {
      attributes: {
        class: "content-script-prose content-script-conflict-prose",
        role: "document",
        "aria-label": "Latest saved script",
      },
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="content-script-dialog content-script-conflict"
      aria-labelledby="content-script-conflict-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
    >
      <header className="content-script-dialog-heading">
        <span className="content-script-dialog-symbol" aria-hidden="true">
          <ShieldAlert />
        </span>
        <div>
          <p className="eyebrow">Two drafts</p>
          <h2 id="content-script-conflict-title">Choose the script to keep.</h2>
          <p>
            {message ||
              "Another tab saved this variant. Both copies are preserved here."}
          </p>
        </div>
        <button
          type="button"
          className="content-script-dialog-close"
          aria-label="Close comparison"
          onClick={onCancel}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div
        className="content-script-conflict-tabs"
        role="tablist"
        aria-label="Script copies"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCopy === "mine"}
          onClick={() => setActiveCopy("mine")}
        >
          Your draft
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCopy === "latest"}
          onClick={() => setActiveCopy("latest")}
        >
          Latest saved
        </button>
      </div>

      <div className="content-script-conflict-copies">
        <section data-active={activeCopy === "mine"}>
          <header>
            <strong>Your draft</strong>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(localText)}
            >
              <Copy aria-hidden="true" /> Copy
            </button>
          </header>
          <div className="content-script-conflict-document">
            {localEditor && scriptHasContent(localDocument) ? (
              <EditorContent editor={localEditor} />
            ) : (
              <p>Empty script</p>
            )}
          </div>
        </section>
        <section data-active={activeCopy === "latest"}>
          <header>
            <strong>Latest saved</strong>
            <div>
              <time dateTime={latest.savedAt ?? undefined}>
                {latest.savedAt
                  ? new Date(latest.savedAt).toLocaleString()
                  : "Save time unavailable"}
              </time>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(latestText)}
              >
                <Copy aria-hidden="true" /> Copy
              </button>
            </div>
          </header>
          <div className="content-script-conflict-document">
            {latestEditor && scriptHasContent(latest.document) ? (
              <EditorContent editor={latestEditor} />
            ) : (
              <p>Empty script</p>
            )}
          </div>
        </section>
      </div>

      <footer className="content-script-dialog-actions">
        <button
          type="button"
          className="content-script-action content-script-action--quiet"
          onClick={onUseLatest}
          disabled={pending}
        >
          <RefreshCw aria-hidden="true" /> Use latest saved
        </button>
        <button
          type="button"
          className="content-script-action content-script-action--primary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await onKeepLocal();
            setPending(false);
          }}
        >
          {pending ? "Saving your draft…" : "Continue with your draft"}
        </button>
      </footer>
    </dialog>
  );
}
