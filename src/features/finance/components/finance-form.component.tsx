"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { FinanceFormState } from "@/features/finance/types/finance.types";
import { useFinanceFormGuard } from "@/features/finance/hooks/use-finance-form-guard.hook";
import { useFinanceDialogClose } from "@/features/finance/components/finance-dialog.component";

const FinanceFormNestedPendingContext = createContext<
  ((pending: boolean) => void) | null
>(null);

export const useFinanceFormNestedPending = () =>
  useContext(FinanceFormNestedPendingContext);

export function FinanceForm({
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
  action: (data: FormData) => Promise<FinanceFormState>;
  children: React.ReactNode;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary" | "ghost" | "danger";
  onSaved?: (state: FinanceFormState) => void;
  resetOnSuccess?: boolean;
  closeOnSuccess?: boolean;
  showSuccess?: boolean;
  formClassName?: string;
  submitIcon?: React.ReactNode;
  submitClassName?: string;
  submitRole?: React.AriaRole;
}) {
  const [state, setState] = useState<FinanceFormState>({ error: null });
  const [pending, startTransition] = useTransition();
  const [nestedPending, setNestedPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useFinanceFormGuard(formRef);
  const closeDialog = useFinanceDialogClose();
  return (
    <form
      ref={formRef}
      className={formClassName}
      onSubmit={(event) => {
        event.preventDefault();
        if (nestedPending) return;
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await action(data);
            setState(result);
            if (!result.error) {
              if (resetOnSuccess) formRef.current?.reset();
              markSaved();
              onSaved?.(result);
              if (closeOnSuccess) closeDialog?.();
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
      <FinanceFormNestedPendingContext.Provider value={setNestedPending}>
        <fieldset disabled={pending || nestedPending} className="space-y-lg">
          {children}
        </fieldset>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {showSuccess && state.success && !state.error && (
          <p role="status" className="text-success text-body">
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
      </FinanceFormNestedPendingContext.Provider>
    </form>
  );
}
