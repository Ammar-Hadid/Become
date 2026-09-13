"use client";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
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
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { Button } from "@/components/ui/buttons/button.component";
export function StartExplorationForm() {
  const router = useRouter();
  return (
    <RecordDialog
      title="Start exploration"
      eyebrow="A new question"
      triggerLabel="Start exploration"
      description="Choose a market and a question worth spending time with."
    >
      <RecordForm
        action={saveMarketAction.bind(null, "niche", undefined)}
        submitLabel="Start exploring"
        closeOnSuccess
        onSaved={(result) => {
          if (result.id) router.push(explorationHref(result.id));
        }}
      >
        <BusinessFormSection
          eyebrow="Starting point"
          title="Name the corner of the market"
          description="Specific curiosity gives the exploration a useful boundary."
        >
          <BusinessField
            name="name"
            label="Market name"
            required
            hint="For example, Dentists or independent barbers."
          />
          <BusinessField
            name="scope"
            label="What are you exploring?"
            multiline
            hint="The people, workflow or question you want to understand."
          />
        </BusinessFormSection>
        <p className="business-form-note">
          A new market starts with an empty workspace. To revisit a market
          you’ve already explored, open it below and resume.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
export function ExplorationDirectionForm({
  id,
  direction,
  updatedAt,
}: {
  id: string;
  direction: string;
  updatedAt: string;
}) {
  const active = ["EXPLORING", "PURSUING"].includes(direction);
  return (
    <RecordDialog
      icon={false}
      title="Choose your next direction"
      triggerLabel={active ? "Review direction" : "Resume exploration"}
      eyebrow="A deliberate decision"
      variant="secondary"
      description="Keep what you learned, even when you change course."
    >
      <RecordForm
        action={changeDirectionAction.bind(null, id)}
        submitLabel="Save direction"
        closeOnSuccess
      >
        <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
        <BusinessFormSection
          eyebrow="Decision"
          title="Choose the next direction"
          description="The rationale stays in the exploration’s decision trail."
        >
          <BusinessSelect
            label="Next direction"
            name="direction"
            value="EXPLORING"
          >
            <option value="EXPLORING">
              {direction === "EXPLORING"
                ? "Continue exploring"
                : direction === "PURSUING"
                  ? "Return to exploration"
                  : "Resume exploring"}
            </option>
            {active && <option value="PAUSED">Pause for now</option>}
            {direction !== "PURSUING" && (
              <option value="PURSUING">Pursue this market</option>
            )}
            {direction !== "STOPPED" && (
              <option value="STOPPED">Stop exploring</option>
            )}
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
export function ExplorationTimer({ nicheId }: { nicheId: string }) {
  const { activeSession } = useActiveTimer();
  return (
    <Button
      variant="secondary"
      onClick={(event) => {
        event.currentTarget.focus();
        window.dispatchEvent(
          new CustomEvent("become:start-timer", {
            detail: { businessNicheId: nicheId },
          }),
        );
      }}
    >
      {activeSession
        ? activeSession.status === "PAUSED"
          ? "View paused session"
          : "View running session"
        : "Start session"}
    </Button>
  );
}
