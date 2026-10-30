"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Textarea } from "@/components/ui/forms/textarea.component";

import { Input } from "@/components/ui/forms/input.component";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { Select } from "@/components/ui/forms/select.component";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";
import type { DecisionView } from "@/features/direction/thinking/types/thinking.types";

type Assessment = DecisionView["reflections"][number]["assessment"];

function DecisionReflectionForm({
  decisionId,
  defaultReflectedOn,
}: {
  decisionId: string;
  defaultReflectedOn: string;
}) {
  const router = useRouter();
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useThinkingOperation();
  const [assessment, setAssessment] = useState<Assessment>("TOO_EARLY");
  const [reflection, setReflection] = useState("");
  const [reflectedOn, setReflectedOn] = useState(defaultReflectedOn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const identity = { decisionId, assessment, reflection, reflectedOn };
    setPending(true);
    setError(null);
    const result = await run(identity, (operationKey) =>
      sendThinkingCommand({
        type: "REFLECT_DECISION",
        operationKey,
        id: decisionId,
        assessment,
        reflection,
        reflectedOn,
      }),
    );
    setPending(false);
    if (result.error) return setError(result.error);
    markSaved();
    close?.();
    router.refresh();
  }

  return (
    <form ref={formRef} className="thinking-dialog-form" onSubmit={submit}>
      <p className="decision-follow-up-note">
        Reflection adds what you learned later. It does not rewrite the choice
        or the reasoning you recorded at the time.
      </p>
      <div className="thinking-form-field">
        <span>Looking back</span>
        <Select
          label="Looking back"
          name="assessment"
          value={assessment}
          options={[
            { value: "HELPFUL", label: "Helpful" },
            { value: "MIXED", label: "Mixed" },
            { value: "NOT_HELPFUL", label: "Not helpful" },
            { value: "TOO_EARLY", label: "Too early to tell" },
          ]}
          onValueChange={setAssessment}
        />
      </div>
      <label className="thinking-form-field">
        <span>Reflected on</span>
        <Input
          type="date"
          name="reflectedOn"
          value={reflectedOn}
          onChange={(event) => setReflectedOn(event.target.value)}
          required
        />
      </label>
      <label className="thinking-form-field thinking-form-field--wide">
        <span>What did you learn?</span>
        <Textarea
          name="reflection"
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          maxLength={12000}
          required
          autoFocus
          placeholder="What became clearer after living with the decision?"
        />
      </label>
      {error && (
        <p className="thinking-form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="thinking-dialog-actions">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add reflection"}
        </Button>
      </footer>
    </form>
  );
}

export function DecisionReflection({
  decisionId,
  defaultReflectedOn,
}: {
  decisionId: string;
  defaultReflectedOn: string;
}) {
  return (
    <RecordDialog
      treatment="workspace"
      variant="secondary"
      eyebrow="Look back honestly"
      triggerLabel="Add reflection"
      title="How did the decision hold up?"
      description="Record what became clear after the choice had time to play out."
      triggerIcon={<MessageCircleMore aria-hidden="true" />}
    >
      <DecisionReflectionForm
        decisionId={decisionId}
        defaultReflectedOn={defaultReflectedOn}
      />
    </RecordDialog>
  );
}
