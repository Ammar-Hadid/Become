"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { useState, useTransition } from "react";
import { MoreHorizontal, Check } from "lucide-react";
import { DateTime } from "luxon";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import {
  BusinessField,
  BusinessFormSection,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  saveFollowUpAction,
  resolveFollowUpAction,
} from "@/features/entrepreneurship/follow-ups/actions/follow-up.action";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
type Target = { companyId?: string; interactionId?: string; offerId?: string };
export function FollowUpForm({
  target,
  record,
}: {
  target: Target;
  record?: { id: string; title: string; dueOn: Date | null };
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      treatment="workspace"
      triggerRole={record ? "menuitem" : undefined}
      unstyledTrigger={Boolean(record)}
      icon={!record}
      eyebrow="An intentional next step"
      triggerLabel={record ? "Reschedule / edit" : "Choose next action"}
      title={record ? "Adjust follow-up" : "Choose a next action"}
      variant="quiet"
    >
      <RecordForm
        action={saveFollowUpAction.bind(null, target, record?.id ?? null)}
        closeOnSuccess
        submitLabel="Save follow-up"
      >
        <CaptureKey />
        <BusinessFormSection
          eyebrow="Commitment"
          title="The next chosen step"
          description="A due date is optional until you truly choose one."
        >
          <BusinessField
            label="Next action"
            name="title"
            value={record?.title}
            required
          />
          <BusinessField
            label="Due date"
            name="dueOn"
            type="date"
            value={
              record?.dueOn
                ? DateTime.fromJSDate(new Date(record.dueOn), {
                    zone: "UTC",
                  }).toISODate()
                : ""
            }
            hint="Leave it undated if you haven’t chosen when."
          />
        </BusinessFormSection>
      </RecordForm>
    </RecordDialog>
  );
}
export function FollowUpRecord({
  record,
  readOnly = false,
}: {
  record: {
    id: string;
    title: string;
    dueOn: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    companyId: string | null;
    interactionId: string | null;
    offerId: string | null;
  };
  readOnly?: boolean;
}) {
  const exploration = useExploration();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const target: Target = record.companyId
    ? { companyId: record.companyId }
    : record.interactionId
      ? { interactionId: record.interactionId }
      : { offerId: record.offerId! };
  const resolved = record.completedAt || record.cancelledAt;
  const resolve = (action: "COMPLETE" | "CANCEL" | "REOPEN") =>
    start(async () => {
      try {
        const result = await resolveFollowUpAction(record.id, action);
        setError(result.error);
      } catch {
        setError("Could not save this action. Try again.");
      }
    });
  return (
    <article className="business-follow-up">
      <div>
        <p>{record.title}</p>
        <span className="business-meta">
          {record.completedAt
            ? "Completed"
            : record.cancelledAt
              ? "Cancelled"
              : record.dueOn
                ? `Due ${businessDate(record.dueOn)}`
                : "No date chosen"}
        </span>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {!exploration?.archived && !readOnly && (
        <div className="business-actions">
          {!resolved && (
            <Button
              variant="ghost"
              size="icon"

              aria-label={`Complete ${record.title}`}
              disabled={pending}
              onClick={() => resolve("COMPLETE")}
            >
              <Check aria-hidden="true" />
            </Button>
          )}
          <SubMenu
            label="Follow-up actions"
            placement="bottom-end"
            closeOnSelect={false}
            trigger={(props) => (
              <Button variant="ghost" size="icon" {...props}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            )}
          >
            <FollowUpForm target={target} record={record} />
            <MenuItem
              disabled={pending}
              onSelect={() => resolve(resolved ? "REOPEN" : "CANCEL")}
            >
              {resolved ? "Reopen" : "Cancel follow-up"}
            </MenuItem>
          </SubMenu>
        </div>
      )}
    </article>
  );
}
