"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { DocumentEditorStage } from "@/components/ui/document-editor/components/document-editor-stage.component";
import { useDocumentAutosave } from "@/components/ui/document-editor/hooks/document-autosave.hook";
import { useDocumentNavigationGuard } from "@/components/ui/document-editor/hooks/document-navigation-guard.hook";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  archiveInterviewGuideAction,
  duplicateInterviewGuideAction,
  publishInterviewGuideAction,
  saveInterviewGuideDraftAction,
} from "@/features/entrepreneurship/interview-guides/actions/interview-guide.action";
import type {
  InterviewGuideDocument,
  InterviewGuideDraftView,
  InterviewGuideQuestionIndexItem,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import {
  interviewGuideQuestionIndex,
  validateInterviewGuideDocument,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

type GuideEditorData = {
  id: string;
  nicheId: string;
  title: string;
  objective: string;
  marketType: "B2C" | "B2B";
  segmentId: string | null;
  expectedDurationMinutes: number;
  version: number;
  savedAt: string;
  archived: boolean;
  document: InterviewGuideDocument;
  questions: InterviewGuideQuestionIndexItem[];
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
  questions: InterviewGuideQuestionIndexItem[];
};

type GuideDocumentView = {
  document: GuideEditorDocument;
  version: number;
  savedAt: string | null;
};

function toDocument(
  questions: InterviewGuideQuestionIndexItem[],
): InterviewGuideDocument {
  return {
    schemaVersion: 1,
    content: {
      type: "doc",
      content: questions.map((question) => ({
        type: "interviewQuestion",
        attrs: {
          questionId: question.questionId,
          prompt: question.prompt,
          intent: question.intent ?? "",
          probes: question.probes,
        },
      })),
    },
  };
}

function editorDocumentFromDraft(
  guide: InterviewGuideDraftView,
): GuideEditorDocument {
  const document = validateInterviewGuideDocument(guide.draftDocument);
  return {
    metadata: {
      title: guide.title,
      objective: guide.objective,
      marketType: guide.marketType as "B2C" | "B2B",
      segmentId: guide.segmentId ?? "",
      expectedDurationMinutes: guide.expectedDurationMinutes,
    },
    questions: interviewGuideQuestionIndex(document),
  };
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
  const [questions, setQuestions] = useState(initial.questions);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const readOnly = initial.archived || Boolean(exploration?.archived);
  const editorDocument = useMemo<GuideEditorDocument>(
    () => ({ metadata, questions }),
    [metadata, questions],
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
        questions: initial.questions,
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
          document: toDocument(request.document.questions),
        },
      );
      if (result.kind === "saved")
        return {
          kind: "saved" as const,
          view: {
            document: request.document,
            version: result.guide.version,
            savedAt: result.guide.savedAt,
          },
        };
      if (result.kind === "conflict")
        return {
          kind: "conflict" as const,
          message: result.message,
          latest: {
            document: editorDocumentFromDraft(result.latest),
            version: result.latest.version,
            savedAt: result.latest.savedAt,
          },
        };
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

  const updateQuestion = (
    questionId: string,
    update: Partial<InterviewGuideQuestionIndexItem>,
  ) =>
    setQuestions((current) =>
      current.map((question) =>
        question.questionId === questionId
          ? { ...question, ...update }
          : question,
      ),
    );

  return (
    <section
      className="interview-guide-editor"
      data-read-only={readOnly || undefined}
    >
      <header className="interview-guide-editor-header">
        <div>
          <Link href={explorationHref(initial.nicheId, "/learn/guides")}>
            ← Interview guides
          </Link>
          <p className="eyebrow">Guide authoring · {initial.marketType}</p>
          <input
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
            {autosave.status === "saving"
              ? "Saving…"
              : autosave.status === "dirty"
                ? "Unsaved changes"
                : autosave.status === "error"
                  ? "Save needs attention"
                  : autosave.status === "conflict"
                    ? "Draft conflict"
                    : autosave.savedAt
                      ? `Saved ${new Date(autosave.savedAt).toLocaleDateString()}`
                      : "Saved"}
          </span>
          <Link
            className="finance-dialog-trigger finance-dialog-trigger--secondary"
            href={explorationHref(
              initial.nicheId,
              `/learn/guides/${initial.id}/preview`,
            )}
          >
            <Eye aria-hidden="true" /> Preview
          </Link>
          {!readOnly && (
            <button
              className="finance-dialog-trigger"
              type="button"
              onClick={() => void autosave.flush()}
              disabled={
                !autosave.dirty ||
                autosave.status === "saving" ||
                Boolean(autosave.conflict)
              }
            >
              <Save aria-hidden="true" /> Save draft
            </button>
          )}
          <SubMenu
            label="Guide actions"
            placement="bottom-end"
            trigger={(props) => (
              <button {...props} className="business-icon-button">
                <MoreHorizontal aria-hidden="true" />
              </button>
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
                        explorationHref(
                          initial.nicheId,
                          `/learn/guides/${result.id}/edit`,
                        ),
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
        <p
          className="interview-guide-editor-message"
          role={autosave.status === "error" ? "alert" : "status"}
        >
          {autosave.message ?? actionMessage}
        </p>
      )}
      {autosave.status === "error" && (
        <div className="interview-guide-save-recovery">
          <p>Your local questions are still here.</p>
          <button type="button" onClick={() => void autosave.retry()}>
            Retry the same save
          </button>
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
              Your local draft is preserved. Choose which copy should become
              current.
            </p>
          </div>
          <div className="interview-guide-conflict-comparison">
            <article>
              <span>Your local draft</span>
              <strong>{metadata.title}</strong>
              <p>{questions.length} questions</p>
            </article>
            <article>
              <span>Latest saved copy</span>
              <strong>{autosave.conflict.document.metadata.title}</strong>
              <p>Version {autosave.conflict.version}</p>
            </article>
          </div>
          <div className="business-actions">
            <button
              type="button"
              className="finance-dialog-trigger finance-dialog-trigger--secondary"
              onClick={() => {
                const accepted = autosave.acceptLatest();
                if (!accepted) return;
                setMetadata(accepted.document.metadata);
                setQuestions(accepted.document.questions);
              }}
            >
              Use latest copy
            </button>
            <button
              type="button"
              className="finance-dialog-trigger"
              onClick={() => void autosave.keepLocal()}
            >
              Keep my local draft
            </button>
          </div>
        </section>
      )}
      {readOnly && (
        <div className="interview-guide-readonly" role="note">
          {exploration?.archived
            ? "This exploration is archived. The guide remains readable as a historical record."
            : "This guide is archived. Its draft and published revisions remain readable."}
        </div>
      )}

      <div className="interview-guide-editor-layout">
        <aside className="interview-guide-metadata" aria-label="Guide details">
          <label>
            Objective
            <textarea
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
            <select
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
            </select>
          </label>
          <label>
            Segment
            <select
              value={metadata.segmentId}
              disabled={readOnly}
              onChange={(event) =>
                setMetadata((current) => ({
                  ...current,
                  segmentId: event.target.value,
                }))
              }
            >
              <option value="">Any relevant segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expected minutes
            <input
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
                : "Not published"}
            </span>
          </div>
        </aside>

        <DocumentEditorStage
          label="Interview guide questions"
          className="interview-guide-document-stage"
          canvasClassName="interview-guide-canvas"
        >
          <header>
            <p className="eyebrow">Conversation path</p>
            <h2>Questions, intent and useful probes</h2>
            <p>
              Keep prompts open. Intent is for the interviewer; probes are
              optional ways to go deeper.
            </p>
          </header>
          <ol className="interview-question-list">
            {questions.map((question, index) => (
              <li key={question.questionId}>
                <span className="interview-question-handle" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <label>
                    Prompt
                    <textarea
                      value={question.prompt}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateQuestion(question.questionId, {
                          prompt: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Intent
                    <textarea
                      value={question.intent ?? ""}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateQuestion(question.questionId, {
                          intent: event.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Probes · one per line
                    <textarea
                      value={question.probes.join("\n")}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateQuestion(question.questionId, {
                          probes: event.target.value
                            .split("\n")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((current) =>
                          current.filter(
                            (item) => item.questionId !== question.questionId,
                          ),
                        )
                      }
                    >
                      Remove question
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {!readOnly && (
            <button
              type="button"
              className="interview-guide-add-question"
              onClick={() =>
                setQuestions((current) => [
                  ...current,
                  {
                    questionId: `question-${crypto.randomUUID()}`,
                    prompt: "",
                    intent: null,
                    probes: [],
                    position: current.length,
                  },
                ])
              }
            >
              <Plus aria-hidden="true" /> Add question
            </button>
          )}
        </DocumentEditorStage>
      </div>

      {!readOnly && (
        <footer className="interview-guide-publish">
          <div>
            <p className="eyebrow">Immutable revision</p>
            <h3>Ready to use this guide in a conversation?</h3>
            <p>
              Save the draft first. Publishing pins this exact question set for
              future interviews.
            </p>
          </div>
          <button
            type="button"
            className="finance-dialog-trigger"
            disabled={autosave.dirty || pending || questions.length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await publishInterviewGuideAction(
                  initial.id,
                  crypto.randomUUID(),
                  { expectedVersion: autosave.version },
                );
                setActionMessage(result.error ?? "Published revision created.");
                if (!result.error) router.refresh();
              })
            }
          >
            <Send aria-hidden="true" /> Publish guide
          </button>
        </footer>
      )}
    </section>
  );
}
