"use client";

import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Save } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { useReviewOperation } from "@/features/reviews/commands/hooks/use-review-operation.hook";
import type {
  ReviewView,
  ReviewWriting,
} from "@/features/reviews/contracts/types/review.types";
import styles from "../../reading/styles/review-reading.module.css";

type ReviewReflectionProps = {
  view: ReviewView;
  writing: ReviewWriting;
  onWriting: (writing: ReviewWriting) => void;
  onView: (view: ReviewView) => void;
  onEditingChange?: (editing: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function ReviewReflection(props: ReviewReflectionProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const markSavedRef = useRef<(() => void) | null>(null);
  const saveRef = useRef<(() => void) | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <GuardedReviewForm
      formRef={formRef}
      markSavedRef={markSavedRef}
      writing={props.writing}
      savedWriting={props.view.writing}
      pending={pending}
      onSave={() => saveRef.current?.()}
    >
      <input
        type="hidden"
        name="writing"
        value={JSON.stringify(props.writing)}
      />
      <ReviewReflectionContents
        {...props}
        markSavedRef={markSavedRef}
        saveRef={saveRef}
        onPendingChange={(next) => {
          setPending(next);
          props.onPendingChange?.(next);
        }}
      />
    </GuardedReviewForm>
  );
}

function ReviewReflectionContents({
  view,
  writing,
  onWriting,
  onView,
  onEditingChange,
  onPendingChange,
  markSavedRef,
  saveRef,
}: ReviewReflectionProps & {
  markSavedRef: RefObject<(() => void) | null>;
  saveRef: RefObject<(() => void) | null>;
}) {
  const router = useRouter();
  const run = useReviewOperation();
  const markSaved = () => markSavedRef.current?.();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflicting, setConflicting] = useState<ReviewView | null>(null);
  const [amending, setAmending] = useState(false);
  const [livePreview, setLivePreview] = useState<ReviewView | null>(null);
  const finalized =
    view.edition?.kind === "FINALIZED" || view.edition?.kind === "AMENDMENT";
  const latestFinal =
    view.editions.find(
      (edition) => edition.kind === "FINALIZED" || edition.kind === "AMENDMENT",
    ) ?? (finalized ? view.edition : null);

  async function beginAmendment() {
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        timeframe: view.facts.period.timeframe,
        startOn: view.facts.period.startOn,
      });
      const response = await fetch(`/api/reviews?${query}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string | null;
        view?: ReviewView;
      } | null;
      if (!response.ok || !body?.view?.facts)
        throw new Error(
          body?.error || "A current amendment preview could not be loaded.",
        );
      setLivePreview(body.view);
      onView(body.view);
      setAmending(true);
      onEditingChange?.(true);
      setNotice(
        "Your earlier edition stays preserved. Review the current facts and your wording before saving an amendment.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "A current amendment preview could not be loaded.",
      );
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }

  useEffect(() => {
    saveRef.current = () => void persist();
  });

  async function persist(finalize = false) {
    if (pending || conflicting) return;
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    setNotice(null);
    const current = livePreview ?? view;
    const identity = {
      timeframe: current.facts.period.timeframe,
      startOn: current.facts.period.startOn,
      expectedVersion: current.version,
    };
    const result =
      amending && latestFinal
        ? await run({
            ...identity,
            type: "AMEND",
            fingerprint: current.facts.fingerprint,
            supersedesId: latestFinal.id,
            writing,
          })
        : await run({ ...identity, type: "SAVE", writing });
    if (result.view && !result.error && !result.recoveredPrevious) {
      let saved = result.view;
      onView(saved);
      if (finalize && saved.canFinalize) {
        const finalizedResult = await run({
          timeframe: saved.facts.period.timeframe,
          startOn: saved.facts.period.startOn,
          expectedVersion: saved.version,
          type: "FINALIZE",
          fingerprint: saved.facts.fingerprint,
        });
        if (finalizedResult.error) {
          setError(finalizedResult.error);
          if (
            finalizedResult.view &&
            finalizedResult.delivery === "confirmed"
          ) {
            onView(finalizedResult.view);
            setConflicting(finalizedResult.view);
          }
          setPending(false);
          onPendingChange?.(false);
          return;
        }
        if (finalizedResult.view) {
          saved = finalizedResult.view;
          onView(saved);
        }
        if (finalizedResult.error) setError(finalizedResult.error);
        else
          setNotice(
            "Your review is finalized. This edition keeps the reading and words you closed with.",
          );
      } else
        setNotice(
          amending
            ? "An amendment was saved. The previous edition remains in history."
            : "Your reflection is saved.",
        );
      onWriting(saved.writing);
      setAmending(false);
      onEditingChange?.(false);
      setLivePreview(null);
      window.requestAnimationFrame(() => {
        markSaved();
        if (saved.edition)
          router.replace(
            `${saved.reviewHref}?editionId=${encodeURIComponent(saved.edition.id)}`,
            { scroll: false },
          );
      });
    } else {
      setError(
        result.error ||
          "The saved review could not be read. Your words remain here.",
      );
      if (result.view) {
        onView(result.view);
        setConflicting(result.view);
      }
    }
    setPending(false);
    onPendingChange?.(false);
  }

  if (view.edition?.kind === "PRESENTATION" && !amending)
    return (
      <div className={styles.finalizedReflection}>
        {view.writing.reflection ? (
          <blockquote>
            {view.writing.reflection}
            <cite>Your reflection, preserved with this presentation</cite>
          </blockquote>
        ) : (
          <p className={styles.annotation}>
            No additional written reflection was saved with this presentation.
          </p>
        )}
        {(view.writing.carryForward || view.writing.leaveBehind) && (
          <dl className={styles.savedCarry}>
            {view.writing.carryForward && (
              <div>
                <dt>Carry forward</dt>
                <dd>{view.writing.carryForward}</dd>
              </div>
            )}
            {view.writing.leaveBehind && (
              <div>
                <dt>Leave behind</dt>
                <dd>{view.writing.leaveBehind}</dd>
              </div>
            )}
          </dl>
        )}
        <Link href={view.reviewHref}>
          Return to the live review to edit your words
        </Link>
      </div>
    );

  if (latestFinal && !finalized && !amending)
    return (
      <div className={styles.finalizedReflection}>
        <p className={styles.annotation}>
          A finalized reading is preserved in edition {latestFinal.number}. The
          evidence above is live.
        </p>
        {view.writing.reflection && (
          <blockquote>
            {view.writing.reflection}
            <cite>Your saved review writing</cite>
          </blockquote>
        )}
        {(view.writing.carryForward || view.writing.leaveBehind) && (
          <dl className={styles.savedCarry}>
            {view.writing.carryForward && (
              <div>
                <dt>Carry forward</dt>
                <dd>{view.writing.carryForward}</dd>
              </div>
            )}
            {view.writing.leaveBehind && (
              <div>
                <dt>Leave behind</dt>
                <dd>{view.writing.leaveBehind}</dd>
              </div>
            )}
          </dl>
        )}
        {JSON.stringify(writing) !== JSON.stringify(view.writing) && (
          <UnsavedReviewEntries writing={writing} />
        )}
        <div className={styles.formActions}>
          <Link
            href={`${view.reviewHref}?editionId=${encodeURIComponent(latestFinal.id)}`}
          >
            Read the finalized review
          </Link>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => void beginAmendment()}
          >
            {pending ? "Checking current evidence…" : "Begin an amendment"}
          </Button>
        </div>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
      </div>
    );

  if (finalized && !amending)
    return (
      <div className={styles.finalizedReflection}>
        <p className={styles.editionNote}>
          <Check aria-hidden="true" /> Finalized edition {view.edition?.number}{" "}
          · {formatReviewDate(view.edition!.capturedAt)}
        </p>
        {view.writing.reflection ? (
          <blockquote>
            {view.writing.reflection}
            <cite>Your reflection</cite>
          </blockquote>
        ) : (
          <p className={styles.annotation}>
            You finalized this period without an additional written reflection.
          </p>
        )}
        {(view.writing.carryForward || view.writing.leaveBehind) && (
          <dl className={styles.savedCarry}>
            {view.writing.carryForward && (
              <div>
                <dt>Carry forward</dt>
                <dd>{view.writing.carryForward}</dd>
              </div>
            )}
            {view.writing.leaveBehind && (
              <div>
                <dt>Leave behind</dt>
                <dd>{view.writing.leaveBehind}</dd>
              </div>
            )}
          </dl>
        )}
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        {JSON.stringify(writing) !== JSON.stringify(view.writing) && (
          <UnsavedReviewEntries writing={writing} />
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => void beginAmendment()}
        >
          {pending ? "Checking current evidence…" : "Amend this review"}
        </Button>
      </div>
    );

  return (
    <>
      <input
        type="hidden"
        name="selectedMomentKeys"
        value={JSON.stringify(writing.selectedMomentKeys)}
      />
      <fieldset disabled={pending || Boolean(conflicting)}>
        <label>
          <span>What deserves to stay with you?</span>
          <textarea
            name="reflection"
            value={writing.reflection}
            maxLength={6000}
            onChange={(event) =>
              onWriting({ ...writing, reflection: event.target.value })
            }
            placeholder="A change, a lesson, or one honest reading of the period. Writing is optional."
          />
        </label>
        <details className={styles.carryDisclosure}>
          <summary>Something to carry. Something to leave.</summary>
          <div>
            <label>
              <span>Carry forward</span>
              <textarea
                name="carryForward"
                value={writing.carryForward}
                maxLength={6000}
                onChange={(event) =>
                  onWriting({ ...writing, carryForward: event.target.value })
                }
                placeholder="A lesson, practice, or unfinished intention…"
              />
            </label>
            <label>
              <span>Leave behind</span>
              <textarea
                name="leaveBehind"
                value={writing.leaveBehind}
                maxLength={6000}
                onChange={(event) =>
                  onWriting({ ...writing, leaveBehind: event.target.value })
                }
                placeholder="What no longer deserves to steer the next period?"
              />
            </label>
          </div>
        </details>
      </fieldset>
      {notice && (
        <p className={styles.formNotice} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      {conflicting && (
        <div className={styles.conflict}>
          <p>The saved reading changed. Your entries are still here.</p>
          <details>
            <summary>Compare the writing</summary>
            <div>
              <section>
                <h3>Your entries</h3>
                <pre>
                  {[
                    writing.reflection,
                    writing.carryForward,
                    writing.leaveBehind,
                  ].join("\n\n") || "No additional writing"}
                </pre>
              </section>
              <section>
                <h3>Latest saved</h3>
                <pre>
                  {[
                    conflicting.writing.reflection,
                    conflicting.writing.carryForward,
                    conflicting.writing.leaveBehind,
                  ].join("\n\n") || "No additional writing"}
                </pre>
              </section>
            </div>
          </details>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onWriting(conflicting.writing);
                setConflicting(null);
                setError(null);
                window.requestAnimationFrame(markSaved);
              }}
            >
              Use saved writing
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLivePreview(conflicting);
                setConflicting(null);
                setError(null);
                setNotice(
                  "Your entries remain. Save explicitly to apply them as a new revision.",
                );
              }}
            >
              Keep my entries
            </Button>
          </div>
        </div>
      )}
      <div className={styles.formActions}>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || Boolean(conflicting)}
        >
          <Save aria-hidden="true" />
          {pending
            ? "Saving…"
            : amending
              ? "Save amendment"
              : "Save reflection"}
        </Button>
        {view.canFinalize && !amending && (
          <Button
            type="button"
            disabled={pending || Boolean(conflicting)}
            onClick={() => void persist(true)}
          >
            Finalize review
          </Button>
        )}
        {(error || conflicting) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              void navigator.clipboard.writeText(
                [
                  writing.reflection,
                  writing.carryForward,
                  writing.leaveBehind,
                ].join("\n\n"),
              )
            }
          >
            <Copy aria-hidden="true" />
            Copy my writing
          </Button>
        )}
      </div>
      <p className={styles.annotation}>
        {amending
          ? "Saving appends a new edition. Earlier editions are preserved."
          : view.canFinalize
            ? "Finalizing preserves this evaluated reading and your words. It does not conclude goals or experiments."
            : "You can save writing while the period is open. Finalization becomes available after the period ends."}
      </p>
    </>
  );
}

function UnsavedReviewEntries({ writing }: { writing: ReviewWriting }) {
  return (
    <div className={styles.conflict}>
      <p>
        Your newer entries are still here and have not been saved to this
        edition.
      </p>
      <details>
        <summary>Read your unsaved entries</summary>
        <pre>
          {[writing.reflection, writing.carryForward, writing.leaveBehind].join(
            "\n\n",
          ) || "No additional written reflection"}
        </pre>
        <p>Your kept moments are also still here.</p>
      </details>
      <Button
        type="button"
        variant="ghost"
        onClick={() =>
          void navigator.clipboard.writeText(
            [
              writing.reflection,
              writing.carryForward,
              writing.leaveBehind,
            ].join("\n\n"),
          )
        }
      >
        <Copy aria-hidden="true" />
        Copy my entries
      </Button>
      <p className={styles.annotation}>
        Begin an explicit amendment to review and save these entries.
      </p>
    </div>
  );
}

function GuardedReviewForm({
  formRef,
  markSavedRef,
  writing,
  savedWriting,
  pending,
  onSave,
  children,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  markSavedRef: RefObject<(() => void) | null>;
  writing: ReviewWriting;
  savedWriting: ReviewWriting;
  pending: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  const markSaved = useRecordFormGuard(formRef);
  useEffect(() => {
    markSavedRef.current = markSaved;
    return () => {
      markSavedRef.current = null;
    };
  }, [markSaved, markSavedRef]);
  useEffect(() => {
    if (JSON.stringify(writing) !== JSON.stringify(savedWriting))
      formRef.current
        ?.querySelector("input[name=writing]")
        ?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [formRef, writing, savedWriting]);
  return (
    <form
      ref={formRef}
      className={styles.reflectionForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      aria-busy={pending}
    >
      {children}
    </form>
  );
}
