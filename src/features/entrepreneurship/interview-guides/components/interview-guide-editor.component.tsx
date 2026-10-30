"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Archive, Copy, Eye, MoreHorizontal, Save, Send } from "lucide-react";
import { DocumentEditorStage } from "@/components/ui/document-editor/components/document-editor-stage.component";
import { useDocumentAutosave } from "@/components/ui/document-editor/hooks/document-autosave.hook";
import { useDocumentNavigationGuard } from "@/components/ui/document-editor/hooks/document-navigation-guard.hook";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import {
  archiveInterviewGuideAction,
  duplicateInterviewGuideAction,
  publishInterviewGuideAction,
  saveInterviewGuideDraftAction,
} from "@/features/entrepreneurship/interview-guides/actions/interview-guide.action";
import { InterviewGuideToolbar } from "@/features/entrepreneurship/interview-guides/components/interview-guide-toolbar.component";
import { getInterviewGuideEditorExtensions } from "@/features/entrepreneurship/interview-guides/config/interview-guide-editor.config";
import type {
  InterviewGuideDocument,
  InterviewGuideDraftView,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import {
  interviewGuideHasContent,
  interviewGuideQuestionIndex,
  validateInterviewGuideDocument,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

type GuideEditorData = {
  id: string;
  nicheId: string;
  title: string;
  objective: string;
  marketType: "B2C" | "B2B";
  segmentId: string | null;
  segmentName: string | null;
  expectedDurationMinutes: number;
  version: number;
  savedAt: string;
  archived: boolean;
  document: InterviewGuideDocument;
  publishedVersion: number | null;
};

type GuideEditorDocument = {
  metadata: {
    title: string;
    objective: string;
    marketType: "B2C" | "B2B";
    segmentId: string;
    expectedDurationMinutes: number;
  };
  content: InterviewGuideDocument;
};

type GuideDocumentView = {
  document: GuideEditorDocument;
  version: number;
  savedAt: string | null;
};

function editorDocumentFromDraft(
  guide: InterviewGuideDraftView,
): GuideEditorDocument {
  return {
    metadata: {
      title: guide.title,
      objective: guide.objective,
      marketType: guide.marketType as "B2C" | "B2B",
      segmentId: guide.segmentId ?? "",
      expectedDurationMinutes: guide.expectedDurationMinutes,
    },
    content: validateInterviewGuideDocument(guide.draftDocument),
  };
}

function guideHref(nicheId: string, suffix = "") {
  return explorationHref(nicheId, `/conversations/guides${suffix}`);
}

function serializeEditorContent(
  content: InterviewGuideDocument["content"],
): InterviewGuideDocument["content"] {
  return JSON.parse(
    JSON.stringify(content),
  ) as InterviewGuideDocument["content"];
}

export function InterviewGuideEditor({
  initial,
  segments,
}: {
  initial: GuideEditorData;
  segments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const exploration = useExploration();
  const [metadata, setMetadata] = useState({
    title: initial.title,
    objective: initial.objective,
    marketType: initial.marketType,
    segmentId: initial.segmentId ?? "",
    expectedDurationMinutes: initial.expectedDurationMinutes,
  });
  const [content, setContent] = useState(initial.document);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const readOnly = initial.archived || Boolean(exploration?.archived);
  const extensions = useMemo(() => getInterviewGuideEditorExtensions(), []);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions,
    content: initial.document.content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "interview-guide-prose",
        role: "textbox",
        "aria-label": "Interview guide document",
        "aria-multiline": "true",
        "aria-readonly": readOnly ? "true" : "false",
        spellcheck: "true",
      },
    },
    onUpdate({ editor: current }) {
      setContent({
        schemaVersion: 1,
        content: serializeEditorContent(current.getJSON()),
      });
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const editorDocument = useMemo<GuideEditorDocument>(
    () => ({ metadata, content }),
    [content, metadata],
  );
  const initialView = useMemo<GuideDocumentView>(
    () => ({
      document: {
        metadata: {
          title: initial.title,
          objective: initial.objective,
          marketType: initial.marketType,
          segmentId: initial.segmentId ?? "",
          expectedDurationMinutes: initial.expectedDurationMinutes,
        },
        content: initial.document,
      },
      version: initial.version,
      savedAt: initial.savedAt,
    }),
    [initial],
  );
  const save = useCallback(
    async (request: {
      document: GuideEditorDocument;
      expectedVersion: number;
      operationKey: string;
    }) => {
      const result = await saveInterviewGuideDraftAction(
        initial.id,
        request.operationKey,
        {
          nicheId: initial.nicheId,
          title: request.document.metadata.title,
          objective: request.document.metadata.objective,
          marketType: request.document.metadata.marketType,
          segmentId: request.document.metadata.segmentId || null,
          expectedDurationMinutes:
            request.document.metadata.expectedDurationMinutes,
          expectedVersion: request.expectedVersion,
          document: request.document.content,
        },
      );
      if (result.kind === "saved") {
        return {
          kind: "saved" as const,
          view: {
            document: request.document,
            version: result.guide.version,
            savedAt: result.guide.savedAt,
          },
        };
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict" as const,
          message: result.message,
          latest: {
            document: editorDocumentFromDraft(result.latest),
            version: result.latest.version,
            savedAt: result.latest.savedAt,
          },
        };
      }
      return result;
    },
    [initial.id, initial.nicheId],
  );
  const autosave = useDocumentAutosave({
    initialData: initialView,
    document: editorDocument,
    enabled: !readOnly,
    onSave: save,
  });
  useDocumentNavigationGuard({
    flush: autosave.flush,
    isBlocking: autosave.isBlocking,
    historyKey: "__becomeInterviewGuideGuard",
  });

  const questions = interviewGuideQuestionIndex(content);
  const meaningful = interviewGuideHasContent(content);
  const savedLabel =
    autosave.status === "saving"
      ? "Saving…"
      : autosave.status === "dirty"
        ? "Unsaved changes"
        : autosave.status === "error"
          ? "Save needs attention"
          : autosave.status === "conflict"
            ? "Draft conflict"
            : autosave.savedAt
              ? `Saved ${new Date(autosave.savedAt).toLocaleDateString()}`
              : "Saved";

  return (
    <section
      className="interview-guide-editor"
      data-read-only={readOnly || undefined}
    >
      <header className="interview-guide-editor-header">
        <div className="interview-guide-editor-heading">
          <Link href={guideHref(initial.nicheId)}>← All guides</Link>
          <p className="eyebrow">Interview guide · {metadata.marketType}</p>
          <Input
            aria-label="Guide title"
            value={metadata.title}
            disabled={readOnly}
            onChange={(event) =>
              setMetadata((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
        </div>
        <div className="interview-guide-editor-actions">
          <span
            className="interview-guide-save-state"
            data-status={autosave.status}
            role="status"
          >
            {savedLabel}
          </span>
          <Button
            variant="secondary"
            type="button"
            className="interview-guide-details-trigger"
            aria-expanded={detailsOpen}
            aria-controls="interview-guide-details"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            Guide details
          </Button>
          <Link
            className="become-button become-button--secondary become-button--md"
            href={guideHref(initial.nicheId, `/${initial.id}/preview`)}
          >
            <Eye aria-hidden="true" /> Preview
          </Link>
          {!readOnly && (
            <Button
              variant="primary"

              type="button"
              onClick={() => void autosave.flush()}
              disabled={
                !autosave.dirty ||
                autosave.status === "saving" ||
                Boolean(autosave.conflict)
              }
            >
              <Save aria-hidden="true" /> Save draft
            </Button>
          )}
          <SubMenu
            label="Guide actions"
            placement="bottom-end"
            trigger={(props) => (
              <Button variant="ghost" size="icon" {...props}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            )}
          >
            {!exploration?.archived && (
              <>
                <MenuItem
                  icon={<Copy aria-hidden="true" />}
                  onSelect={async () => {
                    const result = await duplicateInterviewGuideAction(
                      initial.id,
                      crypto.randomUUID(),
                    );
                    if (result.id)
                      router.push(
                        guideHref(initial.nicheId, `/${result.id}/edit`),
                      );
                  }}
                >
                  Duplicate
                </MenuItem>
                <MenuItem
                  icon={<Archive aria-hidden="true" />}
                  onSelect={async () => {
                    await archiveInterviewGuideAction(
                      initial.id,
                      crypto.randomUUID(),
                      !initial.archived,
                    );
                    router.refresh();
                  }}
                >
                  {initial.archived ? "Restore" : "Archive"}
                </MenuItem>
              </>
            )}
          </SubMenu>
        </div>
      </header>

      {(autosave.message || actionMessage) && (
        <div
          className="interview-guide-editor-message"
          role={autosave.status === "error" ? "alert" : "status"}
        >
          <p>{autosave.message ?? actionMessage}</p>
          {autosave.status === "error" && (
            <button type="button" onClick={() => void autosave.retry()}>
              Retry save
            </button>
          )}
        </div>
      )}

      {autosave.conflict && (
        <section
          className="interview-guide-conflict"
          role="alertdialog"
          aria-labelledby="guide-conflict-title"
        >
          <div>
            <p className="eyebrow">Version conflict</p>
            <h2 id="guide-conflict-title">This guide changed elsewhere.</h2>
            <p>
              Your complete local document is still here. Review the versions,
              then choose which one should become the current draft.
            </p>
          </div>
          <div className="interview-guide-conflict-comparison">
            <article>
              <span>Your local draft</span>
              <strong>{metadata.title}</strong>
              <p>{questions.length} optional questions</p>
            </article>
            <article>
              <span>Latest saved copy</span>
              <strong>{autosave.conflict.document.metadata.title}</strong>
              <p>
                {
                  interviewGuideQuestionIndex(
                    autosave.conflict.document.content,
                  ).length
                }{" "}
                optional questions · version {autosave.conflict.version}
              </p>
            </article>
          </div>
          <div className="business-actions">
            <Button
              variant="secondary"
              type="button"

              onClick={() => {
                const accepted = autosave.acceptLatest();
                if (!accepted) return;
                setMetadata(accepted.document.metadata);
                setContent(accepted.document.content);
                editor?.commands.setContent(accepted.document.content.content);
              }}
            >
              Use latest copy
            </Button>
            <Button
              variant="primary"
              type="button"

              onClick={() => void autosave.keepLocal()}
            >
              Keep my local draft
            </Button>
          </div>
        </section>
      )}

      {readOnly && (
        <div className="interview-guide-readonly" role="note">
          {exploration?.archived
            ? "This exploration is archived. The guide remains readable as a historical record."
            : "This guide is archived. Restore it from Guide actions to edit or publish again."}
        </div>
      )}

      <div className="interview-guide-editor-layout">
        <aside
          id="interview-guide-details"
          className="interview-guide-metadata"
          data-open={detailsOpen || undefined}
          aria-hidden={!detailsOpen}
          inert={!detailsOpen ? true : undefined}
          aria-label="Guide details"
        >
          <header>
            <div>
              <p className="eyebrow">Guide details</p>
              <h2>Conversation context</h2>
            </div>
            <button
              type="button"
              aria-label="Close guide details"
              onClick={() => setDetailsOpen(false)}
            >
              ×
            </button>
          </header>
          <label>
            Objective
            <Textarea
              value={metadata.objective}
              disabled={readOnly}
              onChange={(event) =>
                setMetadata((current) => ({
                  ...current,
                  objective: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Market
            <NativeSelect
              value={metadata.marketType}
              disabled={readOnly}
              onChange={(event) =>
                setMetadata((current) => ({
                  ...current,
                  marketType: event.target.value as "B2C" | "B2B",
                }))
              }
            >
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
            </NativeSelect>
          </label>
          <BusinessRecordPicker
            kind="segment"
            label="Segment"
            name="segmentId"
            nicheId={initial.nicheId}
            options={
              initial.segmentId &&
              initial.segmentName &&
              !segments.some((segment) => segment.id === initial.segmentId)
                ? [
                    { id: initial.segmentId, name: initial.segmentName },
                    ...segments,
                  ]
                : segments
            }
            value={metadata.segmentId}
            placeholder="Any relevant segment"
            disabled={readOnly}
            onValueChange={(segmentId) =>
              setMetadata((current) => ({ ...current, segmentId }))
            }
          />
          <label>
            Expected minutes
            <Input
              type="number"
              min={5}
              max={240}
              value={metadata.expectedDurationMinutes}
              disabled={readOnly}
              onChange={(event) =>
                setMetadata((current) => ({
                  ...current,
                  expectedDurationMinutes: Number(event.target.value),
                }))
              }
            />
          </label>
          <div className="interview-guide-revision-summary">
            <span>Draft version {autosave.version}</span>
            <span>
              {initial.publishedVersion
                ? `Published revision ${initial.publishedVersion}`
                : "No published revision"}
            </span>
            <span>{questions.length} optional questions</span>
          </div>
        </aside>

        <div className="interview-guide-writing-surface">
          {editor && (
            <InterviewGuideToolbar editor={editor} readOnly={readOnly} />
          )}
          <DocumentEditorStage
            label="Interview guide document"
            className="interview-guide-document-stage"
            canvasClassName="interview-guide-canvas"
          >
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <div className="interview-guide-loading" role="status">
                Opening guide…
              </div>
            )}
          </DocumentEditorStage>
        </div>
      </div>

      {!readOnly && (
        <footer className="interview-guide-publish">
          <div>
            <p className="eyebrow">Published edition</p>
            <p>Conversations keep the edition they started with.</p>
          </div>
          <Button
            variant="primary"
            type="button"

            disabled={autosave.dirty || pending || !meaningful}
            onClick={() =>
              startTransition(async () => {
                const result = await publishInterviewGuideAction(
                  initial.id,
                  crypto.randomUUID(),
                  { expectedVersion: autosave.version },
                );
                setActionMessage(result.error ?? "Published edition created.");
                if (!result.error) router.refresh();
              })
            }
          >
            <Send aria-hidden="true" /> Publish edition
          </Button>
        </footer>
      )}
    </section>
  );
}
