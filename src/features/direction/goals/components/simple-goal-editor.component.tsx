"use client";

import { useContext, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
import { useGoalSave } from "@/features/direction/goals/hooks/use-goal-save.hook";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";
import type {
  GoalView,
  OwnedOption,
} from "@/features/direction/types/direction.types";

export function SimpleGoalEditor({
  goal,
  domainOptions,
  defaultStartOn,
  returnTo,
}: {
  goal?: GoalView;
  domainOptions: OwnedOption[];
  defaultStartOn: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const sound = useContext(InterfaceSoundContext);
  const [domains, setDomains] = useState<ReusableEntityOption[]>(
    goal?.domains ?? [],
  );
  const { saveGoal, state, result, fieldErrors, requiresRevisionReason } =
    useGoalSave(goal);
  const destination = returnTo?.startsWith("/direction/")
    ? returnTo
    : goal
      ? `/direction/goals/${goal.id}`
      : "/direction/goals";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await saveGoal(
      {
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        startOn: String(data.get("startOn") ?? defaultStartOn),
        targetOn: String(data.get("targetOn") ?? "") || undefined,
        domainIds: domains.map((domain) => domain.id),
        // Existing recorded definitions remain intact; new goals are simple statements.
        criterionMode: goal?.criterionMode ?? "ALL",
        criteria: goal?.criteria ?? [],
      },
      requiresRevisionReason ? String(data.get("reason") ?? "") : undefined,
    );
    if (response.error) {
      sound?.play("actionBlocked");
      return;
    }
    markSaved();
    sound?.play("saveConfirmed");
    router.push(
      returnTo?.startsWith("/direction/")
        ? returnTo
        : `/direction/goals/${response.id ?? goal?.id}`,
    );
    router.refresh();
  }
  return (
    <div className="simple-goal-editor">
      <WorkspaceLink href={destination} variant="ghost">
        <ArrowLeft aria-hidden="true" /> All goals
      </WorkspaceLink>
      <WorkspaceHeader
        title={goal ? "Edit goal" : "What do you want to achieve?"}
        description="One clear goal. Connect it to the parts of your life it belongs to."
      />
      <form
        ref={formRef}
        onSubmit={submit}
        aria-busy={state === "saving"}
        className="workspace-stack"
      >
        <WorkspacePanel title="Your goal" spacing="action">
          <div className="simple-goal-fields">
            <Input
              label="Goal"
              name="title"
              defaultValue={goal?.title ?? ""}
              maxLength={200}
              required
              autoFocus
              placeholder="What would you like to make happen?"
              error={fieldErrors.title ?? fieldErrors["draft.title"]}
            />
            <ReusableEntityCombobox
              label="Domains"
              entityName="domain"
              idFieldName="domainIds"
              queryFieldName="domainSearch"
              options={domainOptions}
              selectedOptions={domains}
              onSelectionChange={setDomains}
              searchAction={(query) => searchDirectionOptions("domain", query)}
              placeholder="Choose one or more domains"
            />
            {(fieldErrors.domainIds ?? fieldErrors["draft.domainIds"]) && (
              <p role="alert" className="form-error">
                {fieldErrors.domainIds ?? fieldErrors["draft.domainIds"]}
              </p>
            )}
          </div>
        </WorkspacePanel>
        <WorkspaceDisclosure
          title="Dates & notes"
          description="Add a target date or a little context, if useful."
          defaultOpen={Boolean(
            goal?.description ||
            goal?.targetOn ||
            fieldErrors.startOn ||
            fieldErrors.targetOn ||
            fieldErrors["draft.startOn"] ||
            fieldErrors["draft.targetOn"],
          )}
        >
          <div className="simple-goal-fields">
            <div className="workspace-grid">
              <Input
                label="Starts"
                type="date"
                name="startOn"
                defaultValue={goal?.startOn ?? defaultStartOn}
                required
                error={fieldErrors.startOn ?? fieldErrors["draft.startOn"]}
              />
              <Input
                label="Target date (optional)"
                type="date"
                name="targetOn"
                defaultValue={goal?.targetOn ?? ""}
                error={fieldErrors.targetOn ?? fieldErrors["draft.targetOn"]}
              />
            </div>
            <Textarea
              label="Notes (optional)"
              name="description"
              defaultValue={goal?.description ?? ""}
              maxLength={6000}
              placeholder="Why this matters, or anything you want to remember."
            />
          </div>
        </WorkspaceDisclosure>
        {requiresRevisionReason && (
          <Textarea
            label="What changed?"
            help="This note stays with the goal's history."
            name="reason"
            required
            maxLength={2000}
          />
        )}
        {result.error && (
          <p role="alert" className="form-error">
            {result.error}
            {state === "conflict" &&
              " Your edits are still here. Check the latest version before saving again."}
          </p>
        )}
        <div className="workspace-actions">
          <Button type="submit" disabled={state === "saving"}>
            <Save aria-hidden="true" />
            {state === "saving"
              ? "Saving…"
              : goal
                ? "Save changes"
                : "Create goal"}
          </Button>
          <WorkspaceLink href={destination} variant="ghost">
            Cancel
          </WorkspaceLink>
        </div>
      </form>
    </div>
  );
}
