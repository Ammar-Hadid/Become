"use client";

import { useRouter } from "next/navigation";
import {
  Bookmark,
  EyeOff,
  MoreHorizontal,
  NotebookPen,
  Pencil,
} from "lucide-react";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  bookmarkConversationMessageAction,
  correctConversationMessageAction,
  promoteMessageToObservationAction,
  voidConversationMessageAction,
} from "@/features/entrepreneurship/conversations/actions/conversation.action";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

type Message = {
  id: string;
  version: number;
  bookmarked: boolean;
  speakerRole: string;
  speakerName: string;
  body: string;
  occurredAt: string;
  channel: string;
  guideQuestionId: string | null;
  hasObservation: boolean;
};

export function ConversationMessageMenu({ message }: { message: Message }) {
  const router = useRouter();
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <SubMenu
      label={`Actions for message from ${message.speakerName}`}
      placement="bottom-end"
      closeOnSelect={false}
      trigger={(props) => (
        <button {...props} className="business-icon-button">
          <MoreHorizontal aria-hidden="true" />
        </button>
      )}
    >
      <MenuItem
        icon={<Bookmark aria-hidden="true" />}
        onSelect={async () => {
          await bookmarkConversationMessageAction(
            message.id,
            crypto.randomUUID(),
            !message.bookmarked,
          );
          router.refresh();
        }}
      >
        {message.bookmarked ? "Remove bookmark" : "Bookmark"}
      </MenuItem>
      {!message.hasObservation && message.speakerRole === "PARTICIPANT" && (
        <RecordDialog
          eyebrow="Explicit promotion"
          triggerLabel="Keep as observation"
          triggerIcon={<NotebookPen aria-hidden="true" />}
          triggerRole="menuitem"
          unstyledTrigger
          title="Keep this message as an observation"
          description="The exact message remains the source. You can paraphrase it, but this step never happens automatically."
        >
          <RecordForm
            action={async (data) =>
              promoteMessageToObservationAction(
                message.id,
                String(data.get("captureKey")),
                {
                  expectedMessageVersion: message.version,
                  kind: String(data.get("kind")),
                  wordingMode: String(data.get("wordingMode")),
                  statement: String(data.get("statement")),
                  sourceDescription: message.body,
                  audienceReason: null,
                  problemId: null,
                  stance: "CONTEXT",
                  explanation: null,
                },
              )
            }
            closeOnSuccess
            submitLabel="Keep observation"
            onSaved={() => router.refresh()}
          >
            <CaptureKey />
            <BusinessSelect label="Observation kind" name="kind">
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
            <BusinessField
              label="Observation"
              name="statement"
              value={message.body}
              multiline
              required
            />
          </RecordForm>
        </RecordDialog>
      )}
      <RecordDialog
        eyebrow="Historical correction"
        triggerLabel="Correct message"
        triggerIcon={<Pencil aria-hidden="true" />}
        triggerRole="menuitem"
        unstyledTrigger
        title="Correct this message"
        description="The earlier wording stays in history. Explain why this correction is necessary."
      >
        <RecordForm
          action={async (data) =>
            correctConversationMessageAction(
              message.id,
              String(data.get("captureKey")),
              {
                expectedVersion: message.version,
                correctionReason: String(data.get("correctionReason")),
                speakerRole: message.speakerRole,
                speakerName: message.speakerName,
                body: String(data.get("body")),
                occurredAt: message.occurredAt,
                channel: message.channel,
                guideQuestionId: message.guideQuestionId,
              },
            )
          }
          closeOnSuccess
          submitLabel="Keep correction"
          onSaved={() => router.refresh()}
        >
          <CaptureKey />
          <BusinessField
            label="Corrected message"
            name="body"
            value={message.body}
            multiline
            required
          />
          <BusinessField
            label="Reason for correction"
            name="correctionReason"
            multiline
            required
          />
        </RecordForm>
      </RecordDialog>
      <RecordDialog
        eyebrow="Remove from the current exchange"
        triggerLabel="Void message"
        triggerIcon={<EyeOff aria-hidden="true" />}
        triggerRole="menuitem"
        unstyledTrigger
        title="Void this message"
        description="The record stays in history, but it no longer appears as current evidence."
      >
        <RecordForm
          action={async (data) =>
            voidConversationMessageAction(
              message.id,
              String(data.get("captureKey")),
              { reason: String(data.get("reason")) },
            )
          }
          closeOnSuccess
          submitLabel="Void message"
          submitVariant="danger"
          onSaved={() => router.refresh()}
        >
          <CaptureKey />
          <BusinessField label="Reason" name="reason" multiline required />
        </RecordForm>
      </RecordDialog>
    </SubMenu>
  );
}
