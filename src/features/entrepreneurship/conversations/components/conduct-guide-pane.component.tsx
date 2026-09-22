"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  Check,
  ChevronRight,
  SkipForward,
  X,
} from "lucide-react";
import {
  askConversationGuideQuestionAction,
  updateConversationConductStateAction,
} from "@/features/entrepreneurship/conversations/actions/conversation.action";
import type { InterviewGuideQuestionIndexItem } from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

export function ConductGuidePane({
  conversationId,
  guideTitle,
  guideVersion,
  questions,
  currentQuestionId,
  skippedQuestionIds,
  guideCompleted,
}: {
  conversationId: string;
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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !mobile || !paneRef.current) return;
      const focusable = Array.from(
        paneRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [mobile, open]);

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
        const messageResult = await askConversationGuideQuestionAction(
          conversationId,
          attempt.operationKey,
          question.questionId,
        );
        if (messageResult.error) {
          setMessage(messageResult.error);
          return;
        }
        setPendingAsk(null);
      }
      if (skip) {
        const stateResult = await updateConversationConductStateAction(
          conversationId,
          crypto.randomUUID(),
          {
            currentQuestionId: next?.questionId ?? null,
            skippedQuestionIds: nextSkipped,
          },
        );
        if (stateResult.error) {
          setMessage(stateResult.error);
          return;
        }
        setPendingAsk(null);
      }
      setSkipped(nextSkipped);
      setIndex((value) => Math.min(value + 1, questions.length));
      setMessage(null);
      setOpen(false);
      router.refresh();
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(".conversation-composer textarea")
          ?.focus(),
      );
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="conduct-guide-mobile-trigger"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <BookOpenText aria-hidden="true" /> Guide{" "}
        {Math.min(index + 1, questions.length)} of {questions.length}
      </button>
      <button
        type="button"
        className="conduct-guide-scrim"
        data-open={open || undefined}
        aria-label="Close interview guide"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={paneRef}
        className="conduct-guide-pane"
        data-open={open || undefined}
        aria-label="Interview guide"
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        inert={mobile && !open ? true : undefined}
      >
        <header>
          <div>
            <p className="eyebrow">Pinned guide · revision {guideVersion}</p>
            <h2>{guideTitle}</h2>
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
        <div
          className="conduct-guide-progress"
          aria-label={`Question ${Math.min(index + 1, questions.length)} of ${questions.length}`}
        >
          <span
            style={{
              width: `${questions.length ? (Math.min(index + 1, questions.length) / questions.length) * 100 : 0}%`,
            }}
          />
        </div>
        {question ? (
          <article className="conduct-guide-question">
            <span>Question {index + 1}</span>
            <h3>{question.prompt}</h3>
            {question.intent && (
              <p>
                <strong>Listen for</strong>
                {question.intent}
              </p>
            )}
            {question.probes.length > 0 && (
              <div>
                <strong>Optional probes</strong>
                <ul>
                  {question.probes.map((probe) => (
                    <li key={probe}>{probe}</li>
                  ))}
                </ul>
              </div>
            )}
            {!exploration?.archived && (
              <div className="business-actions">
                <button
                  type="button"
                  className="finance-dialog-trigger"
                  disabled={pending}
                  onClick={() => advance(false)}
                >
                  Ask <ChevronRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="finance-dialog-trigger finance-dialog-trigger--secondary"
                  disabled={pending}
                  onClick={() => advance(true)}
                >
                  <SkipForward aria-hidden="true" /> Skip
                </button>
              </div>
            )}
          </article>
        ) : (
          <div className="conduct-guide-complete">
            <Check aria-hidden="true" />
            <h3>You reached the end of the guide.</h3>
            <p>
              Continue freely, or finish the conversation when the exchange is
              complete.
            </p>
          </div>
        )}
        {message && (
          <p className="conduct-guide-error" role="alert">
            {message}
          </p>
        )}
        <footer>
          <span>{skipped.length} skipped</span>
          <p>The guide assists; it never blocks a useful tangent.</p>
        </footer>
      </aside>
    </>
  );
}
