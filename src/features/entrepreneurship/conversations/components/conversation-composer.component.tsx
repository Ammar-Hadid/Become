"use client";

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
};

export function ConversationComposer({
  conversationId,
  participantName,
  defaultChannel,
  guideQuestionId,
  initialBody = "",
  onSent,
}: {
  conversationId: string;
  participantName: string;
  defaultChannel: string;
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
    };
    setPendingMessage(attempt);
    setError(null);
    setSendStatus("saving");
    startTransition(async () => {
      const result = await addConversationMessageAction(
        conversationId,
        attempt.operationKey,
        {
          speakerRole: attempt.speakerRole,
          speakerName: attempt.speakerName,
          body: attempt.body,
          occurredAt: new Date().toISOString(),
          channel: attempt.channel,
          guideQuestionId: guideQuestionId ?? null,
        },
      );
      if (result.error) {
        setError(result.error);
        setSendStatus("error");
        return;
      }
      setBody("");
      setPendingMessage(null);
      setSendStatus("saved");
      onSent?.();
      router.refresh();
      requestAnimationFrame(() =>
        formRef.current?.querySelector("textarea")?.focus(),
      );
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
          <small>{error ? "Not saved" : "Sending…"}</small>
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
          <select
            value={speakerRole}
            onChange={(event) =>
              setSpeakerRole(event.target.value as "ME" | "PARTICIPANT")
            }
          >
            <option value="PARTICIPANT">{participantName}</option>
            <option value="ME">Me</option>
          </select>
        </label>
        <label className="conversation-composer-body">
          <span>Message</span>
          <textarea
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
        <button type="submit" disabled={!body.trim() || pending}>
          <Send aria-hidden="true" /> {pending ? "Sending…" : "Add message"}
        </button>
      </form>
      <p className="conversation-composer-hint">
        Enter to add · Shift + Enter for a new line
      </p>
      {error && pendingMessage && (
        <p className="conversation-composer-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => send(pendingMessage)}>
            Retry with the same save
          </button>
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {sendStatus === "saving"
          ? "Saving message"
          : sendStatus === "saved"
            ? "Message saved"
            : sendStatus === "error"
              ? "Message not saved"
              : ""}
      </span>
    </div>
  );
}
