"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { WorkSourceChoiceFields } from "@/features/entrepreneurship/market/components/company-work-source.component";
import { ReusableEntityCombobox } from "@/components/ui/forms/reusable-entity-combobox.component";
import { supportedCurrencyOptions } from "@/lib/money/utils/money.util";
import { ObservationEntries } from "@/features/entrepreneurship/observations/components/observation-entries.component";
import { useState } from "react";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  saveOfferAction,
  offerEventAction,
  offerContinuationAction,
} from "@/features/entrepreneurship/offers/actions/offer.action";
import {
  businessToday,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";
type QuoteInitial = {
  title: string;
  scope: string;
  terms: string | null;
  priceBasis: string;
  amount: string;
  currency: string;
  unitLabel: string | null;
  intervalUnit: string | null;
  intervalCount: number | null;
};
function QuoteFields({
  companies,
  problems,
  companyId,
  initial,
}: {
  companies: BusinessOption[];
  problems: BusinessOption[];
  companyId?: string;
  initial?: QuoteInitial;
}) {
  const exploration = useExploration();
  const [basis, setBasis] = useState(initial?.priceBasis ?? "FIXED");
  return (
    <>
      <CaptureKey />
      {!initial && exploration && !exploration.archived && (
        <>
          <input type="hidden" name="nicheId" value={exploration.id} />
          <p className="business-hint">Offer context: {exploration.name}.</p>
        </>
      )}
      {companyId ? (
        <input type="hidden" name="companyId" value={companyId} />
      ) : (
        <BusinessSelect label="Company" name="companyId" required>
          <option value="">Choose a company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </BusinessSelect>
      )}
      <BusinessField
        label="Offer title"
        name="title"
        value={initial?.title}
        required
      />
      <BusinessField
        label="Scope & deliverables"
        name="scope"
        multiline
        value={initial?.scope}
        required
      />
      <label className="field-label">
        Pricing basis
        <select
          className="text-input mt-sm"
          name="priceBasis"
          value={basis}
          onChange={(event) => setBasis(event.target.value)}
        >
          <option value="FIXED">Fixed quote</option>
          <option value="HOURLY">Hourly quote</option>
          <option value="PER_UNIT">Per-unit quote</option>
          <option value="RECURRING">Recurring quote</option>
        </select>
      </label>
      <div className="gap-lg grid grid-cols-2">
        <BusinessField
          label="Amount"
          name="amount"
          value={initial?.amount}
          hint="Blank = unknown. Zero = free."
        />
        <ReusableEntityCombobox
          label="Currency"
          entityName="currency"
          idFieldName="currency"
          queryFieldName="currencySearch"
          options={supportedCurrencyOptions()}
          initialId={initial?.currency ?? "EUR"}
          optional={false}
          required
          placeholder="Find a supported currency…"
        />
      </div>
      {basis === "PER_UNIT" && (
        <BusinessField
          label="Unit"
          name="unitLabel"
          value={initial?.unitLabel}
          required
        />
      )}
      {basis === "RECURRING" && (
        <div className="gap-lg grid grid-cols-2">
          <BusinessField
            label="Every"
            name="intervalCount"
            type="number"
            value={String(initial?.intervalCount ?? 1)}
            required
          />
          <BusinessSelect
            label="Interval"
            name="intervalUnit"
            value={initial?.intervalUnit ?? "MONTH"}
          >
            <option value="DAY">Day(s)</option>
            <option value="WEEK">Week(s)</option>
            <option value="MONTH">Month(s)</option>
            <option value="YEAR">Year(s)</option>
          </BusinessSelect>
        </div>
      )}
      <details className="business-disclosure">
        <summary>Terms, expiry & related problems</summary>
        <div>
          <BusinessField
            label="Terms"
            name="terms"
            multiline
            value={initial?.terms}
          />
          <BusinessField label="Quote expiry" name="expiresOn" type="date" />
          <fieldset>
            <legend className="field-label">
              Problems addressed · optional
            </legend>
            <div className="business-evidence-choices">
              {problems.map((problem) => (
                <label key={problem.id}>
                  <input name="problemIds" type="checkbox" value={problem.id} />
                  {problem.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
      <p className="business-hint">
        Saving creates a draft revision. Record a proposal only after you
        actually share these terms.
      </p>
    </>
  );
}
export function OfferForm(
  props: Parameters<typeof QuoteFields>[0] & { offerId?: string },
) {
  const router = useRouter();
  return (
    <RecordDialog
      eyebrow="Make the value concrete"
      triggerLabel={props.offerId ? "Revise terms" : "Shape an offer"}
      title={props.offerId ? "Create a new revision" : "Shape an offer"}
      variant={props.offerId ? "secondary" : "primary"}
      description="A clear scope and an honest quote. Outcomes will have their own place."
    >
      <RecordForm
        action={saveOfferAction.bind(null, props.offerId ?? null)}
        closeOnSuccess
        submitLabel="Save draft revision"
        onSaved={(result) => {
          if (result.id) router.push(`/entrepreneurship/offers/${result.id}`);
        }}
      >
        <QuoteFields {...props} />
      </RecordForm>
    </RecordDialog>
  );
}
export function OfferEventForm({
  offerId,
  revisions,
  interactions,
  problems,
}: {
  offerId: string;
  revisions: BusinessOption[];
  problems: BusinessOption[];
  interactions: { id: string; revisionId: string; name: string }[];
}) {
  const exploration = useExploration();
  return (
    <RecordDialog
      eyebrow="An actual outcome"
      triggerLabel="Record outcome"
      title="What happened to this offer?"
      description="Acceptance records a choice. Only an actual Finance receipt records money received."
    >
      <RecordForm
        action={offerEventAction.bind(null, offerId)}
        closeOnSuccess
        submitLabel="Record outcome"
      >
        <CaptureKey />
        {exploration && !exploration.archived && (
          <>
            <input type="hidden" name="nicheId" value={exploration.id} />
            <p className="business-hint">
              New observations belong to {exploration.name}. A selected source
              interaction keeps its original niche context.
            </p>
          </>
        )}

        <BusinessSelect label="Quoted revision" name="offerRevisionId" required>
          {revisions.map((revision) => (
            <option key={revision.id} value={revision.id}>
              {revision.name}
            </option>
          ))}
        </BusinessSelect>
        <BusinessSelect label="Event" name="kind">
          {[
            "PROPOSED",
            "ACCEPTED",
            "REJECTED",
            "WITHDRAWN",
            "EXPIRED",
            "SUPERSEDED",
            "CANCELLED",
          ].map((kind) => (
            <option key={kind} value={kind}>
              {humanize(kind)}
            </option>
          ))}
        </BusinessSelect>
        <BusinessField
          label="Date"
          name="occurredAt"
          type="date"
          value={businessToday()}
          required
        />
        <BusinessField
          label="Source or reason"
          name="sourceDescription"
          multiline
          required
        />
        <BusinessSelect
          label="Source interaction · optional"
          name="interaction"
        >
          <option value="">Recorded manually</option>
          {interactions.map((interaction) => (
            <option
              key={interaction.id}
              value={`${interaction.id}:${interaction.revisionId}`}
            >
              {interaction.name}
            </option>
          ))}
        </BusinessSelect>
        <p className="business-hint">
          If you add an observation, select its source interaction above or
          describe what you directly saw or heard in the source field. Recording
          an outcome alone creates no observation.
        </p>
        <ObservationEntries problems={problems} />
      </RecordForm>
    </RecordDialog>
  );
}
export function OfferContinuationForm({
  offerId,
  workSources,
}: {
  offerId: string;
  workSources: BusinessOption[];
}) {
  const [choice, setChoice] = useState("NOT_NOW");
  return (
    <RecordDialog
      eyebrow="After acceptance"
      triggerLabel="Choose how to continue"
      title="Keep the work connected"
      variant="secondary"
      description="Link a Finance work source when it helps you record paid work. Entrepreneurship delivery sessions remain their own time records."
    >
      <RecordForm
        action={offerContinuationAction.bind(null, offerId)}
        closeOnSuccess
        submitLabel="Save choice"
      >
        <CaptureKey />

        <label className="field-label">
          Next step
          <select
            className="text-input mt-sm"
            name="choice"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="NOT_NOW">Not now</option>
            <option value="LINKED">Create / Link WorkSource</option>
            <option value="NOT_NEEDED">No work-source link needed</option>
          </select>
        </label>
        {choice === "LINKED" && (
          <WorkSourceChoiceFields workSources={workSources} />
        )}
      </RecordForm>
    </RecordDialog>
  );
}
