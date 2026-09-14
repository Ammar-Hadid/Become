"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ObservationEntries } from "@/features/entrepreneurship/observations/components/observation-entries.component";
import {
  InteractionParticipants,
  type ParticipantSnapshot,
} from "@/features/entrepreneurship/interactions/components/interaction-participants.component";
import { useState } from "react";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  AudienceFields,
  type AudienceFieldValue,
  type AudienceOption,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  BusinessField,
  BusinessFormSection,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  logInteractionAction,
  correctInteractionAction,
} from "@/features/entrepreneurship/interactions/actions/interaction.action";
import {
  interactionKinds,
  channels,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import {
  humanize,
  businessToday,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";

export type InteractionFormValue = AudienceFieldValue & {
  id: string;
  version: number;
  kind: string;
  channel: string;
  date: string;
  summary: string;
  notes: string | null;
  companyId: string | null;
  companyName: string | null;
  nicheId: string | null;
  respondsToInteractionId: string | null;
  participants: ParticipantSnapshot[];
};
export function CaptureFields({
  companies,
  people = [],
  segments = [],
  niches,
  problems,
  replies,
  value,
  companyId,
  companyName,
  respondsTo,
  sourceNicheId,
  prefill,
  conversationOnly = false,
  initialKind,
}: {
  companies: BusinessOption[];
  people?: BusinessOption[];
  segments?: AudienceOption[];
  niches: BusinessOption[];
  problems: BusinessOption[];
  replies: BusinessOption[];
  value?: InteractionFormValue;
  companyId?: string;
  companyName?: string;
  respondsTo?: string;
  sourceNicheId?: string | null;
  conversationOnly?: boolean;
  initialKind?: string;
  prefill?: {
    summary: string;
    date: string;
    nicheId: string | null;
    sourceSessionId: string;
  };
}) {
  const exploration = useExploration();
  const [key] = useState(() => crypto.randomUUID());
  return (
    <>
      <input type="hidden" name="captureKey" value={key} />
      {!value && !prefill && exploration && (
        <p className="business-hint">
          Recording in {exploration.name}. Change context below if this happened
          elsewhere.
        </p>
      )}
      {prefill?.sourceSessionId && (
        <input
          type="hidden"
          name="sourceSessionId"
          value={prefill.sourceSessionId}
        />
      )}
      <BusinessFormSection
        eyebrow="Essential record"
        title="The event"
        description="Start with what happened, when, and who it involved."
      >
        <div
          className={`gap-lg grid${conversationOnly ? "" : "sm:grid-cols-2"}`}
        >
          {conversationOnly ? (
            <input type="hidden" name="kind" value="CONVERSATION" />
          ) : (
            <BusinessSelect
              label="What happened?"
              name="kind"
              value={
                value?.kind ??
                initialKind ??
                (respondsTo ? "REPLY_RECEIVED" : "CONVERSATION")
              }
            >
              {interactionKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {humanize(kind)}
                </option>
              ))}
            </BusinessSelect>
          )}
          <BusinessField
            label="Date"
            name="occurredAt"
            type="date"
            required
            value={value?.date ?? prefill?.date ?? businessToday()}
          />
        </div>
        <BusinessField
          label="Summary"
          name="summary"
          multiline
          required
          value={value?.summary ?? prefill?.summary}
        />
        <AudienceFields
          allowAggregate={false}
          people={people}
          segments={segments}
          companies={companies}
          value={
            value ??
            (companyId
              ? { companyId, companyName, identityKind: "BUSINESS" }
              : undefined)
          }
        />
      </BusinessFormSection>
      <details className="business-disclosure" open={value ? true : undefined}>
        <summary>Context, participants & notes</summary>
        <div>
          <BusinessSelect
            label="Channel"
            name="channel"
            value={value?.channel ?? "OTHER"}
          >
            {channels.map((channel) => (
              <option value={channel} key={channel}>
                {humanize(channel)}
              </option>
            ))}
          </BusinessSelect>
          <BusinessSelect
            label="Exploration · optional"
            name="nicheId"
            value={
              value
                ? (value.nicheId ?? "")
                : respondsTo
                  ? (sourceNicheId ?? "")
                  : prefill
                    ? (prefill.nicheId ?? "")
                    : exploration?.archived
                      ? ""
                      : (exploration?.id ?? "")
            }
          >
            <option value="">No exploration</option>
            {niches.map((niche) => (
              <option key={niche.id} value={niche.id}>
                {niche.name}
              </option>
            ))}
          </BusinessSelect>
          <InteractionParticipants initial={value?.participants} />
          <BusinessField
            label="Notes"
            name="notes"
            multiline
            value={value?.notes}
          />
          <BusinessSelect
            label="Reply to · optional"
            name="respondsToInteractionId"
            value={value?.respondsToInteractionId ?? respondsTo ?? ""}
          >
            <option value="">No explicit reply link</option>
            {(value?.respondsToInteractionId ?? respondsTo) &&
              !replies.some(
                (reply) =>
                  reply.id === (value?.respondsToInteractionId ?? respondsTo),
              ) && (
                <option value={value?.respondsToInteractionId ?? respondsTo}>
                  Previously linked interaction
                </option>
              )}
            {replies.map((reply) => (
              <option key={reply.id} value={reply.id}>
                {reply.name}
              </option>
            ))}
          </BusinessSelect>
        </div>
      </details>
      {!value && (
        <>
          <ObservationEntries problems={problems} segments={segments} />
          <details className="business-disclosure">
            <summary>Choose a next action</summary>
            <div>
              <BusinessField label="Follow-up" name="followUpTitle" />
              <BusinessField
                label="Due date"
                name="dueOn"
                type="date"
                hint="Only a date you choose creates a scheduled reminder."
              />
            </div>
          </details>
        </>
      )}
      {value && (
        <BusinessFormSection
          eyebrow="Correction"
          title="Protect the historical record"
        >
          <div className="business-form-note">
            <strong>Correcting the recorded event</strong>
            <p>Current summary: {value.summary}</p>
            <p>
              Changing audience, identity, date, channel, participants or reply
              links may mark affected evidence for review.
            </p>
          </div>
          <BusinessField
            label="Reason for correction"
            name="correctionReason"
            multiline
            required
          />
          <label className="business-choice-row">
            <input type="checkbox" name="meaningUnchanged" />
            Summary edits only correct wording; the source meaning is unchanged.
          </label>
        </BusinessFormSection>
      )}
    </>
  );
}
export function InteractionForm(
  props: Parameters<typeof CaptureFields>[0] & { triggerLabel?: string },
) {
  const router = useRouter();
  return (
    <RecordDialog
      eyebrow="Field notes"
      title={props.value ? "Correct interaction" : "Log interaction"}
      triggerLabel={
        props.triggerLabel ??
        (props.value ? "Correct record" : "Log interaction")
      }
      variant={props.value ? "quiet" : "primary"}
      description="Keep what happened. Add the useful details while they’re fresh."
    >
      <RecordForm
        action={
          props.value
            ? correctInteractionAction.bind(
                null,
                props.value.id,
                props.value.version,
              )
            : logInteractionAction
        }
        closeOnSuccess
        submitLabel={props.value ? "Save correction" : "Save interaction"}
        onSaved={(result) => {
          if (!props.value && result.id)
            router.push(`/entrepreneurship/interactions/${result.id}`);
        }}
      >
        <CaptureFields {...props} />
      </RecordForm>
    </RecordDialog>
  );
}
