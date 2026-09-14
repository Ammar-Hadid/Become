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
import {
  AudienceFields,
  AudienceSummary,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import type { getBusinessReceiptWorkspace } from "@/features/finance/business-receipts/queries/business-receipt.query";

type ReceiptWorkspace = Awaited<ReturnType<typeof getBusinessReceiptWorkspace>>;
function ReceiptFields({
  companies,
  niches,
  people,
  segments,
  offers,
  currency,
}: Pick<
  ReceiptWorkspace,
  "companies" | "niches" | "people" | "segments" | "offers"
> & { currency: string }) {
  const [revisionId, setRevisionId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [businessContext, setBusinessContext] = useState(false);
  const revision = offers.find((offer) => offer.id === revisionId);
  const audienceTest = revision?.offer.mode === "AUDIENCE_TEST";
  const engagement =
    revision?.offer.engagements.find((item) => item.id === engagementId) ??
    (!audienceTest ? revision?.offer.engagements[0] : undefined);
  return (
    <>
      <CaptureKey />
      <FinanceSelect
        label="Offer terms · optional"
        name="offerRevisionId"
        value={revisionId}
        onChange={(event) => {
          setRevisionId(event.target.value);
          setEngagementId("");
        }}
      >
        <option value="">Audience context only</option>
        {offers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title} · revision {o.version}
          </option>
        ))}
      </FinanceSelect>
      {audienceTest && (
        <FinanceSelect
          label="Recipient response"
          name="engagementId"
          value={engagementId}
          onChange={(event) => setEngagementId(event.target.value)}
          required
        >
          <option value="">Choose the recipient who paid</option>
          {revision.offer.engagements.map((item) => (
            <option key={item.id} value={item.id}>
              {[item.personSnapshot, item.companySnapshot, item.audienceLabel]
                .filter(Boolean)
                .join(" · ") || "Unnamed recipient"}
            </option>
          ))}
        </FinanceSelect>
      )}
      {revision ? (
        <div className="rounded-control border-border p-lg border">
          <p className="field-label">
            {engagement ? "Receipt recipient" : "Offer audience"}
          </p>
          <p className="text-body mt-sm">
            <AudienceSummary
              {...(engagement ?? {
                audienceContext: revision.audienceContext,
                personSnapshot: revision.personSnapshot,
                companySnapshot: revision.companySnapshot,
                audienceLabel: revision.audienceLabel,
              })}
            />
          </p>
          <p className="business-hint text-body-sm text-text-muted mt-md">
            The saved attribution uses this recipient and these exact terms.
          </p>
          {audienceTest && !revision.offer.engagements.length && (
            <p className="business-hint text-body-sm text-text-muted mt-md">
              Record a recipient response on the offer before linking their
              payment.
            </p>
          )}
        </div>
      ) : (
        <AudienceFields
          companies={companies}
          people={people}
          segments={segments}
          identityLabel="Who paid?"
          open
          recipient
          onBusinessContextChange={setBusinessContext}
        />
      )}
      <FinanceSelect
        key={revisionId}
        label="Exploration"
        name="nicheId"
        defaultValue={
          revision?.offer.niches.length === 1
            ? revision.offer.niches[0].nicheId
            : ""
        }
        required={
          revision ? revision.offer.niches.length !== 1 : !businessContext
        }
      >
        <option value="">
          {businessContext && !revision
            ? "No exploration context"
            : "Choose an exploration"}
        </option>
        {niches.map((niche) => (
          <option value={niche.id} key={niche.id}>
            {niche.name}
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
      title="Attribute an Entrepreneurship receipt"
      triggerLabel="Attribute receipt"
      description="Connect part of this actual income to its audience, recipient, and optional offer terms. This does not record more income."
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
          description="The Finance source changed. Confirm the recipient, offer terms and allocated amount still describe this receipt."
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
