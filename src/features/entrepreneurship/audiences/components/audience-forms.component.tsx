"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  addAudienceToExplorationAction,
  archiveAudienceAction,
  saveAudienceAction,
} from "@/features/entrepreneurship/audiences/actions/audience.action";

export function AudienceForm({
  kind,
  record,
  nicheId,
}: {
  kind: "person" | "segment";
  nicheId?: string;
  record?: {
    id: string;
    name: string;
    updatedAt: Date;
    description?: string | null;
    marketType?: string;
    email?: string | null;
    notes?: string | null;
  };
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      treatment="workspace"
      eyebrow={
        kind === "segment"
          ? "A useful audience boundary"
          : "Someone worth returning to"
      }
      title={`${record ? "Edit" : "Add"} ${kind}`}
      triggerLabel={
        record
          ? "Edit details"
          : kind === "segment"
            ? "Add segment"
            : "Add person"
      }
      variant={record ? "secondary" : "primary"}
      description={
        kind === "segment"
          ? "A segment describes a group you want to understand. It is not a count of customers or evidence."
          : "Keep only the identity and context that are useful. People do not need a permanent consumer or business label."
      }
    >
      <RecordForm
        action={saveAudienceAction.bind(null, kind, record?.id ?? null)}
        submitLabel={record ? "Save details" : `Add ${kind}`}
        closeOnSuccess
      >
        <CaptureKey />
        {record ? (
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={record.updatedAt.toISOString()}
          />
        ) : (
          (nicheId || exploration) && (
            <input
              type="hidden"
              name="nicheId"
              value={nicheId ?? exploration?.id}
            />
          )
        )}
        <BusinessField
          label={kind === "segment" ? "Segment name" : "Person’s name"}
          name="name"
          required
          value={record?.name}
          hint={
            kind === "segment"
              ? "For example, daily cloth-mousepad users."
              : undefined
          }
        />
        {kind === "segment" ? (
          <>
            <BusinessField
              label="Who belongs in this segment?"
              name="description"
              multiline
              required
              value={record?.description}
              hint="Describe the relevant behavior, setting, or need. Keep the boundary useful and specific."
            />
            <BusinessSelect
              label="Buying context"
              name="marketType"
              value={record?.marketType ?? "UNKNOWN"}
            >
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
              <option value="BOTH">Consumers & businesses</option>
            </BusinessSelect>
          </>
        ) : (
          <details
            className="business-disclosure"
            open={record?.email || record?.notes ? true : undefined}
          >
            <summary>Contact details & context</summary>
            <div>
              <BusinessField
                label="Email"
                name="email"
                type="email"
                value={record?.email}
              />
              <BusinessField
                label="Context & notes"
                name="notes"
                multiline
                value={record?.notes}
              />
            </div>
          </details>
        )}
      </RecordForm>
    </RecordDialog>
  );
}

export function AttachAudienceForm({
  kind,
  nicheId,
}: {
  kind: "person" | "segment";
  nicheId: string;
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <RecordDialog
      treatment="workspace"
      eyebrow="Context you already know"
      title={`Attach an existing ${kind}`}
      triggerLabel={`Attach existing ${kind}`}
      variant="secondary"
      description="Use this identity or segment in this exploration. Evidence and offers keep the exploration where they were recorded."
    >
      <RecordForm
        action={addAudienceToExplorationAction.bind(null, kind, nicheId)}
        submitLabel={`Attach ${kind}`}
        closeOnSuccess
      >
        <BusinessRecordPicker
          kind={kind}
          label={kind === "person" ? "Person" : "Segment"}
          name={kind === "person" ? "personId" : "segmentId"}
          options={[]}
          required
          placeholder={`Find an existing ${kind}…`}
        />
      </RecordForm>
    </RecordDialog>
  );
}

export function AudienceMenu({
  kind,
  id,
  archived,
}: {
  kind: "person" | "segment";
  id: string;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <div aria-busy={pending}>
      <SubMenu
        label={`${kind} actions`}
        placement="bottom-end"
        trigger={(props) => (
          <Button variant="ghost" size="icon" {...props} disabled={pending}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        )}
      >
        <MenuItem
          disabled={pending}
          onSelect={() =>
            start(async () => {
              try {
                setNotice(null);
                const result = await archiveAudienceAction(kind, id, archived);
                setError(result.error);
                if (!result.error)
                  setNotice(
                    `${kind === "person" ? "Person" : "Segment"} ${archived ? "restored" : "archived"}.`,
                  );
              } catch {
                setError("Could not save. Try again.");
              }
            })
          }
        >
          {archived ? "Restore" : "Archive"} {kind}
        </MenuItem>
      </SubMenu>
      {notice && (
        <p role="status" className="business-hint">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
