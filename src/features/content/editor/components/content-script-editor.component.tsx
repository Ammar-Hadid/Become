"use client";

import { Card } from "@/components/ui/cards/card.component";
import { Button } from "@/components/ui/buttons/button.component";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Editor as TiptapEditor } from "@tiptap/core";
import { FindAndReplace } from "@tiptap/extension-find-and-replace";
import { Placeholder } from "@tiptap/extensions";
import { ArrowLeft, CircleAlert, FileCheck2, Info, Save } from "lucide-react";
import { getScriptExtensions } from "@/features/content/scripts/config/content-script-editor.config";
import {
  scriptHasContent,
  scriptPlainText,
  scriptWordCount,
  validateScriptDocument,
} from "@/features/content/scripts/utils/content-script-document.util";
import type {
  ContentScriptView,
  OwnedScriptImage,
  ScriptDocument,
  ScriptImportResult,
  ScriptSaveRequest,
  ScriptSaveResult,
} from "@/features/content/scripts/types/content-script.types";
import { ContentScriptConflict } from "@/features/content/editor/components/content-script-conflict.component";
import { ContentScriptBlockControls } from "@/features/content/editor/components/content-script-block-controls.component";
import {
  ContentScriptImageDialog,
  ContentScriptImportDialog,
  ContentScriptLinkDialog,
  ContentScriptShortcutsDialog,
} from "@/features/content/editor/components/content-script-dialogs.component";
import { ContentScriptFindReplace } from "@/features/content/editor/components/content-script-find-replace.component";
import { ContentScriptSaveState } from "@/features/content/editor/components/content-script-save-state.component";
import { DocumentEditorToolbar } from "@/components/ui/document-editor/components/document-editor-toolbar.component";
import { addScriptRowAbove } from "@/features/content/editor/utils/content-script-table.util";
import { useContentScriptAutosave } from "@/features/content/editor/hooks/content-script-autosave.hook";
import { useContentScriptNavigationGuard } from "@/features/content/editor/hooks/content-script-navigation-guard.hook";
import { DocumentEditorStage } from "@/components/ui/document-editor/components/document-editor-stage.component";
import { DocumentEditorGuide } from "@/components/ui/document-editor/components/document-editor-guide.component";

type EditorDialog = "image" | "link" | "shortcuts" | null;

type EditorNotice = {
  tone: "error" | "info" | "warning";
  text: string;
};

function operationKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export function ContentScriptEditor({
  initialData,
  onSave,
  onUploadImage,
  onImportDocument,
  onExportDocument,
}: {
  initialData: ContentScriptView;
  onSave: (request: ScriptSaveRequest) => Promise<ScriptSaveResult>;
  onUploadImage: (
    file: File,
    operationKey: string,
    signal?: AbortSignal,
  ) => Promise<OwnedScriptImage>;
  onImportDocument: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<ScriptImportResult>;
  onExportDocument: (
    document: ScriptDocument,
    format: "docx" | "txt",
  ) => Promise<{ blob: Blob; filename: string }>;
}) {
  const [scriptDocument, setScriptDocument] = useState(initialData.document);
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [replaceInitiallyOpen, setReplaceInitiallyOpen] = useState(false);
  const [dismissedConflictVersion, setDismissedConflictVersion] = useState<
    number | null
  >(null);
  const [notice, setNotice] = useState<EditorNotice | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [failedUpload, setFailedUpload] = useState<{
    file: File;
    operationKey: string;
    position?: number;
  } | null>(null);
  const [importCandidate, setImportCandidate] = useState<{
    fileName: string;
    result: ScriptImportResult;
  } | null>(null);
  const [importApplyError, setImportApplyError] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const manuscriptRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const operationAbortRef = useRef<AbortController | null>(null);
  const uploadRef = useRef<(file: File, position?: number) => void>(() => {});
  const noticeRef = useRef<(notice: EditorNotice) => void>(() => {});

  const extensions = useMemo(
    () => [
      ...getScriptExtensions(),
      FindAndReplace.configure({ injectCSS: false }),
      Placeholder.configure({
        placeholder: "Start with the line that earns attention.",
      }),
    ],
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: initialData.document.content,
    editable: !initialData.readOnly,
    editorProps: {
      attributes: {
        class: "content-script-prose document-editor-prose",
        role: "textbox",
        "aria-label": "Script body",
        "aria-multiline": "true",
        "aria-readonly": initialData.readOnly ? "true" : "false",
        spellcheck: "true",
      },
      handlePaste(_view, event) {
        const image = Array.from(event.clipboardData?.files ?? []).find(
          (file) => file.type.startsWith("image/"),
        );
        if (image) {
          event.preventDefault();
          uploadRef.current(image);
          return true;
        }

        const html = event.clipboardData?.getData("text/html") ?? "";
        if (/<img[\s>]/i.test(html)) {
          noticeRef.current({
            tone: "info",
            text: "Images pasted from another app were left out. Download the image, then add it with Insert → Image so Become can keep it with this variant.",
          });
        }
        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const image = Array.from(event.dataTransfer?.files ?? []).find((file) =>
          file.type.startsWith("image/"),
        );
        if (!image) return false;
        event.preventDefault();
        const position = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        uploadRef.current(image, position);
        return true;
      },
    },
    onUpdate({ editor: current }) {
      setScriptDocument({ schemaVersion: 1, content: current.getJSON() });
    },
  });

  const autosave = useContentScriptAutosave({
    initialData,
    document: scriptDocument,
    enabled: !initialData.readOnly,
    onSave,
  });

  useEffect(() => {
    noticeRef.current = setNotice;
  }, []);

  const insertOwnedImage = useCallback(
    (image: OwnedScriptImage, position?: number) => {
      if (!editor) return;
      let chain = editor.chain().focus();
      if (typeof position === "number") {
        chain = chain.setTextSelection(
          Math.min(position, editor.state.doc.content.size),
        );
      }
      chain
        .insertContent({
          type: "image",
          attrs: {
            src: image.url,
            mediaId: image.id,
            alt: "",
            title: null,
            caption: "",
            size: "full",
            textAlign: "center",
            decorative: false,
          },
        })
        .run();

      let imagePosition: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.mediaId === image.id) {
          imagePosition = pos;
          return false;
        }
        return true;
      });
      if (imagePosition !== null)
        editor.commands.setNodeSelection(imagePosition);
      setDialog("image");
    },
    [editor],
  );

  const uploadImage = useCallback(
    async (file: File, position?: number, retryOperationKey?: string) => {
      if (!editor || initialData.readOnly || activity) return;
      const controller = new AbortController();
      const uploadOperationKey =
        retryOperationKey ?? operationKey("script-image");
      operationAbortRef.current = controller;
      setFailedUpload(null);
      setActivity("Bringing image into Become…");
      setNotice(null);
      try {
        const image = await onUploadImage(
          file,
          uploadOperationKey,
          controller.signal,
        );
        insertOwnedImage(image, position);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setFailedUpload({
          file,
          operationKey: uploadOperationKey,
          ...(typeof position === "number" ? { position } : {}),
        });
        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Become could not add that image.",
        });
      } finally {
        if (operationAbortRef.current === controller)
          operationAbortRef.current = null;
        setActivity(null);
      }
    },
    [activity, editor, initialData.readOnly, insertOwnedImage, onUploadImage],
  );

  useEffect(() => {
    uploadRef.current = (file, position) => void uploadImage(file, position);
  }, [uploadImage]);

  const flushBeforeNavigation = useCallback(async () => {
    if (activity) {
      setNotice({
        tone: "warning",
        text: "Wait for the current document action to finish before leaving.",
      });
      return false;
    }
    const saved = await autosave.flush();
    if (!saved && autosave.conflict) setDismissedConflictVersion(null);
    return saved;
  }, [activity, autosave]);

  useContentScriptNavigationGuard({
    flush: flushBeforeNavigation,
    isBlocking: autosave.isBlocking || Boolean(activity),
  });

  useEffect(
    () => () => {
      operationAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    const handleShortcut = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushBeforeNavigation().then((saved) => {
          if (!saved && autosave.conflict) setDismissedConflictVersion(null);
        });
        return;
      }
      if (modifier && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setReplaceInitiallyOpen(false);
        setFindOpen(true);
        return;
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        setReplaceInitiallyOpen(!initialData.readOnly);
        setFindOpen(true);
        return;
      }
      if (
        modifier &&
        event.key.toLowerCase() === "k" &&
        editor.isFocused &&
        !initialData.readOnly
      ) {
        event.preventDefault();
        setDialog("link");
        return;
      }
      if (event.altKey && event.key === "F10") {
        event.preventDefault();
        toolbarRef.current
          ?.querySelector<HTMLButtonElement>(
            "[data-editor-tool]:not(:disabled)",
          )
          ?.focus();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [autosave.conflict, editor, flushBeforeNavigation, initialData.readOnly]);

  const wordCount = useMemo(
    () => scriptWordCount(scriptDocument),
    [scriptDocument],
  );
  const characterCount = useMemo(
    () => scriptPlainText(scriptDocument).length,
    [scriptDocument],
  );

  async function importDocument(file: File) {
    if (activity) return;
    const controller = new AbortController();
    operationAbortRef.current = controller;
    setActivity("Reading document…");
    setNotice(null);
    try {
      const result = await onImportDocument(file, controller.signal);
      validateScriptDocument(result.document);
      setImportApplyError(null);
      setImportCandidate({ fileName: file.name, result });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Become could not read that document.",
      });
    } finally {
      if (operationAbortRef.current === controller)
        operationAbortRef.current = null;
      setActivity(null);
    }
  }

  async function exportDocument(format: "docx" | "txt") {
    if (activity) return;
    setActivity(
      format === "docx" ? "Preparing Word file…" : "Preparing text file…",
    );
    setNotice(null);
    try {
      const result = await onExportDocument(scriptDocument, format);
      saveBlob(result.blob, result.filename);
      setNotice({
        tone: "info",
        text: `${result.filename} is ready in your downloads.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Become could not prepare that download.",
      });
    } finally {
      setActivity(null);
    }
  }

  function applyImport(mode: "add" | "replace") {
    if (!editor || !importCandidate) return;
    const content = importCandidate.result.document.content;
    const importedBlocks = content.content?.length
      ? content.content
      : [{ type: "paragraph" }];

    try {
      if (mode === "add") {
        const preview = new TiptapEditor({
          editable: false,
          extensions: getScriptExtensions(),
          content: scriptDocument.content,
        });
        try {
          preview.commands.setTextSelection({
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          });
          const inserted = preview.chain().insertContent(importedBlocks).run();
          if (!inserted)
            throw new Error("Choose a different place for this import.");
          validateScriptDocument({
            schemaVersion: 1,
            content: preview.getJSON(),
          });
        } finally {
          preview.destroy();
        }
      } else {
        validateScriptDocument(importCandidate.result.document);
      }
    } catch (error) {
      setImportApplyError(
        error instanceof Error
          ? error.message
          : "This import would make the script too large.",
      );
      return;
    }

    if (mode === "replace") {
      editor.chain().focus().selectAll().insertContent(importedBlocks).run();
    } else {
      editor.chain().focus().insertContent(importedBlocks).run();
    }
    setImportApplyError(null);
    setImportCandidate(null);
    setNotice({
      tone: "info",
      text:
        mode === "replace"
          ? "The imported document is now your script."
          : "The imported document was added at your cursor.",
    });
  }

  function openFind(replace: boolean) {
    setReplaceInitiallyOpen(replace);
    setFindOpen(true);
  }

  function useLatestConflict() {
    const latest = autosave.acceptLatest();
    if (!latest || !editor) return;
    setScriptDocument(latest.document);
    editor.commands.setContent(latest.document.content, { emitUpdate: false });
    setDismissedConflictVersion(null);
    setNotice({ tone: "info", text: "The latest saved script is open." });
  }

  const saveAttention =
    autosave.status === "error" || autosave.status === "conflict";

  return (
    <section
      className="content-script-editor"
      aria-label={`${initialData.contentTitle} script editor`}
      aria-busy={activity ? "true" : undefined}
    >
      <Card
        as="div"
        material="glass"
        spacing="dense"
        className="content-script-chrome"
      >
        <div className="content-script-identity">
          <Link
            href={initialData.returnHref}
            className="content-script-back"
            data-content-script-back=""
            aria-label={`Back to ${initialData.contentTitle}`}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="content-script-title">
            <p className="eyebrow">Script</p>
            <h1>{initialData.contentTitle}</h1>
            <p className="content-script-variant">
              <span>Variant</span> {initialData.variantName}
            </p>
          </div>
          <div className="content-script-document-meta">
            <span className="content-script-count">
              {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
              {characterCount >= 108_000 && (
                <> · {characterCount.toLocaleString()} characters</>
              )}
            </span>
            <ContentScriptSaveState
              activity={activity}
              readOnly={initialData.readOnly}
              savedAt={autosave.savedAt}
              status={autosave.status}
            />
            {!initialData.readOnly && (
              <Button
                type="button"
                variant="secondary"
                className="content-script-save-action"
                data-attention={saveAttention ? "true" : undefined}
                disabled={autosave.status === "saving" || Boolean(activity)}
                onClick={() =>
                  void flushBeforeNavigation().then((saved) => {
                    if (!saved && autosave.conflict)
                      setDismissedConflictVersion(null);
                  })
                }
              >
                <Save aria-hidden="true" />
                <span>Save</span>
                <kbd>⌘S</kbd>
              </Button>
            )}
          </div>
        </div>

        {editor && (
          <div ref={toolbarRef} className="content-script-instrument-rail">
            <DocumentEditorToolbar
              editor={editor}
              readOnly={initialData.readOnly}
              mode="full"
              documentName="Script"
              onAddRowAbove={() =>
                editor.chain().focus().command(addScriptRowAbove).run()
              }
              onEditImage={() => setDialog("image")}
              onEditLink={() => setDialog("link")}
              onExport={(format) => void exportDocument(format)}
              onFind={openFind}
              onImport={() => importInputRef.current?.click()}
              onInsertImage={() => imageInputRef.current?.click()}
              onPrint={() => window.print()}
              onShortcuts={() => setDialog("shortcuts")}
              wordCount={wordCount}
            />
          </div>
        )}

        {editor && findOpen && (
          <ContentScriptFindReplace
            key={replaceInitiallyOpen ? "replace" : "find"}
            editor={editor}
            replaceInitiallyOpen={replaceInitiallyOpen}
            onClose={() => setFindOpen(false)}
          />
        )}
      </Card>

      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadImage(file);
        }}
      />
      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importDocument(file);
        }}
      />

      {(notice || activity || autosave.message) && (
        <div
          className="content-script-message"
          data-tone={
            autosave.status === "error" || saveAttention
              ? "error"
              : (notice?.tone ?? "info")
          }
          role={
            autosave.status === "error" || notice?.tone === "error"
              ? "alert"
              : "status"
          }
        >
          <span aria-hidden="true">
            {autosave.status === "error" || saveAttention ? (
              <CircleAlert />
            ) : activity ? (
              <FileCheck2 />
            ) : (
              <Info />
            )}
          </span>
          <p>{autosave.message ?? activity ?? notice?.text}</p>
          {autosave.status === "error" && (
            <button type="button" onClick={() => void autosave.retry()}>
              Retry save
            </button>
          )}
          {autosave.conflict && (
            <button
              type="button"
              onClick={() => setDismissedConflictVersion(null)}
            >
              Compare drafts
            </button>
          )}
          {failedUpload && (
            <button
              type="button"
              onClick={() =>
                void uploadImage(
                  failedUpload.file,
                  failedUpload.position,
                  failedUpload.operationKey,
                )
              }
            >
              Retry image
            </button>
          )}
        </div>
      )}

      {initialData.readOnly && (
        <div className="content-script-readonly" role="note">
          This variant is archived. Its script is open for reading and export.
        </div>
      )}

      <DocumentEditorStage
        label="Script document"
        className="content-script-document-stage"
        canvasClassName="content-script-manuscript"
        canvasRef={manuscriptRef}
      >
        <DocumentEditorGuide editor={editor} containerRef={manuscriptRef} />
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="content-script-loading" role="status">
            Opening script…
          </div>
        )}
        {editor && !initialData.readOnly && (
          <ContentScriptBlockControls
            editor={editor}
            containerRef={manuscriptRef}
            onEditImage={() => setDialog("image")}
          />
        )}
      </DocumentEditorStage>

      {editor && dialog === "link" && (
        <ContentScriptLinkDialog
          editor={editor}
          onClose={() => setDialog(null)}
        />
      )}
      {editor && dialog === "image" && editor.isActive("image") && (
        <ContentScriptImageDialog
          editor={editor}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "shortcuts" && (
        <ContentScriptShortcutsDialog
          readOnly={initialData.readOnly}
          onClose={() => setDialog(null)}
        />
      )}
      {editor && importCandidate && (
        <ContentScriptImportDialog
          fileName={importCandidate.fileName}
          result={importCandidate.result}
          error={importApplyError}
          hasContent={scriptHasContent(scriptDocument)}
          onAdd={() => applyImport("add")}
          onReplace={() => applyImport("replace")}
          onClose={() => {
            setImportCandidate(null);
            setImportApplyError(null);
          }}
        />
      )}
      {autosave.conflict &&
        dismissedConflictVersion !== autosave.conflict.scriptVersion && (
          <ContentScriptConflict
            localDocument={scriptDocument}
            latest={autosave.conflict}
            message={autosave.message}
            onCancel={() =>
              setDismissedConflictVersion(
                autosave.conflict?.scriptVersion ?? null,
              )
            }
            onKeepLocal={async () => {
              const saved = await autosave.keepLocal();
              if (saved) setDismissedConflictVersion(null);
            }}
            onUseLatest={useLatestConflict}
          />
        )}
    </section>
  );
}
