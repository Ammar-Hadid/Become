"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, PauseCircle, Play, SquareCheckBig } from "lucide-react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import { BusinessField } from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  cancelConversationAction,
  finishConversationAction,
  resumeConversationAction,
} from "@/features/entrepreneurship/conversations/actions/conversation.action";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { getConversationDebriefMessagesAction } from "@/features/entrepreneurship/conversations/actions/conversation-debrief.action";

export type DebriefObservationMessage = {
  id: string;
  version: number;
  body: string;
  speakerName: string;
  bookmarked: boolean;
};

export function ConversationStateControls({
  conversationId,
  status,
  observationMessages,
  observationMessagesNext,
  observationMessagesTotal,
}: {
  conversationId: string;
  status: string;
  observationMessages: DebriefObservationMessage[];
  observationMessagesNext?: string | null;
  observationMessagesTotal?: number;
}) {
  const router = useRouter();
  const exploration = useExploration();
  const [messages, setMessages] = useState(observationMessages);
  const [next, setNext] = useState(observationMessagesNext ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, startLoadingMore] = useTransition();
  if (exploration?.archived) return null;
  if (status === "COMPLETED") return null;
  if (status === "CANCELLED") {
    return (
      <Button
        variant="primary"

        type="button"
        onClick={async () => {
          await resumeConversationAction(conversationId, crypto.randomUUID());
          router.refresh();
        }}
      >
        <Play aria-hidden="true" /> Resume conversation
      </Button>
    );
  }
  return (
    <div className="business-actions">
      <RecordDialog
        treatment="workspace"
        eyebrow="Debrief"
        triggerLabel="Finish conversation"
        triggerIcon={<SquareCheckBig aria-hidden="true" />}
        title="Finish and debrief"
        description="Completion is a deliberate review step. Messages become observations only when you promote them explicitly."
      >
        <RecordForm
          action={async (data) =>
            finishConversationAction(
              conversationId,
              String(data.get("captureKey")),
              {
                outcome: String(data.get("outcome")),
                nextAction: String(data.get("nextAction")) || null,
                takeaways: String(data.get("takeaways"))
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
                summary: String(data.get("summary")) || null,
                observationMessages: data
                  .getAll("observationMessages")
                  .map(String)
                  .flatMap((value) => {
                    const [messageId, rawVersion] = value.split(":");
                    const expectedVersion = Number(rawVersion);
                    return messageId && Number.isInteger(expectedVersion)
                      ? [{ messageId, expectedVersion }]
                      : [];
                  }),
              },
            )
          }
          closeOnSuccess
          submitLabel="Complete debrief"
          onSaved={() => router.refresh()}
        >
          <CaptureKey />
          {messages.length > 0 && (
            <fieldset className="conversation-debrief-observations">
              <legend>
                Keep participant messages as observations
                {observationMessagesTotal
                  ? ` · ${observationMessagesTotal}`
                  : ""}
              </legend>
              <p>
                Nothing is extracted automatically. Select only the exact
                messages you want to carry into the evidence record.
              </p>
              <div>
                {messages.map((message) => (
                  <label className="business-choice-row" key={message.id}>
                    <input
                      type="checkbox"
                      name="observationMessages"
                      value={`${message.id}:${message.version}`}
                      defaultChecked={message.bookmarked}
                    />
                    <span>
                      <strong>
                        {message.speakerName}
                        {message.bookmarked && (
                          <>
                            {" "}
                            <Bookmark aria-label="Bookmarked" />
                          </>
                        )}
                      </strong>
                      {message.body}
                    </span>
                  </label>
                ))}
              </div>
              {next && (
                <Button
                  variant="ghost"
                  size="sm"

                  type="button"
                  disabled={loadingMore}
                  onClick={() => {
                    setLoadError(null);
                    startLoadingMore(async () => {
                      const result = await getConversationDebriefMessagesAction(
                        conversationId,
                        next,
                      );
                      if (result.error) {
                        setLoadError(result.error);
                        return;
                      }
                      setMessages((current) => [...current, ...result.items]);
                      setNext(result.next);
                    });
                  }}
                >
                  {loadingMore ? "Loading messages…" : "Load more messages"}
                </Button>
              )}
              {loadError && <p role="alert">{loadError}</p>}
            </fieldset>
          )}
          <BusinessField label="Outcome" name="outcome" multiline required />
          <BusinessField label="Next action" name="nextAction" multiline />
          <BusinessField
            label="Key takeaways · one per line"
            name="takeaways"
            multiline
          />
          <BusinessField label="Historical summary" name="summary" multiline />
        </RecordForm>
      </RecordDialog>
      <RecordDialog
        treatment="workspace"
        eyebrow="Interrupted work"
        triggerLabel="Pause conversation"
        triggerIcon={<PauseCircle aria-hidden="true" />}
        variant="secondary"
        title="Pause this conversation"
        description="Everything already captured stays available. You can resume from this exact exchange later."
      >
        <RecordForm
          action={async (data) =>
            cancelConversationAction(
              conversationId,
              String(data.get("captureKey")),
              {
                reason: String(data.get("reason")) || null,
              },
            )
          }
          closeOnSuccess
          submitLabel="Pause conversation"
          onSaved={() => router.refresh()}
        >
          <CaptureKey />
          <BusinessField label="Reason · optional" name="reason" multiline />
        </RecordForm>
      </RecordDialog>
    </div>
  );
}
