"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { addConversationMessageAction } from "@/features/entrepreneurship/conversations/actions/conversation.action";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";

type PendingMessage = {
  operationKey: string;
  speakerRole: "ME" | "PARTICIPANT";
  speakerName: string;
  body: string;
  channel: string;
  platform: string | null;
  occurredAt: string;
  guideQuestionId: string | null;
};

export function ConversationComposer({
  conversationId,
  participantName,
  defaultChannel,
  defaultPlatform = null,
  guideQuestionId,
  initialBody = "",
  onSent,
}: {
  conversationId: string;
  participantName: string;
  defaultChannel: string;
  defaultPlatform?: string | null;
  guideQuestionId?: string | null;
  initialBody?: string;
  onSent?: () => void;
}) {
  const router = useRouter();
  const exploration = useExploration();
  const [speakerRole, setSpeakerRole] = useState<"ME" | "PARTICIPANT">(
    "PARTICIPANT",
  );
  const [body, setBody] = useState(initialBody);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const label = useMemo(
    () => (speakerRole === "ME" ? "Me" : participantName),
    [participantName, speakerRole],
  );
  if (exploration?.archived) return null;

  const send = (message = pendingMessage) => {
    const trimmed = (message?.body ?? body).trim();
    if (!trimmed || pending) return;
    const attempt: PendingMessage = message ?? {
      operationKey: crypto.randomUUID(),
      speakerRole,
      speakerName: label,
      body: trimmed,
      channel: defaultChannel,
      platform: defaultPlatform,
      occurredAt: new Date().toISOString(),
      guideQuestionId: guideQuestionId ?? null,
    };
    setPendingMessage(attempt);
    setError(null);
    setSendStatus("saving");
    startTransition(async () => {
      try {
        const result = await addConversationMessageAction(
          conversationId,
          attempt.operationKey,
          {
            speakerRole: attempt.speakerRole,
            speakerName: attempt.speakerName,
            body: attempt.body,
            occurredAt: attempt.occurredAt,
            channel: attempt.channel,
            platform: attempt.platform,
            guideQuestionId: attempt.guideQuestionId,
          },
        );
        if (result.error) {
          setError(result.error);
          setSendStatus("error");
          return;
        }
        setBody((current) => (current.trim() === attempt.body ? "" : current));
        setPendingMessage(null);
        setSendStatus("saved");
        onSent?.();
        router.refresh();
        requestAnimationFrame(() =>
          formRef.current?.querySelector("textarea")?.focus(),
        );
      } catch {
        setError(
          "The save could not be confirmed. Retry with the same save to check it.",
        );
        setSendStatus("error");
      }
    });
  };

  return (
    <div className="conversation-composer-wrap">
      {pendingMessage && (
        <div
          className="conversation-pending-message"
          data-error={Boolean(error) || undefined}
        >
          <span>{pendingMessage.speakerName}</span>
          <p>{pendingMessage.body}</p>
          <small>{error ? "Save not confirmed" : "Sending…"}</small>
        </div>
      )}
      <form
        ref={formRef}
        className="conversation-composer"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label>
          <span>Speaker</span>
          <NativeSelect
            value={speakerRole}
            onChange={(event) =>
              setSpeakerRole(event.target.value as "ME" | "PARTICIPANT")
            }
          >
            <option value="PARTICIPANT">{participantName}</option>
            <option value="ME">Me</option>
          </NativeSelect>
        </label>
        <label className="conversation-composer-body">
          <span>Message</span>
          <Textarea
            value={body}
            rows={3}
            maxLength={12000}
            placeholder={`Record what ${label} said…`}
            onChange={(event) => {
              setBody(event.target.value);
              if (pendingMessage && error) setPendingMessage(null);
              setError(null);
              if (sendStatus !== "idle") setSendStatus("idle");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
        </label>
        <Button
          variant="primary"
          type="submit"
          disabled={!body.trim() || pending}
        >
          <Send aria-hidden="true" /> {pending ? "Sending…" : "Add message"}
        </Button>
      </form>
      <p className="conversation-composer-hint">
        Enter to add · Shift + Enter for a new line
      </p>
      {error && pendingMessage && (
        <p className="conversation-composer-error" role="alert">
          {error}{" "}
          <Button
            variant="secondary"
            type="button"
            onClick={() => send(pendingMessage)}
          >
            Retry with the same save
          </Button>
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {sendStatus === "saving"
          ? "Saving message"
          : sendStatus === "saved"
            ? "Message saved"
            : sendStatus === "error"
              ? "Message save not confirmed"
              : ""}
      </span>
    </div>
  );
}
