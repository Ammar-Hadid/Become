"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type AriaRole,
  type ReactNode,
} from "react";
import { Plus, X } from "lucide-react";
import { resolveMotionFallbackMs } from "@/components/ui/motion/utils/motion-time.util";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { cn } from "@/lib/styles/utils/class-name.util";
import { confirmRecordFormDiscard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";

const RecordDialogContext = createContext<(() => void) | null>(null);

export const useRecordDialogClose = () => useContext(RecordDialogContext);

export function RecordDialog({
  triggerLabel,
  eyebrow = "Finance",
  title,
  description,
  children,
  variant = "primary",
  icon = true,
  className,
  unstyledTrigger = false,
  triggerIcon,
  triggerRole,
  onOpenChange,
}: {
  eyebrow?: string;
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  icon?: boolean;
  className?: string;
  unstyledTrigger?: boolean;
  triggerIcon?: ReactNode;
  triggerRole?: AriaRole;
  onOpenChange?: (open: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const closeNotifiedRef = useRef(false);
  const backdropPointerRef = useRef(false);
  const [phase, setPhase] = useState<"closed" | "open" | "exiting">("closed");
  const titleId = useId();

  const finishExit = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.dataset.state !== "closed") return;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closingRef.current = false;
    dialog.inert = false;
    delete dialog.dataset.state;
    setPhase("closed");
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current || !confirmRecordFormDiscard(dialog)) {
      return;
    }

    closingRef.current = true;
    dialog.inert = true;
    dialog.dataset.state = "closed";
    setPhase("exiting");
    dialog.close();
    triggerRef.current?.focus({ preventScroll: true });
    closeNotifiedRef.current = true;
    onOpenChange?.(false);
    closeTimerRef.current = window.setTimeout(
      finishExit,
      resolveMotionFallbackMs("control"),
    );
  };

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useModalLayer({
    open: phase === "open",
    containerRef: dialogRef,
    returnFocusRef: triggerRef,
    onClose: close,
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role={triggerRole}
        className={
          unstyledTrigger
            ? className
            : cn(
                "finance-dialog-trigger",
                `finance-dialog-trigger--${variant}`,
                className,
              )
        }
        onClick={() => {
          setPhase("open");
          const dialog = dialogRef.current;
          if (!dialog) return;
          if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          closingRef.current = false;
          closeNotifiedRef.current = false;
          dialog.inert = false;
          dialog.dataset.state = "open";
          if (!dialog.open) dialog.showModal();
          onOpenChange?.(true);
        }}
      >
        {triggerIcon ?? (icon && <Plus aria-hidden="true" />)}
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className="finance-dialog"
        aria-labelledby={titleId}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) {
            finishExit();
          }
        }}
        onClose={() => {
          const dialog = dialogRef.current;
          if (dialog?.open || closingRef.current || closeNotifiedRef.current)
            return;
          if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          if (dialog) {
            dialog.inert = false;
            delete dialog.dataset.state;
          }
          setPhase("closed");
          triggerRef.current?.focus({ preventScroll: true });
          closeNotifiedRef.current = true;
          onOpenChange?.(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          backdropPointerRef.current =
            event.target === event.currentTarget &&
            (event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom);
        }}
        onPointerCancel={() => {
          backdropPointerRef.current = false;
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;
          if (
            backdropPointerRef.current &&
            event.target === event.currentTarget &&
            outside
          )
            close();
          backdropPointerRef.current = false;
        }}
      >
        {phase !== "closed" && (
          <div className="finance-dialog-panel">
            <header className="finance-dialog-heading">
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h2 id={titleId}>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button
                type="button"
                className="finance-dialog-close"
                aria-label={`Close ${title}`}
                onClick={close}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <RecordDialogContext.Provider value={close}>
              <div className="finance-dialog-body">{children}</div>
            </RecordDialogContext.Provider>
          </div>
        )}
      </dialog>
      {phase === "exiting" && (
        <div
          className="finance-dialog-exit-backdrop"
          aria-hidden="true"
          onAnimationEnd={finishExit}
        />
      )}
    </>
  );
}
