"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { FileInput, ImageIcon, Keyboard, Link2, Trash2, X } from "lucide-react";
import { isScriptLinkAllowed } from "@/features/content/scripts/utils/content-script-url.util";
import type { ScriptImportResult } from "@/features/content/scripts/types/content-script.types";

function ContentScriptDialogShell({
  children,
  description,
  eyebrow,
  icon,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `content-script-dialog-${eyebrow.toLowerCase().replaceAll(" ", "-")}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="content-script-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <header className="content-script-dialog-heading">
        <span className="content-script-dialog-symbol" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="content-script-dialog-close"
          aria-label={`Close ${eyebrow.toLowerCase()}`}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function ContentScriptLinkDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [href, setHref] = useState(
    String(editor.getAttributes("link").href ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const linked = editor.isActive("link");

  return (
    <ContentScriptDialogShell
      eyebrow="Link"
      title={linked ? "Edit this link." : "Give these words a destination."}
      description="Use an http, https, or email address."
      icon={<Link2 />}
      onClose={onClose}
    >
      <form
        className="content-script-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = normalizeLink(href);
          if (!normalized || !isScriptLinkAllowed(normalized)) {
            setError("Enter an http, https, or mailto address.");
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: normalized })
            .run();
          onClose();
        }}
      >
        <label>
          <span>Address</span>
          <input
            autoFocus
            type="text"
            inputMode="url"
            value={href}
            placeholder="https://…"
            onChange={(event) => {
              setHref(event.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error && (
          <p className="content-script-dialog-error" role="alert">
            {error}
          </p>
        )}
        <footer className="content-script-dialog-actions">
          {linked && (
            <button
              type="button"
              className="content-script-action content-script-action--quiet"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                onClose();
              }}
            >
              Remove link
            </button>
          )}
          <button
            type="submit"
            className="content-script-action content-script-action--primary"
          >
            {linked ? "Update link" : "Add link"}
          </button>
        </footer>
      </form>
    </ContentScriptDialogShell>
  );
}

type ScriptImageAttributes = {
  alt: string;
  caption: string;
  decorative: boolean;
  size: "small" | "medium" | "full";
  textAlign: "left" | "center" | "right";
};

export function ContentScriptImageDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const existing = editor.getAttributes("image");
  const [attributes, setAttributes] = useState<ScriptImageAttributes>({
    alt: String(existing.alt ?? ""),
    caption: String(existing.caption ?? ""),
    decorative: Boolean(existing.decorative),
    size: ["small", "medium", "full"].includes(existing.size)
      ? existing.size
      : "full",
    textAlign: ["left", "center", "right"].includes(existing.textAlign)
      ? existing.textAlign
      : "center",
  });
  const [error, setError] = useState<string | null>(null);

  function update<Key extends keyof ScriptImageAttributes>(
    key: Key,
    value: ScriptImageAttributes[Key],
  ) {
    setAttributes((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  return (
    <ContentScriptDialogShell
      eyebrow="Image"
      title="Let the image belong to the page."
      description="Describe its meaning, then choose how much space it needs."
      icon={<ImageIcon />}
      onClose={onClose}
    >
      <form
        className="content-script-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!attributes.decorative && !attributes.alt.trim()) {
            setError("Describe the image or mark it as decorative.");
            return;
          }
          editor
            .chain()
            .focus()
            .updateAttributes("image", {
              ...attributes,
              alt: attributes.decorative ? "" : attributes.alt.trim(),
              caption: attributes.caption.trim(),
            })
            .run();
          onClose();
        }}
      >
        <label>
          <span>Image description</span>
          <textarea
            autoFocus
            value={attributes.alt}
            disabled={attributes.decorative}
            placeholder="What does this image show?"
            onChange={(event) => update("alt", event.target.value)}
            maxLength={2000}
          />
        </label>
        <label className="content-script-check-row">
          <input
            type="checkbox"
            checked={attributes.decorative}
            onChange={(event) => update("decorative", event.target.checked)}
          />
          <span>Decorative image</span>
        </label>
        <label>
          <span>Caption</span>
          <textarea
            value={attributes.caption}
            placeholder="Optional context beneath the image"
            onChange={(event) => update("caption", event.target.value)}
            maxLength={6000}
          />
        </label>
        <div className="content-script-dialog-choice-grid">
          <fieldset>
            <legend>Size</legend>
            {(["small", "medium", "full"] as const).map((size) => (
              <label key={size}>
                <input
                  type="radio"
                  name="image-size"
                  checked={attributes.size === size}
                  onChange={() => update("size", size)}
                />
                <span>{size[0].toUpperCase() + size.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Position</legend>
            {(["left", "center", "right"] as const).map((alignment) => (
              <label key={alignment}>
                <input
                  type="radio"
                  name="image-alignment"
                  checked={attributes.textAlign === alignment}
                  onChange={() => update("textAlign", alignment)}
                />
                <span>{alignment[0].toUpperCase() + alignment.slice(1)}</span>
              </label>
            ))}
          </fieldset>
        </div>
        {error && (
          <p className="content-script-dialog-error" role="alert">
            {error}
          </p>
        )}
        <footer className="content-script-dialog-actions">
          <button
            type="button"
            className="content-script-action content-script-action--danger"
            onClick={() => {
              editor.chain().focus().deleteSelection().run();
              onClose();
            }}
          >
            <Trash2 aria-hidden="true" /> Remove image
          </button>
          <button
            type="submit"
            className="content-script-action content-script-action--primary"
          >
            Apply image details
          </button>
        </footer>
      </form>
    </ContentScriptDialogShell>
  );
}

export function ContentScriptImportDialog({
  error,
  fileName,
  hasContent,
  result,
  onAdd,
  onClose,
  onReplace,
}: {
  error?: string | null;
  fileName: string;
  hasContent: boolean;
  result: ScriptImportResult;
  onAdd: () => void;
  onClose: () => void;
  onReplace: () => void;
}) {
  return (
    <ContentScriptDialogShell
      eyebrow="Import"
      title={
        hasContent ? "Choose where this document begins." : "Document ready."
      }
      description={`${fileName} has been shaped to match Become.`}
      icon={<FileInput />}
      onClose={onClose}
    >
      {result.warnings.length > 0 && (
        <div className="content-script-import-warnings" role="status">
          <strong>Changed during import</strong>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p className="content-script-import-error" role="alert">
          {error}
        </p>
      )}
      <footer className="content-script-dialog-actions">
        {hasContent && (
          <button
            type="button"
            className="content-script-action content-script-action--quiet"
            onClick={onAdd}
          >
            Add at cursor
          </button>
        )}
        <button
          type="button"
          className="content-script-action content-script-action--primary"
          onClick={onReplace}
        >
          {hasContent ? "Replace script" : "Use document"}
        </button>
      </footer>
    </ContentScriptDialogShell>
  );
}

const SCRIPT_SHORTCUTS = [
  ["Save", "Ctrl / ⌘ + S"],
  ["Find", "Ctrl / ⌘ + F"],
  ["Find and replace", "Ctrl / ⌘ + Shift + H"],
  ["Add or edit link", "Ctrl / ⌘ + K"],
  ["Bold", "Ctrl / ⌘ + B"],
  ["Italic", "Ctrl / ⌘ + I"],
  ["Underline", "Ctrl / ⌘ + U"],
  ["Undo", "Ctrl / ⌘ + Z"],
  ["Redo", "Ctrl + Y / ⌘ + Shift + Z"],
  ["Focus the tool rail", "Alt + F10"],
] as const;

export function ContentScriptShortcutsDialog({
  onClose,
  readOnly,
}: {
  onClose: () => void;
  readOnly: boolean;
}) {
  return (
    <ContentScriptDialogShell
      eyebrow="Shortcuts"
      title="Keep your hands in the work."
      description={
        readOnly
          ? "Available shortcuts for this archived script."
          : "These shortcuts work anywhere in the script editor."
      }
      icon={<Keyboard />}
      onClose={onClose}
    >
      <dl className="content-script-shortcuts">
        {SCRIPT_SHORTCUTS.filter(
          ([action]) => !readOnly || action !== "Find and replace",
        ).map(([action, shortcut]) => (
          <div key={action}>
            <dt>{action}</dt>
            <dd>
              <kbd>{shortcut}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </ContentScriptDialogShell>
  );
}
