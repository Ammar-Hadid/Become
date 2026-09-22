"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, Globe, MessagesSquare } from "lucide-react";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { Button } from "@/components/ui/buttons/button.component";
import {
  BusinessLink,
  useExploration,
} from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { confirmRecordFormDiscard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { CaptureFields } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { ObservationFields } from "@/features/entrepreneurship/problems/components/problem-forms.component";
import { logInteractionAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
import { recordObservationAction } from "@/features/entrepreneurship/problems/actions/problem.action";

type CaptureLane = "conversation" | "observation" | "public";

const captureLaneOptions = [
  ["conversation", "A conversation", "What someone shared", MessagesSquare],
  ["observation", "An observation", "What you saw directly", Eye],
  ["public", "A public source", "What you read or found", Globe],
] as const;

function EvidenceCaptureFields({
  captureLanes,
  ...props
}: Parameters<typeof CaptureFields>[0] & { captureLanes: CaptureLane[] }) {
  const [lane, setLane] = useState<CaptureLane>(captureLanes[0]);
  const [saved, setSaved] = useState<{ id?: string; lane: CaptureLane } | null>(
    null,
  );
  const [captureNumber, setCaptureNumber] = useState(0);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const closeDialog = useRecordDialogClose();
  const formRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved) confirmation.current?.focus();
  }, [saved]);
  if (saved)
    return (
      <section className="gap-lg grid">
        <Check className="text-success size-6" aria-hidden="true" />
        <h3
          ref={confirmation}
          tabIndex={-1}
          className="text-h3 font-medium outline-none"
        >
          {saved.lane === "conversation"
            ? "Conversation kept."
            : saved.lane === "public"
              ? "Public source kept."
              : "Observation kept."}
        </h3>
        <p className="text-body text-text-secondary" role="status">
          Saved to your evidence journal with the context you recorded.
        </p>
        {saved.id && (
          <BusinessLink
            className="business-text-link text-body"
            href={`/entrepreneurship/${saved.lane === "conversation" ? "interactions" : "observations"}/${saved.id}`}
          >
            Open saved{" "}
            {saved.lane === "conversation" ? "conversation" : "observation"} →
          </BusinessLink>
        )}
        <div className="gap-sm flex flex-wrap">
          <Button
            type="button"
            onClick={() => {
              setSaved(null);
              setCaptureNumber((value) => value + 1);
            }}
          >
            Keep another entry
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => closeDialog?.()}
          >
            Back to exploration
          </Button>
        </div>
      </section>
    );
  return (
    <div className="gap-2xl grid">
      <fieldset className="gap-sm grid sm:grid-cols-3">
        <legend className="sr-only">What do you want to keep?</legend>
        {captureLaneOptions
          .filter(([id]) => captureLanes.includes(id))
          .map(([id, label, hint, Icon]) => (
            <label
              key={id}
              className={`gap-sm rounded-control p-md sm:p-lg text-body relative flex cursor-pointer items-center border sm:flex-col sm:items-start ${lane === id ? "border-primary/40 bg-primary/5 text-text-primary" : "border-border text-text-secondary hover:bg-surface-elevated"}`}
            >
              <span className="gap-sm flex items-center">
                <input
                  type="radio"
                  name="evidence-lane"
                  aria-label={`${label} ${hint}`}
                  checked={lane === id}
                  onChange={() => {
                    if (
                      confirmRecordFormDiscard(formRegion.current ?? undefined)
                    )
                      setLane(id);
                  }}
                  className="accent-primary"
                />
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <strong className="font-medium">{label}</strong>
              <span className="text-body-sm text-text-muted hidden sm:block">
                {hint}
              </span>
            </label>
          ))}
      </fieldset>
      <div ref={formRegion}>
        <RecordForm
          key={`${lane}-${captureNumber}`}
          action={
            lane === "conversation"
              ? logInteractionAction
              : recordObservationAction.bind(null, null)
          }
          showSuccess={false}
          onSaved={(state) => setSaved({ id: state.id, lane })}
          submitLabel={
            lane === "conversation" ? "Save conversation" : "Save observation"
          }
        >
          {lane === "conversation" ? (
            <CaptureFields {...props} conversationOnly />
          ) : (
            <ObservationFields
              companies={props.companies}
              people={props.people}
              segments={props.segments}
              niches={props.niches}
              interactions={[]}
              problemId={null}
              initialSource={
                lane === "public" ? "PUBLIC_SOURCE" : "DIRECT_OBSERVATION"
              }
            />
          )}
        </RecordForm>
      </div>
    </div>
  );
}

export function EvidenceCapture(
  props: Parameters<typeof CaptureFields>[0] & {
    triggerLabel?: string;
    captureLanes?: CaptureLane[];
  },
) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  const captureLanes = props.captureLanes ?? [
    "conversation",
    "observation",
    "public",
  ];
  return (
    <RecordDialog
      eyebrow="From the field"
      title="Keep evidence"
      triggerLabel={props.triggerLabel ?? "Keep evidence"}
      description="Start with what happened or what you found. Identity and audience details can stay open while you learn."
    >
      <EvidenceCaptureFields {...props} captureLanes={captureLanes} />
    </RecordDialog>
  );
}
