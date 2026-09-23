"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { WorkSourceChoiceFields } from "@/features/entrepreneurship/market/components/company-work-source.component";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import { ObservationEntries } from "@/features/entrepreneurship/observations/components/observation-entries.component";
import { useState } from "react";
import {
  AudienceFields,
  AudienceSummary,
  type AudienceFieldValue,
  type AudienceOption,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  BusinessField,
  BusinessFormSection,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  saveOfferAction,
  offerEventAction,
  offerContinuationAction,
  addOfferResponseAction,
} from "@/features/entrepreneurship/offers/actions/offer.action";
import {
  businessToday,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";
type QuoteInitial = AudienceFieldValue & {
  version: number;
  title: string;
  scope: string;
  terms: string | null;
  priceBasis: string;
  amount: string;
  currency: string;
  unitLabel: string | null;
  intervalUnit: string | null;
  intervalCount: number | null;
  mode?: string;
  problems?: { problemId: string }[];
  expiresOn?: Date | null;
};
function QuoteFields({
  companies,
  people = [],
  segments = [],
  problems,
  companyId,
  initial,
  mode: initialMode,
}: {
  companies: BusinessOption[];
  people?: BusinessOption[];
  segments?: AudienceOption[];
  problems: BusinessOption[];
  companyId?: string;
  initial?: QuoteInitial;
  mode?: string;
}) {
  const exploration = useExploration();
  const [basis, setBasis] = useState(initial?.priceBasis ?? "FIXED");
  const [mode, setMode] = useState(
    initialMode ?? initial?.mode ?? (companyId ? "SPECIFIC" : "AUDIENCE_TEST"),
  );
  return (
    <>
      <CaptureKey />
      {initial && (
        <input type="hidden" name="expectedVersion" value={initial.version} />
      )}
      {!initial && exploration && !exploration.archived && (
        <>
          <input type="hidden" name="nicheId" value={exploration.id} />
          <p className="business-hint">Offer context: {exploration.name}.</p>
        </>
      )}
      <BusinessFormSection
        eyebrow="Value"
        title="What you are offering"
        description="Keep the promise and its boundary together."
      >
        {initial || initialMode ? (
          <input type="hidden" name="mode" value={mode} />
        ) : (
          <fieldset className="gap-sm grid sm:grid-cols-2">
            <legend className="mb-sm text-body font-medium">
              How do you want to try this offer?
            </legend>
            {[
              [
                "AUDIENCE_TEST",
                "With an audience",
                "One set of terms, separate responses.",
              ],
              [
                "SPECIFIC",
                "With someone specific",
                "A proposal for a person or business.",
              ],
            ].map(([id, label, hint]) => (
              <label
                key={id}
                className={`rounded-control p-lg text-body cursor-pointer border ${mode === id ? "border-primary/40 bg-primary/5" : "border-border text-text-secondary"}`}
              >
                <span className="gap-sm flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value={id}
                    checked={mode === id}
                    onChange={() => setMode(id)}
                    className="accent-primary"
                  />
                  {label}
                </span>
                <span className="mt-sm text-body-sm text-text-muted block">
                  {hint}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {initial && mode === "SPECIFIC" && (
          <div className="rounded-control border-border p-lg border">
            <p className="field-label">Specific recipient</p>
            <p className="text-body mt-sm">
              <AudienceSummary {...initial} />
            </p>
            <p className="business-hint mt-sm">
              These revisions keep the original recipient. Create another offer
              for someone else.
            </p>
            {initial.personId && (
              <input type="hidden" name="personId" value={initial.personId} />
            )}
            {initial.companyId && (
              <input type="hidden" name="companyId" value={initial.companyId} />
            )}
            <input
              type="hidden"
              name="identityKind"
              value={initial.identityKind ?? "UNSPECIFIED"}
            />
            {initial.audienceLabel && (
              <input
                type="hidden"
                name="audienceLabel"
                value={initial.audienceLabel}
              />
            )}
          </div>
        )}
        <AudienceFields
          people={people}
          companies={companies}
          segments={segments}
          target={mode === "AUDIENCE_TEST" || Boolean(initial)}
          recipient={mode === "SPECIFIC" && !initial}
          identityLabel="Specific recipient"
          open
          value={
            initial ??
            (companyId ? { companyId, identityKind: "BUSINESS" } : undefined)
          }
        />
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
      </BusinessFormSection>
      <BusinessFormSection
        eyebrow="Terms"
        title="How the quote works"
        description="Unknown and free are different; the amount can stay blank."
      >
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
          <CurrencySelect
            name="currency"
            defaultValue={initial?.currency ?? "EUR"}
            required
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
      </BusinessFormSection>
      <details className="business-disclosure">
        <summary>Terms, expiry & related problems</summary>
        <div>
          <BusinessField
            label="Terms"
            name="terms"
            multiline
            value={initial?.terms}
          />
          <BusinessField
            label="Quote expiry"
            name="expiresOn"
            type="date"
            value={initial?.expiresOn?.toISOString().slice(0, 10)}
          />
          <fieldset>
            <legend className="field-label">
              Problems addressed · optional
            </legend>
            <div className="business-evidence-choices">
              {problems.map((problem) => (
                <label key={problem.id}>
                  <input
                    name="problemIds"
                    type="checkbox"
                    value={problem.id}
                    defaultChecked={initial?.problems?.some(
                      (link) => link.problemId === problem.id,
                    )}
                  />
                  {problem.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
      <p className="business-hint">
        Saving creates a draft revision. Record sharing only after you actually
        share these terms.
      </p>
    </>
  );
}
export function OfferForm(
  props: Parameters<typeof QuoteFields>[0] & { offerId?: string },
) {
  const router = useRouter();
  const exploration = useExploration();
  if (exploration?.archived) return null;
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
  mode = "SPECIFIC",
  engagementId,
  segments = [],
}: {
  offerId: string;
  revisions: BusinessOption[];
  problems: BusinessOption[];
  interactions: { id: string; revisionId: string; name: string }[];
  mode?: string;
  engagementId?: string;
  segments?: AudienceOption[];
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      eyebrow="An actual outcome"
      triggerLabel={
        mode === "AUDIENCE_TEST" && !engagementId
          ? "Record sharing or closure"
          : "Record outcome"
      }
      title={
        mode === "AUDIENCE_TEST" && !engagementId
          ? "Where is this offer test?"
          : "What happened to this proposal?"
      }
      description={
        mode === "AUDIENCE_TEST" && !engagementId
          ? "Keep the test’s sharing and closure separate from each recipient’s response."
          : "Acceptance records a choice. Only an actual Finance receipt records money received."
      }
    >
      <RecordForm
        action={offerEventAction.bind(null, offerId)}
        closeOnSuccess
        submitLabel="Record outcome"
      >
        <CaptureKey />
        {engagementId && (
          <input type="hidden" name="engagementId" value={engagementId} />
        )}
        {exploration && !exploration.archived && (
          <>
            <input type="hidden" name="nicheId" value={exploration.id} />
            <p className="business-hint">
              New observations belong to {exploration.name}. A selected source
              interaction keeps its original exploration context.
            </p>
          </>
        )}

        <BusinessFormSection
          eyebrow="Outcome"
          title="The event that happened"
          description="Tie the outcome to the terms and source that actually existed."
        >
          <BusinessSelect
            label="Quoted revision"
            name="offerRevisionId"
            required
          >
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.name}
              </option>
            ))}
          </BusinessSelect>
          <div className="gap-lg grid grid-cols-2">
            <BusinessSelect label="Event" name="kind">
              {(mode === "AUDIENCE_TEST"
                ? !engagementId
                  ? ["SHARED", "CLOSED", "REOPENED"]
                  : [
                      "INTERESTED",
                      "ACCEPTED",
                      "REJECTED",
                      "WITHDRAWN",
                      "CANCELLED",
                    ]
                : [
                    "PROPOSED",
                    "ACCEPTED",
                    "REJECTED",
                    "WITHDRAWN",
                    "EXPIRED",
                    "SUPERSEDED",
                    "CANCELLED",
                  ]
              ).map((kind) => (
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
          </div>
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
            Recording an outcome alone creates no observation.
          </p>
        </BusinessFormSection>
        <p className="business-hint">
          If you add an observation, select its source interaction above or
          describe what you directly saw or heard in the source field.
        </p>
        <ObservationEntries problems={problems} segments={segments} />
      </RecordForm>
    </RecordDialog>
  );
}
export function OfferContinuationForm({
  offerId,
  workSources,
  engagementId,
}: {
  offerId: string;
  workSources: BusinessOption[];
  engagementId?: string;
}) {
  const [choice, setChoice] = useState("NOT_NOW");
  const exploration = useExploration();
  if (exploration?.archived) return null;
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
        {engagementId && (
          <input type="hidden" name="engagementId" value={engagementId} />
        )}

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

export function OfferResponseForm({
  offerId,
  revisions,
  interactions,
  people = [],
  companies = [],
  segments = [],
}: {
  offerId: string;
  revisions: BusinessOption[];
  interactions: { id: string; revisionId: string; name: string }[];
  people?: BusinessOption[];
  companies?: BusinessOption[];
  segments?: AudienceOption[];
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      eyebrow="One recipient’s response"
      title="Add a response"
      triggerLabel="Add response"
      description="Keep this person’s or business’s response against the exact terms they saw. Each response has its own history."
    >
      <RecordForm
        action={addOfferResponseAction.bind(null, offerId)}
        submitLabel="Save response"
        closeOnSuccess
      >
        <CaptureKey />
        <BusinessSelect
          label="Terms they responded to"
          name="offerRevisionId"
          value={revisions[0]?.id}
          required
        >
          {revisions.map((revision) => (
            <option key={revision.id} value={revision.id}>
              {revision.name}
            </option>
          ))}
        </BusinessSelect>
        <AudienceFields
          people={people}
          companies={companies}
          segments={segments}
          identityLabel="Who responded?"
          recipient
          open
        />
        <div className="gap-lg grid sm:grid-cols-2">
          <BusinessSelect label="Response" name="kind">
            <option value="INTERESTED">Interested</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Declined</option>
          </BusinessSelect>
          <BusinessField
            label="Date"
            name="occurredAt"
            type="date"
            required
            value={businessToday()}
          />
        </div>
        <BusinessField
          label="What did they say or do?"
          name="sourceDescription"
          multiline
          required
        />
        <BusinessSelect
          label="Recorded source interaction · optional"
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
          A declined response belongs to this recipient. It does not reject the
          whole audience test. Link an actual Finance receipt to record payment.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
