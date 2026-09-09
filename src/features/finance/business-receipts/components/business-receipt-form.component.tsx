"use client";
import { useState } from "react";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  allocateBusinessReceiptAction,
  resolveBusinessAllocationAction,
} from "@/features/finance/business-receipts/actions/business-receipt.action";
function ReceiptFields({
  companies,
  offers,
  currency,
}: {
  companies: { id: string; name: string }[];
  offers: { id: string; companyId: string; title: string; version: number }[];
  currency: string;
}) {
  const [company, setCompany] = useState("");
  return (
    <>
      <CaptureKey />
      <label className="field-label">
        Company
        <select
          className="text-input mt-sm"
          name="companyId"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          required
        >
          <option value="">Choose a company</option>
          {companies.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <FinanceSelect
        key={company}
        label="Proposed offer · optional"
        name="offerRevisionId"
      >
        <option value="">Company only</option>
        {offers
          .filter((o) => o.companyId === company)
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} · revision {o.version}
            </option>
          ))}
      </FinanceSelect>
      <FinanceField
        label={`Amount of this receipt (${currency})`}
        name="amount"
        inputMode="decimal"
        required
      />
      <FinanceField label="Attribution note · optional" name="note" />
    </>
  );
}
export function BusinessReceiptForm(
  props: Parameters<typeof ReceiptFields>[0] & { transactionId: string },
) {
  return (
    <FinanceDialog
      title="Attribute a business receipt"
      triggerLabel="Attribute receipt"
      description="Connect part of this actual income to a company and, optionally, its quoted offer. This does not record more income."
      variant="secondary"
    >
      <FinanceForm
        action={allocateBusinessReceiptAction.bind(null, props.transactionId)}
        closeOnSuccess
        submitLabel="Confirm attribution"
      >
        <ReceiptFields {...props} />
      </FinanceForm>
    </FinanceDialog>
  );
}
export function ReceiptResolutionForm({
  id,
  review,
}: {
  id: string;
  review: boolean;
}) {
  return (
    <div className="gap-md flex flex-wrap">
      {review && (
        <FinanceDialog
          title="Review receipt attribution"
          triggerLabel="Review attribution"
          variant="secondary"
          description="The Finance source changed. Confirm the company, quoted offer and allocated amount still describe this receipt."
        >
          <FinanceForm
            action={resolveBusinessAllocationAction.bind(null, id, "RECONFIRM")}
            closeOnSuccess
            submitLabel="Confirm attribution still holds"
          >
            <p className="text-body text-text-secondary">
              This confirms the current attribution. Historical assessments keep
              their original basis.
            </p>
          </FinanceForm>
        </FinanceDialog>
      )}
      <FinanceDialog
        title="Withdraw attribution"
        triggerLabel="Correct attribution"
        variant="quiet"
      >
        <FinanceForm
          action={resolveBusinessAllocationAction.bind(null, id, "WITHDRAW")}
          closeOnSuccess
          submitLabel="Withdraw attribution"
          submitVariant="danger"
        >
          <FinanceField label="Reason for correction" name="reason" required />
        </FinanceForm>
      </FinanceDialog>
    </div>
  );
}
