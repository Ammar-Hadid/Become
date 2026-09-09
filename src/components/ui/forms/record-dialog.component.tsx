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
import { MOTION_DURATION_MS } from "@/components/ui/motion/constants/motion.constants";
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
  const backdropPointerRef = useRef(false);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const finishClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current || !confirmRecordFormDiscard(dialog)) {
      return;
    }

    closingRef.current = true;
    dialog.dataset.state = "closed";
    closeTimerRef.current = window.setTimeout(
      finishClose,
      MOTION_DURATION_MS.fast + MOTION_DURATION_MS.feedback,
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
          setOpen(true);
          const dialog = dialogRef.current;
          if (!dialog) return;
          closingRef.current = false;
          dialog.dataset.state = "open";
          dialog.showModal();
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
          if (
            event.target === event.currentTarget &&
            event.animationName === "finance-dialog-out"
          ) {
            finishClose();
          }
        }}
        onClose={() => {
          if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          closingRef.current = false;
          delete dialogRef.current?.dataset.state;
          setOpen(false);
          triggerRef.current?.focus();
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
        {open && (
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
    </>
  );
}
