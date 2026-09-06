"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type AriaRole,
  type ReactNode,
} from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";
import { confirmFinanceFormDiscard } from "@/features/finance/hooks/use-finance-form-guard.hook";

const FinanceDialogContext = createContext<(() => void) | null>(null);

export const useFinanceDialogClose = () => useContext(FinanceDialogContext);

export function FinanceDialog({
  triggerLabel,
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
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = () => {
    const dialog = dialogRef.current;
    if (dialog && confirmFinanceFormDiscard(dialog)) dialog.close();
  };

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
          dialogRef.current?.showModal();
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
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
          onOpenChange?.(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        {open && (
          <div className="finance-dialog-panel">
            <header className="finance-dialog-heading">
              <div>
                <p className="eyebrow">Finance</p>
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
            <FinanceDialogContext.Provider value={close}>
              <div className="finance-dialog-body">{children}</div>
            </FinanceDialogContext.Provider>
          </div>
        )}
      </dialog>
    </>
  );
}
