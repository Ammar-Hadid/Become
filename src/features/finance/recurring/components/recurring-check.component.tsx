"use client";

import { Button } from "@/components/ui/buttons/button.component";
import { useEffect, useState, useTransition } from "react";
import { checkRecurringAction } from "@/features/finance/recurring/actions/recurring-expense.action";
export function RecurringCheck() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        for (let batch = 0; batch < 20 && !cancelled; batch++) {
          const result = await checkRecurringAction();
          if (result.error) {
            setError(result.error);
            break;
          }
          if (!result.more) break;
          if (batch === 19 && !cancelled)
            setError("More historical dates remain. Check again to continue.");
        }
      } catch {
        if (!cancelled)
          setError("Recurring processing failed. Check due expenses to retry.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="finance-recurring-check">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        aria-label="Check due expenses"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await checkRecurringAction();
              setError(
                result.error ??
                  (result.more
                    ? "More historical dates remain. Check again to continue."
                    : null),
              );
            } catch {
              setError("Recurring processing failed. Try again.");
            }
          })
        }
      >
        {pending ? "Checking commitments…" : "Refresh commitments"}
      </Button>
      {error && (
        <p className="form-error mt-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
