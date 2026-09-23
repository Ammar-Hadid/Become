"use client";

import { useRouter } from "next/navigation";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  createInterviewGuideAction,
  ensureStarterInterviewGuidesAction,
} from "@/features/entrepreneurship/interview-guides/actions/interview-guide.action";
import { emptyInterviewGuideDocument } from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

export function InterviewGuideCreateForm({
  nicheId,
  segments,
}: {
  nicheId: string;
  segments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      eyebrow="A conversational aid"
      title="Create an interview guide"
      triggerLabel="New guide"
      description="Start with an objective and audience. You will shape questions in the editor next."
    >
      <RecordForm
        action={async (data) =>
          createInterviewGuideAction(String(data.get("captureKey")), {
            nicheId,
            title: String(data.get("title")),
            objective: String(data.get("objective")),
            marketType: String(data.get("marketType")),
            segmentId: String(data.get("segmentId")) || null,
            expectedDurationMinutes: Number(
              data.get("expectedDurationMinutes"),
            ),
            document: emptyInterviewGuideDocument(),
          })
        }
        closeOnSuccess
        submitLabel="Create guide"
        onSaved={(result) => {
          if (result.id)
            router.push(
              explorationHref(
                nicheId,
                `/conversations/guides/${result.id}/edit`,
              ),
            );
        }}
      >
        <CaptureKey />
        <BusinessField label="Guide name" name="title" required />
        <BusinessField label="Objective" name="objective" multiline required />
        <BusinessSelect label="Market" name="marketType">
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
        </BusinessSelect>
        <BusinessRecordPicker
          kind="segment"
          label="Segment · optional"
          name="segmentId"
          nicheId={nicheId}
          options={segments}
          placeholder="Any relevant segment"
        />
        <BusinessField
          label="Expected duration in minutes"
          name="expectedDurationMinutes"
          type="number"
          value="30"
          min={5}
          required
        />
      </RecordForm>
    </RecordDialog>
  );
}

export function EnsureStarterGuides({ nicheId }: { nicheId: string }) {
  const router = useRouter();
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <button
      type="button"
      className="finance-dialog-trigger finance-dialog-trigger--secondary"
      onClick={async () => {
        const result = await ensureStarterInterviewGuidesAction(
          nicheId,
          crypto.randomUUID(),
        );
        if (result.id)
          router.push(
            explorationHref(nicheId, `/conversations/guides/${result.id}/edit`),
          );
        else router.refresh();
      }}
    >
      Create B2C & B2B starters
    </button>
  );
}
