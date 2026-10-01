"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { confirmStatementAction } from "@/features/finance/statements/actions/statement-import.action";

export function StatementConfirmForm({ importId }: { importId: string }) {
  const router = useRouter();

  return (
    <FinanceForm
      action={confirmStatementAction}
      submitLabel="Confirm import"
      submitIcon={<CheckCircle2 aria-hidden="true" />}
      formClassName="finance-statement-confirm-form"
      showSuccess
      onSaved={() => router.refresh()}
    >
      <input type="hidden" name="importId" value={importId} />
    </FinanceForm>
  );
}
