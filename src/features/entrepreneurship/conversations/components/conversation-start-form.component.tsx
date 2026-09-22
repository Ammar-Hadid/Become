"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { startConversationAction } from "@/features/entrepreneurship/conversations/actions/conversation.action";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

export function ConversationStartForm({
  nicheId,
  guides,
  reachRecords,
  initialLinkedInteractionId = "",
}: {
  nicheId: string;
  guides: { id: string; title: string; revisionId: string; version: number }[];
  reachRecords: { id: string; name: string }[];
  initialLinkedInteractionId?: string;
}) {
  const router = useRouter();
  const exploration = useExploration();
  const [linkedInteractionId, setLinkedInteractionId] = useState(
    initialLinkedInteractionId,
  );
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      eyebrow="Learn from a real exchange"
      title="Start a conversation"
      triggerLabel="Start conversation"
      description="Name who is speaking and how the exchange is happening. A guide can help, but the conversation stays free-form."
    >
      <RecordForm
        action={async (data) => {
          const linked = String(data.get("linkedInteractionId")) || null;
          return startConversationAction(String(data.get("captureKey")), {
            nicheId,
            identityKind: linked ? "UNSPECIFIED" : "ANONYMOUS",
            personId: null,
            personName: null,
            companyId: null,
            companyName: null,
            audienceLabel: linked ? null : String(data.get("participant")),
            sampleSize: null,
            sampleUnit: null,
            marketType: linked ? "UNKNOWN" : String(data.get("marketType")),
            segmentIds: [],
            segmentNames: [],
            audienceDescription: null,
            linkedInteractionId: linked,
            guideRevisionId: String(data.get("guideRevisionId")) || null,
            channel: String(data.get("channel")),
            occurredAt: new Date().toISOString(),
            summary: String(data.get("summary")) || null,
            notes: null,
          });
        }}
        closeOnSuccess
        submitLabel="Open conversation"
        onSaved={(result) => {
          if (result.id)
            router.push(
              explorationWorkspaceHref(
                nicheId,
                "conversations",
                `/${result.id}/conduct`,
              ),
            );
        }}
      >
        <CaptureKey />
        {!linkedInteractionId && (
          <>
            <BusinessField
              label="Participant or group"
              name="participant"
              required
            />
            <BusinessSelect label="Market" name="marketType">
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
              <option value="BOTH">Cross-market</option>
            </BusinessSelect>
          </>
        )}
        <BusinessSelect label="Channel" name="channel">
          <option value="CALL">Call</option>
          <option value="MEETING">Meeting</option>
          <option value="IN_PERSON">In person</option>
          <option value="EMAIL">Email</option>
          <option value="DM">Direct message</option>
          <option value="OTHER">Other</option>
        </BusinessSelect>
        <div className="business-form-field gap-sm grid">
          <BusinessRecordPicker
            kind="interaction"
            label="Continue from a reply · optional"
            name="linkedInteractionId"
            nicheId={nicheId}
            options={reachRecords}
            value={linkedInteractionId}
            placeholder="No linked reach record"
            interactionKinds={["OUTREACH_SENT", "REPLY_RECEIVED"]}
            onValueChange={setLinkedInteractionId}
          />
          {linkedInteractionId && (
            <p className="business-hint text-body-sm text-text-muted">
              Participant and market context will be inherited from the Reach
              record.
            </p>
          )}
        </div>
        <BusinessSelect
          label="Interview guide · optional"
          name="guideRevisionId"
        >
          <option value="">Free-form conversation</option>
          {guides.map((guide) => (
            <option key={guide.revisionId} value={guide.revisionId}>
              {guide.title} · revision {guide.version}
            </option>
          ))}
        </BusinessSelect>
        <BusinessField
          label="Opening context · optional"
          name="summary"
          multiline
        />
      </RecordForm>
    </RecordDialog>
  );
}
