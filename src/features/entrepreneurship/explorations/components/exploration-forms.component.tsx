"use client";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  BusinessField,
  BusinessFormSection,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  saveMarketAction,
  changeDirectionAction,
} from "@/features/entrepreneurship/market/actions/market.action";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
export function StartExplorationForm() {
  const router = useRouter();
  return (
    <RecordDialog
      treatment="workspace"
      title="Start exploration"
      eyebrow="A new question"
      triggerLabel="Start exploration"
      description="Give your question a name. You can choose an audience later."
    >
      <RecordForm
        action={saveMarketAction.bind(null, "niche", undefined)}
        submitLabel="Start exploring"
        closeOnSuccess
        onSaved={(result) => {
          if (result.id)
            router.push(explorationWorkspaceHref(result.id, "overview"));
        }}
      >
        <BusinessFormSection
          eyebrow="Starting point"
          title="What do you want to understand?"
          description="A product idea, a daily frustration, or a corner of the market."
        >
          <BusinessField
            name="name"
            featured
            label="Exploration name"
            required
            hint="For example, simpler Friday handovers."
          />
          <BusinessField
            name="scope"
            label="What are you exploring?"
            multiline
            hint="Keep it open: who needs this, what is difficult, and what might help?"
          />
        </BusinessFormSection>
        <details className="business-disclosure">
          <summary>I already have an audience in mind</summary>
          <div>
            <BusinessSelect
              label="Initial audience focus"
              name="marketFocus"
              value="UNKNOWN"
            >
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
              <option value="BOTH">Consumers & businesses</option>
            </BusinessSelect>
            <p className="business-hint">
              This is a starting focus. Evidence can lead you somewhere else.
            </p>
          </div>
        </details>
        <p className="business-form-note">
          Your audience can change as you learn.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
export function ExplorationDirectionForm({
  id,
  direction,
  updatedAt,
  marketFocus = "UNKNOWN",
  marketConclusion = "UNDECIDED",
  conclusionScope,
  sourceOptions = [],
  initialSourceKeys = [],
}: {
  id: string;
  direction: string;
  updatedAt: string;
  marketFocus?: string | null;
  marketConclusion?: string | null;
  conclusionScope?: string | null;
  sourceOptions?: { id: string; name: string }[];
  initialSourceKeys?: string[];
}) {
  const active = ["EXPLORING", "PURSUING"].includes(direction);
  const [conclusion, setConclusion] = useState(marketConclusion ?? "UNDECIDED");
  return (
    <RecordDialog
      treatment="workspace"
      icon={false}
      title="Where is this leading?"
      triggerLabel={active ? "Review direction" : "Resume exploration"}
      eyebrow="A deliberate decision"
      variant="secondary"
      description="Keep what you learned, even when you change course."
      onOpenChange={(isOpen) => {
        if (isOpen) setConclusion(marketConclusion ?? "UNDECIDED");
      }}
    >
      <RecordForm
        action={changeDirectionAction.bind(null, id)}
        submitLabel="Save direction"
        closeOnSuccess
      >
        <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
        <BusinessSelect
          label="Audience focus"
          name="marketFocus"
          value={marketFocus ?? "UNKNOWN"}
        >
          <option value="UNKNOWN">Not sure yet</option>
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="BOTH">Consumers & businesses</option>
        </BusinessSelect>
        <BusinessFormSection
          eyebrow="What you have learned"
          title="Your current conclusion"
          description="Choose a conclusion for the scope you actually examined. It does not hide other audiences or change their evidence."
        >
          <label className="field-label">
            What does the evidence suggest?
            <NativeSelect
              name="marketConclusion"
              className="mt-sm"
              value={conclusion}
              onChange={(event) => setConclusion(event.target.value)}
            >
              <option value="UNDECIDED">
                No conclusion yet · keep exploring
              </option>
              <option value="B2C">A consumer path</option>
              <option value="B2B">A business path</option>
              <option value="BOTH">Both paths</option>
              <option value="NEITHER">Neither path for this scope</option>
            </NativeSelect>
          </label>
          <BusinessField
            label="Scope of this conclusion"
            name="conclusionScope"
            multiline
            required={conclusion !== "UNDECIDED"}
            value={conclusionScope}
            hint="Which people, setting, and offer does this judgment concern?"
          />
          <details className="business-disclosure">
            <summary>Sources behind this conclusion</summary>
            <div>
              <BusinessRecordPicker
                kind="source"
                label="Referenced records"
                name="sourceKeys"
                nicheId={id}
                options={sourceOptions}
                values={initialSourceKeys}
                multiple
                placeholder="No sources selected"
              />
              <p className="business-hint">
                Search conversations, observations, and offer events. The
                versions you choose are captured with this decision.
              </p>
            </div>
          </details>
        </BusinessFormSection>
        <BusinessFormSection
          eyebrow="Decision"
          title="How do you want to continue?"
          description="The rationale stays in the exploration’s decision trail."
        >
          <BusinessSelect label="Work state" name="direction" value={direction}>
            <option value="EXPLORING">
              {direction === "EXPLORING"
                ? "Continue exploring"
                : direction === "PURSUING"
                  ? "Return to exploration"
                  : "Resume exploring"}
            </option>
            <option value="PAUSED">Pause for now</option>
            <option value="PURSUING">Pursue this exploration</option>
            <option value="STOPPED">Stop exploring</option>
          </BusinessSelect>
          <BusinessField
            label="Why this decision?"
            name="rationale"
            multiline
            required
          />
        </BusinessFormSection>
        <p className="business-form-note">
          Your records stay available. Resuming continues this exploration’s
          history.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}

export function ExplorationDirectionSummary({
  marketFocus,
  marketConclusion,
}: {
  marketFocus?: string | null;
  marketConclusion?: string | null;
}) {
  return (
    <span className="gap-sm inline-flex flex-wrap items-center">
      <span>Audience focus: {marketTypeLabel(marketFocus)}</span>
      {marketConclusion && marketConclusion !== "UNDECIDED" && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-text-primary">
            Current conclusion:{" "}
            {marketConclusion === "NEITHER"
              ? "Neither path for the assessed scope"
              : marketTypeLabel(marketConclusion)}
          </span>
        </>
      )}
    </span>
  );
}
