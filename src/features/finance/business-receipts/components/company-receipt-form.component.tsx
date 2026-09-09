"use client";
import { useState } from "react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { allocateBusinessReceiptAction } from "@/features/finance/business-receipts/actions/business-receipt.action";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
export function CompanyReceiptForm({
  companyId,
  receipts,
  offers,
  offerRevisionId,
}: {
  companyId: string;
  offerRevisionId?: string;
  receipts: { id: string; name: string; currency: string; remaining: string }[];
  offers: { id: string; title: string; version: number }[];
}) {
  const [receiptId, setReceiptId] = useState("");
  const receipt = receipts.find((r) => r.id === receiptId);
  return (
    <RecordDialog
      eyebrow="Actual Finance income"
      triggerLabel="Attribute existing receipt"
      title="Attribute an existing Finance receipt"
      variant="secondary"
      description="Select money already received, then explicitly confirm the part belonging to this company. A WorkSource link never attributes history automatically."
    >
      <RecordForm
        action={(form) =>
          allocateBusinessReceiptAction(String(form.get("transactionId")), form)
        }
        closeOnSuccess
        submitLabel="Confirm attribution"
      >
        <CaptureKey />
        <input type="hidden" name="companyId" value={companyId} />
        <FinanceSelect
          label="Finance receipt"
          name="transactionId"
          required
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
        >
          <option value="">Choose eligible income</option>
          {receipts.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </FinanceSelect>
        {receipt && (
          <p role="status" className="business-hint">
            {formatMoney(receipt.remaining, receipt.currency)} remaining
            unallocated to companies. Session allocation is independent.
          </p>
        )}
        <FinanceSelect
          label="Proposed offer revision · optional"
          name="offerRevisionId"
          defaultValue={offerRevisionId ?? ""}
        >
          <option value="">Company only</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} · revision {o.version}
            </option>
          ))}
        </FinanceSelect>
        <FinanceField
          key={receiptId}
          label={`Amount to attribute${receipt ? ` (${receipt.currency})` : ""}`}
          name="amount"
          required
          inputMode="decimal"
          defaultValue={
            receipt
              ? moneyDecimal(BigInt(receipt.remaining), receipt.currency)
              : ""
          }
        />
        <FinanceField label="Attribution note · optional" name="note" />
        {!receipts.length && (
          <p className="business-hint">
            No eligible receipts yet. Close this dialog and choose “Record
            receipt in Finance”.
          </p>
        )}
      </RecordForm>
    </RecordDialog>
  );
}
