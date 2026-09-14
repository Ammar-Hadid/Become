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
import {
  AudienceSummary,
  type AudienceFieldValue,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
export function CompanyReceiptForm({
  companyId,
  receipts,
  offers,
  offerRevisionId,
  engagementId,
  nicheId,
  audience,
  explorationOptions = [],
}: {
  companyId?: string;
  offerRevisionId?: string;
  engagementId?: string;
  nicheId?: string;
  audience?: AudienceFieldValue;
  explorationOptions?: { id: string; name: string }[];
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
      description="Select money already received, then confirm the part belonging to this recipient and these offer terms. A WorkSource link never attributes history automatically."
    >
      <RecordForm
        action={(form) =>
          allocateBusinessReceiptAction(String(form.get("transactionId")), form)
        }
        closeOnSuccess
        submitLabel="Confirm attribution"
      >
        <CaptureKey />
        {companyId && (
          <input type="hidden" name="companyId" value={companyId} />
        )}
        {nicheId && <input type="hidden" name="nicheId" value={nicheId} />}
        {engagementId && (
          <input type="hidden" name="engagementId" value={engagementId} />
        )}
        {audience && (
          <>
            <p className="text-body">
              <AudienceSummary {...audience} />
            </p>
            <input
              type="hidden"
              name="marketType"
              value={audience.audienceContext?.marketType ?? "UNKNOWN"}
            />
            <input
              type="hidden"
              name="audienceDescription"
              value={audience.audienceContext?.description ?? ""}
            />
            {audience.audienceContext?.segments.map((segment) => (
              <input
                type="hidden"
                name="segmentIds"
                value={segment.segmentId}
                key={segment.segmentId}
              />
            ))}
            <input
              type="hidden"
              name="identityKind"
              value={
                audience.identityKind ??
                (companyId ? "BUSINESS" : "UNSPECIFIED")
              }
            />
            {audience.personId && (
              <input type="hidden" name="personId" value={audience.personId} />
            )}
            {audience.audienceLabel && (
              <input
                type="hidden"
                name="audienceLabel"
                value={audience.audienceLabel}
              />
            )}
          </>
        )}
        {!audience && companyId && (
          <input type="hidden" name="identityKind" value="BUSINESS" />
        )}
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
        {!nicheId && explorationOptions.length > 0 && (
          <FinanceSelect
            label="Exploration"
            name="nicheId"
            required={!companyId}
          >
            <option value="">Choose an exploration</option>
            {explorationOptions.map((exploration) => (
              <option key={exploration.id} value={exploration.id}>
                {exploration.name}
              </option>
            ))}
          </FinanceSelect>
        )}
        {receipt && (
          <p role="status" className="business-hint">
            {formatMoney(receipt.remaining, receipt.currency)} remaining
            available for Entrepreneurship attribution. Session allocation is
            independent.
          </p>
        )}
        <FinanceSelect
          label={
            engagementId
              ? "Recipient's offer terms"
              : "Shared offer revision · optional"
          }
          name="offerRevisionId"
          defaultValue={offerRevisionId ?? ""}
          required={Boolean(engagementId)}
        >
          {!engagementId && <option value="">Audience context only</option>}
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
