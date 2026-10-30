"use client";
import { Button } from "@/components/ui/buttons/button.component";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import { createPortal } from "react-dom";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, ChevronRight, SkipForward, X } from "lucide-react";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import {
  askConversationGuideQuestionAction,
  updateConversationConductStateAction,
} from "@/features/entrepreneurship/conversations/actions/conversation.action";
import { InterviewGuideDocumentView } from "@/features/entrepreneurship/interview-guides/components/interview-guide-document.component";
import type {
  InterviewGuideDocument,
  InterviewGuideQuestionIndexItem,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

export function ConductGuidePane({
  conversationId,
  document: guideDocument,
  guideTitle,
  guideVersion,
  questions,
  currentQuestionId,
  skippedQuestionIds,
  guideCompleted,
}: {
  conversationId: string;
  document: InterviewGuideDocument;
  guideTitle: string;
  guideVersion: number;
  questions: InterviewGuideQuestionIndexItem[];
  currentQuestionId: string | null;
  skippedQuestionIds: string[];
  guideCompleted: boolean;
}) {
  const router = useRouter();
  const exploration = useExploration();
  const initialIndex = guideCompleted
    ? questions.length
    : Math.max(
        0,
        questions.findIndex(
          (question) => question.questionId === currentQuestionId,
        ),
      );
  const [index, setIndex] = useState(initialIndex);
  const [skipped, setSkipped] = useState(skippedQuestionIds);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAsk, setPendingAsk] = useState<{
    questionId: string;
    operationKey: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const question = questions[index];
  const presence = usePresence(open, "content");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useModalLayer({
    open: mobile && open,
    containerRef: paneRef,
    initialFocusRef: closeRef,
    returnFocusRef: triggerRef,
    onClose: () => setOpen(false),
  });

  const advance = (skip: boolean) => {
    if (!question || pending) return;
    const next = questions[index + 1] ?? null;
    const nextSkipped =
      skip && !skipped.includes(question.questionId)
        ? [...skipped, question.questionId]
        : skipped;
    startTransition(async () => {
      if (!skip) {
        const attempt =
          pendingAsk?.questionId === question.questionId
            ? pendingAsk
            : {
                questionId: question.questionId,
                operationKey: crypto.randomUUID(),
              };
        setPendingAsk(attempt);
        const result = await askConversationGuideQuestionAction(
          conversationId,
          attempt.operationKey,
          question.questionId,
        );
        if (result.error) {
          setMessage(result.error);
          return;
        }
      } else {
        const result = await updateConversationConductStateAction(
          conversationId,
          crypto.randomUUID(),
          {
            currentQuestionId: next?.questionId ?? null,
            skippedQuestionIds: nextSkipped,
          },
        );
        if (result.error) {
          setMessage(result.error);
          return;
        }
      }
      setPendingAsk(null);
      setSkipped(nextSkipped);
      setIndex((value) => Math.min(value + 1, questions.length));
      setMessage(null);
      if (mobile) setOpen(false);
      router.refresh();
      requestAnimationFrame(() =>
        window.document
          .querySelector<HTMLElement>(".conversation-composer textarea")
          ?.focus(),
      );
    });
  };

  const progress = questions.length
    ? Math.min(index + (question ? 1 : 0), questions.length)
    : 0;
  const asked = questions
    .slice(0, index)
    .map((item) => item.questionId)
    .filter((questionId) => !skipped.includes(questionId));

  const pane = (!mobile || presence.isPresent) && (
    <aside
      ref={paneRef}
      className="conduct-guide-pane"
      data-presence={mobile ? presence.presenceState : "open"}
      aria-label="Interview guide"
      role={mobile ? "dialog" : undefined}
      aria-modal={mobile ? true : undefined}
      aria-labelledby="conduct-guide-title"
      tabIndex={mobile ? -1 : undefined}
      inert={mobile && presence.isExiting ? true : undefined}
      onAnimationEnd={presence.onPresenceAnimationEnd}
    >
      <header>
        <div>
          <p className="eyebrow">Pinned edition {guideVersion}</p>
          <h2 id="conduct-guide-title">{guideTitle}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close interview guide"
          onClick={() => setOpen(false)}
        >
          <X aria-hidden="true" />
        </button>
      </header>
      {questions.length > 0 && (
        <div
          className="conduct-guide-progress"
          aria-label={`${progress} of ${questions.length} questions reached`}
        >
          <span
            style={{
              width: `${(progress / questions.length) * 100}%`,
            }}
          />
        </div>
      )}
      <div className="conduct-guide-document">
        <InterviewGuideDocumentView
          document={guideDocument}
          activeQuestionId={question?.questionId ?? null}
          askedQuestionIds={asked}
          skippedQuestionIds={skipped}
          renderQuestionActions={() =>
            !exploration?.archived ? (
              <div className="conduct-guide-question-actions">
                <Button
                  variant="primary"
                  type="button"
                  disabled={pending}
                  onClick={() => advance(false)}
                >
                  Ask <ChevronRight aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => advance(true)}
                >
                  <SkipForward aria-hidden="true" /> Skip
                </Button>
              </div>
            ) : null
          }
        />
        {questions.length > 0 && !question && (
          <div className="conduct-guide-complete" role="status">
            <h3>Every guide question is covered.</h3>
            <p>Keep following the conversation wherever it is useful.</p>
          </div>
        )}
      </div>
      {message && (
        <p className="conduct-guide-error" role="alert">
          {message}
        </p>
      )}
      <footer>
        <span>
          {questions.length > 0
            ? `${skipped.length} skipped`
            : "No scripted questions"}
        </span>
        <p>Guidance stays optional throughout the conversation.</p>
      </footer>
    </aside>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="conduct-guide-mobile-trigger"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <BookOpenText aria-hidden="true" />
        {questions.length > 0
          ? `Guide · ${progress} of ${questions.length}`
          : "Guide notes"}
      </button>
      {mobile && presence.isPresent && typeof document !== "undefined"
        ? createPortal(
            <Workspace
              area="entrepreneurship"
              className="conduct-guide-overlay"
            >
              <button
                type="button"
                className="conduct-guide-scrim"
                data-presence={presence.presenceState}
                aria-label="Close interview guide"
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                onAnimationEnd={presence.onPresenceAnimationEnd}
              />
              {pane}
            </Workspace>,
            document.body,
          )
        : !mobile
          ? pane
          : null}
    </>
  );
}
