"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { useRecordDialogClose } from "@/components/ui/forms/record-dialog.component";
import { cn } from "@/lib/styles/utils/class-name.util";

const RecordFormNestedPendingContext = createContext<
  ((pending: boolean) => void) | null
>(null);

export const useRecordFormNestedPending = () =>
  useContext(RecordFormNestedPendingContext);

export function RecordForm({
  action,
  children,
  submitLabel = "Save",
  submitVariant = "primary",
  onSaved,
  resetOnSuccess = false,
  closeOnSuccess = false,
  showSuccess = true,
  formClassName = "space-y-lg flex flex-col",
  submitIcon,
  submitClassName,
  submitRole,
}: {
  action: (data: FormData) => Promise<RecordFormState>;
  children: React.ReactNode;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary" | "ghost" | "danger";
  onSaved?: (state: RecordFormState) => void;
  resetOnSuccess?: boolean;
  closeOnSuccess?: boolean;
  showSuccess?: boolean;
  formClassName?: string;
  submitIcon?: React.ReactNode;
  submitClassName?: string;
  submitRole?: React.AriaRole;
}) {
  const [state, setState] = useState<RecordFormState>({ error: null });
  const [pending, startTransition] = useTransition();
  const [nestedPending, setNestedPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const closeAfterTransitionRef = useRef(false);
  const markSaved = useRecordFormGuard(formRef);
  const closeDialog = useRecordDialogClose();

  useEffect(() => {
    if (pending || nestedPending || !closeAfterTransitionRef.current) return;
    closeAfterTransitionRef.current = false;
    closeDialog?.();
  }, [closeDialog, nestedPending, pending]);

  return (
    <form
      ref={formRef}
      className={cn("finance-motion-form", formClassName)}
      aria-busy={pending || nestedPending}
      data-pending={pending || nestedPending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (nestedPending) return;
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await action(data);
            setState(result);
            if (result.error)
              formRef.current?.dispatchEvent(
                new CustomEvent("record-form-error", { detail: result.error }),
              );
            if (!result.error) {
              if (resetOnSuccess) formRef.current?.reset();
              markSaved();
              onSaved?.(result);
              if (closeOnSuccess) closeAfterTransitionRef.current = true;
            }
          } catch {
            setState({
              error:
                "Could not save. Please try again; your entries are still here.",
            });
          }
        });
      }}
    >
      <RecordFormNestedPendingContext.Provider value={setNestedPending}>
        <fieldset
          disabled={pending || nestedPending}
          className="finance-motion-form-fields space-y-lg"
        >
          {children}
        </fieldset>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {showSuccess && !closeOnSuccess && state.success && !state.error && (
          <p
            role="status"
            className="finance-form-status text-success text-body"
          >
            {state.success}
          </p>
        )}
        <Button
          aria-label={submitLabel}
          className={submitClassName}
          disabled={pending || nestedPending}
          role={submitRole}
          type="submit"
          variant={submitVariant}
        >
          {!pending && !nestedPending && submitIcon}
          {pending ? "Saving…" : nestedPending ? "Creating…" : submitLabel}
        </Button>
      </RecordFormNestedPendingContext.Provider>
    </form>
  );
}
