"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { useState } from "react";
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
  AudienceFields,
  type AudienceOption,
  type AudienceFieldValue,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  createProblemAction,
  linkEvidenceAction,
  recordObservationAction,
  assessProblemAction,
  reconfirmEvidenceAction,
  linkReceiptEvidenceAction,
  changeProblemAudienceAction,
} from "@/features/entrepreneurship/problems/actions/problem.action";
import {
  businessToday,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";

export function ProblemForm({
  niches,
  segments = [],
}: {
  niches: BusinessOption[];
  segments?: AudienceOption[];
}) {
  const exploration = useExploration();
  const router = useRouter();
  return (
    <RecordDialog
      eyebrow="A belief to examine"
      triggerLabel="Frame a problem"
      title="Frame a problem"
      description="Write the claim before the evidence changes your mind. The original belief stays in its history."
    >
      <RecordForm
        action={createProblemAction}
        closeOnSuccess
        submitLabel="Keep this problem"
        onSaved={(result) => {
          if (result.id) router.push(`/entrepreneurship/problems/${result.id}`);
        }}
      >
        <CaptureKey />
        <BusinessFormSection
          eyebrow="The claim"
          title="A belief worth testing"
          description="State it clearly enough that evidence could change your mind."
        >
          <BusinessField label="Problem title" name="title" required />
          <BusinessField
            label="What do you believe is happening?"
            name="initialStatement"
            multiline
            required
          />
        </BusinessFormSection>
        <AudienceFields segments={segments} target open />
        <BusinessFormSection
          eyebrow="Boundary"
          title="Where the belief belongs"
        >
          <BusinessSelect label="Where did this start?" name="origin">
            <option value="USER_HYPOTHESIS">My hypothesis</option>
            <option value="OBSERVATION_LED">Prompted by an observation</option>
          </BusinessSelect>
          <BusinessSelect
            label="Exploration · optional"
            name="nicheId"
            value={exploration?.archived ? "" : (exploration?.id ?? "")}
          >
            <option value="">No exploration</option>
            {niches.map((niche) => (
              <option value={niche.id} key={niche.id}>
                {niche.name}
              </option>
            ))}
          </BusinessSelect>
        </BusinessFormSection>
      </RecordForm>
    </RecordDialog>
  );
}
export function EvidenceInterpretationFields() {
  return (
    <>
      <BusinessSelect label="What does it add?" name="stance">
        <option value="CONTEXT">Context</option>
        <option value="SUPPORTS">Supports the problem</option>
        <option value="CONTRADICTS">Contradicts the problem</option>
      </BusinessSelect>
      <BusinessField
        label="Your interpretation"
        name="explanation"
        multiline
        required
        hint="Be specific about what this source supports or challenges. A reported experience is not a measured prevalence."
      />
    </>
  );
}
export function ReceiptEvidenceForm({
  problemId,
  receipts,
}: {
  problemId: string;
  receipts: BusinessOption[];
}) {
  return (
    <RecordDialog
      eyebrow="An actual financial fact"
      title="Use receipt evidence"
      triggerLabel="Link a receipt"
      variant="quiet"
      description="A payment can support a narrowly stated claim. It does not prove the entire problem or establish profitability."
    >
      <RecordForm
        action={linkReceiptEvidenceAction.bind(null, problemId)}
        closeOnSuccess
        submitLabel="Link receipt evidence"
      >
        <CaptureKey />
        <BusinessSelect
          label="Confirmed receipt attribution"
          name="receiptAllocationId"
          required
        >
          <option value="">Choose attributed income</option>
          {receipts.map((receipt) => (
            <option key={receipt.id} value={receipt.id}>
              {receipt.name}
            </option>
          ))}
        </BusinessSelect>
        <EvidenceInterpretationFields />
      </RecordForm>
    </RecordDialog>
  );
}
export function LinkEvidenceForm({
  problemId,
  observations,
}: {
  problemId: string;
  observations: { id: string; revisionId: string; name: string }[];
}) {
  return (
    <RecordDialog
      eyebrow="Trace the belief"
      triggerLabel="Link an observation"
      title="Link an observation"
      variant="secondary"
    >
      <RecordForm
        action={linkEvidenceAction.bind(null, problemId)}
        closeOnSuccess
        submitLabel="Link source"
      >
        <CaptureKey />
        <BusinessSelect label="Observation" name="observation" required>
          <option value="">Choose a recorded observation</option>
          {observations.map((observation) => (
            <option
              key={observation.id}
              value={`${observation.id}:${observation.revisionId}`}
            >
              {observation.name}
            </option>
          ))}
        </BusinessSelect>
        <EvidenceInterpretationFields />
      </RecordForm>
    </RecordDialog>
  );
}
export function ObservationFields({
  companies,
  people = [],
  segments = [],
  niches = [],
  interactions,
  problemId,
  initialSource,
}: {
  companies: BusinessOption[];
  people?: BusinessOption[];
  segments?: AudienceOption[];
  niches?: BusinessOption[];
  interactions: { id: string; revisionId: string; name: string }[];
  problemId: string | null;
  initialSource?: "DIRECT_OBSERVATION" | "PUBLIC_SOURCE";
}) {
  const exploration = useExploration();
  const [source, setSource] = useState<string>(
    initialSource ?? "DIRECT_OBSERVATION",
  );
  const [audienceOverride, setAudienceOverride] = useState(false);
  return (
    <>
      <CaptureKey />
      {source !== "INTERACTION" && exploration && !exploration.archived && (
        <>
          <input type="hidden" name="nicheId" value={exploration.id} />
          <p className="business-hint">Observed in {exploration.name}.</p>
        </>
      )}
      <BusinessFormSection
        eyebrow="Observation"
        title="What you saw or heard"
        description="Keep the source words separate from your interpretation."
      >
        <BusinessField
          label="Statement or behavior"
          name="statement"
          multiline
          required
        />
        <div className="gap-lg grid grid-cols-2">
          <BusinessSelect
            label="Kind"
            name="kind"
            value={
              initialSource === "DIRECT_OBSERVATION"
                ? "OBSERVED_BEHAVIOR"
                : initialSource === "PUBLIC_SOURCE"
                  ? "CONTEXT"
                  : "CUSTOMER_STATEMENT"
            }
          >
            <option value="CUSTOMER_STATEMENT">Customer statement</option>
            <option value="OBSERVED_BEHAVIOR">Observed behavior</option>
            <option value="INTEREST">Interest</option>
            <option value="COMMITMENT">Commitment</option>
            <option value="CONTEXT">Context</option>
          </BusinessSelect>
          <BusinessSelect label="Wording" name="wordingMode">
            <option value="PARAPHRASE">Paraphrase</option>
            <option value="QUOTE">Exact quote</option>
          </BusinessSelect>
        </div>
        <BusinessField
          label="Date observed"
          name="observedAt"
          type="date"
          value={businessToday()}
          required
        />
        {source !== "INTERACTION" && (
          <AudienceFields
            people={people}
            segments={segments}
            companies={companies}
          />
        )}
        {source !== "INTERACTION" && !exploration && (
          <BusinessSelect label="Exploration · optional" name="nicheId">
            <option value="">No exploration</option>
            {niches.map((niche) => (
              <option key={niche.id} value={niche.id}>
                {niche.name}
              </option>
            ))}
          </BusinessSelect>
        )}
      </BusinessFormSection>
      <BusinessFormSection eyebrow="Traceability" title="Where it came from">
        {initialSource ? (
          <input type="hidden" name="sourceKind" value={initialSource} />
        ) : (
          <label className="field-label">
            Source
            <select
              className="text-input mt-sm"
              name="sourceKind"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="DIRECT_OBSERVATION">
                I observed this directly
              </option>
              <option value="INTERACTION">A recorded interaction</option>
              <option value="PUBLIC_SOURCE">A public source</option>
            </select>
          </label>
        )}
        {source === "PUBLIC_SOURCE" && (
          <BusinessField
            label="Source URL"
            name="sourceUrl"
            type="url"
            required
          />
        )}
        {source === "INTERACTION" && (
          <BusinessSelect
            label="Source interaction"
            name="interaction"
            required
          >
            <option value="">Choose the interaction</option>
            {interactions.map((item) => (
              <option key={item.id} value={`${item.id}:${item.revisionId}`}>
                {item.name}
              </option>
            ))}
          </BusinessSelect>
        )}
        {source === "INTERACTION" && (
          <details className="business-disclosure">
            <summary>Audience attribution</summary>
            <div>
              <label className="business-choice-row">
                <input
                  type="checkbox"
                  name="audienceOverride"
                  checked={audienceOverride}
                  onChange={(event) =>
                    setAudienceOverride(event.target.checked)
                  }
                />
                This observation concerns a narrower audience
              </label>
              {audienceOverride ? (
                <>
                  <AudienceFields target open segments={segments} />
                  <BusinessField
                    label="Why this attribution?"
                    name="audienceReason"
                    multiline
                    required
                    hint="Keep the source identity. Explain which part of the interaction supports this narrower boundary."
                  />
                </>
              ) : (
                <p className="business-hint">
                  Keeps the recorded interaction's audience and source identity.
                </p>
              )}
            </div>
          </details>
        )}
        <BusinessField
          label="Source excerpt or context"
          name="sourceDescription"
          multiline
          required
          hint="Keep the relevant words, or describe where and how you observed the behavior."
        />
      </BusinessFormSection>
      {problemId && (
        <BusinessFormSection eyebrow="Meaning" title="Your interpretation">
          <EvidenceInterpretationFields />
        </BusinessFormSection>
      )}
    </>
  );
}
export function ProblemAudienceForm({
  problemId,
  expectedVersion,
  value,
  segments,
}: {
  problemId: string;
  expectedVersion: number;
  value: AudienceFieldValue;
  segments: AudienceOption[];
}) {
  return (
    <RecordDialog
      eyebrow="A clearer boundary"
      title="Refine the problem audience"
      triggerLabel="Refine audience"
      variant="secondary"
      description="Save a new audience boundary. Earlier assessments retain the scope they used at the time."
    >
      <RecordForm
        action={changeProblemAudienceAction.bind(
          null,
          problemId,
          expectedVersion,
        )}
        submitLabel="Save audience boundary"
        closeOnSuccess
      >
        <CaptureKey />
        <AudienceFields target open value={value} segments={segments} />
        <BusinessField
          name="rationale"
          label="Why refine this audience?"
          multiline
          required
        />
      </RecordForm>
    </RecordDialog>
  );
}
export function ObservationForm(
  props: Parameters<typeof ObservationFields>[0],
) {
  return (
    <RecordDialog
      eyebrow="Market voice"
      triggerLabel="Keep an observation"
      title="Keep an observation"
      variant="secondary"
      description="Separate what you saw or heard from what you think it means."
    >
      <RecordForm
        action={recordObservationAction.bind(null, props.problemId)}
        closeOnSuccess
        submitLabel="Save observation"
      >
        <ObservationFields {...props} />
      </RecordForm>
    </RecordDialog>
  );
}
export function AssessmentForm({
  problemId,
  evidence,
}: {
  problemId: string;
  evidence: {
    id: string;
    name: string;
    stance: string;
    review: boolean;
    company: string;
    source: string;
    href?: string;
  }[];
}) {
  return (
    <RecordDialog
      eyebrow="Your judgment, with a boundary"
      triggerLabel="Record assessment"
      title="What does the evidence suggest?"
      description="This is your judgment about a stated scope. It does not turn a claim into universal truth."
    >
      <RecordForm
        action={assessProblemAction.bind(null, problemId)}
        closeOnSuccess
        submitLabel="Record judgment"
      >
        <CaptureKey />
        <BusinessFormSection
          eyebrow="Judgment"
          title="What the evidence suggests"
          description="Make the scope and reasoning as explicit as the conclusion."
        >
          <BusinessSelect label="Assessment" name="state">
            <option value="INVESTIGATING">Investigating</option>
            <option value="SUPPORTED_FOR_SCOPE">
              Supported for this scope
            </option>
            <option value="INCONCLUSIVE">Inconclusive</option>
            <option value="REJECTED">Rejected</option>
          </BusinessSelect>
          <BusinessField
            label="Scope of this judgment"
            name="scope"
            multiline
            required
          />
          <BusinessField
            label="Reasoning"
            name="rationale"
            multiline
            required
          />
          <BusinessField
            label="Assessment date"
            name="assessedAt"
            type="date"
            value={businessToday()}
            required
          />
        </BusinessFormSection>
        <fieldset>
          <legend className="field-label">
            Sources used for this judgment
          </legend>
          <div className="business-evidence-choices">
            {evidence.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  name="evidenceIds"
                  value={item.id}
                  disabled={item.review}
                />
                <span>
                  <strong>
                    {item.company} · {humanize(item.stance)}
                    {item.review ? " · source needs review" : ""}
                  </strong>
                  {item.name}
                  <span className="business-hint">{item.source}</span>
                  {item.href && (
                    <a
                      className="business-text-link"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.href.includes("/observations/")
                        ? "Show observation"
                        : "Show Finance receipt"}{" "}
                      ↗
                    </a>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </RecordForm>
    </RecordDialog>
  );
}
export function ReconfirmEvidenceForm({
  problemId,
  evidence,
}: {
  problemId: string;
  evidence: { id: string; name: string; current: string }[];
}) {
  return (
    <RecordDialog
      eyebrow="Changed source meaning"
      triggerLabel="Review changed sources"
      title="Confirm the interpretation still holds"
      variant="secondary"
      description="Review the corrected source alongside the version kept here. Only confirm the interpretations that still mean the same thing. Earlier assessments remain historical judgments."
    >
      <RecordForm
        action={reconfirmEvidenceAction.bind(null, problemId)}
        closeOnSuccess
        submitLabel="Confirm unchanged interpretation"
      >
        <fieldset className="business-evidence-choices">
          <legend className="field-label">I reviewed these sources</legend>
          {evidence.map((item) => (
            <label key={item.id}>
              <input type="checkbox" name="evidenceIds" value={item.id} />
              <span>
                <strong>Previously used</strong>
                {item.name}
                <strong className="mt-lg">Current source</strong>
                {item.current}
              </span>
            </label>
          ))}
        </fieldset>
      </RecordForm>
    </RecordDialog>
  );
}
