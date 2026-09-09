"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { Pencil } from "lucide-react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  saveMarketAction,
  changeDirectionAction,
} from "@/features/entrepreneurship/market/actions/market.action";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";

export function MarketForm({
  kind,
  record,
  niches = [],
}: {
  kind: "company" | "niche";
  record?: {
    id: string;
    updatedAt?: Date;
    name: string;
    website?: string | null;
    notes?: string | null;
    scope?: string | null;
    niches?: { nicheId: string }[];
  };
  niches?: BusinessOption[];
}) {
  const exploration = useExploration();
  return (
    <RecordDialog
      eyebrow="Market"
      title={`${record ? "Edit" : "Add"} ${kind}`}
      triggerIcon={record ? <Pencil aria-hidden="true" /> : undefined}
      triggerLabel={record ? "Edit details" : `Add ${kind}`}
      variant={kind === "niche" || record ? "secondary" : "primary"}
      description={
        kind === "company"
          ? "A little context now. The relationship can grow from here."
          : "Name the corner of the market you want to understand."
      }
    >
      <RecordForm
        action={saveMarketAction.bind(null, kind, record?.id)}
        closeOnSuccess
        submitLabel={record ? "Save details" : `Add ${kind}`}
      >
        {record && (
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={record.updatedAt?.toISOString() ?? ""}
          />
        )}
        <BusinessField label="Name" name="name" value={record?.name} required />
        {kind === "company" ? (
          <>
            <BusinessField
              label="Website"
              name="website"
              type="url"
              value={record?.website}
            />
            <BusinessField
              label="Context & notes"
              name="notes"
              multiline
              value={record?.notes}
            />
            {niches.length > 0 && (
              <fieldset>
                <legend className="field-label">Niches · optional</legend>
                <div className="business-checks">
                  {niches.map((niche) => (
                    <label key={niche.id}>
                      <input
                        type="checkbox"
                        name="nicheIds"
                        value={niche.id}
                        defaultChecked={
                          record
                            ? record.niches?.some(
                                (link) => link.nicheId === niche.id,
                              )
                            : exploration?.id === niche.id
                        }
                      />
                      {niche.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        ) : (
          <BusinessField
            label="What are you exploring?"
            name="scope"
            multiline
            value={record?.scope}
            hint="Describe the people, setting or workflow. This is your exploration scope, not a proven problem."
          />
        )}
      </RecordForm>
    </RecordDialog>
  );
}
export function DirectionForm({
  id,
  direction,
}: {
  id: string;
  direction: string;
}) {
  return (
    <RecordDialog
      eyebrow="Direction"
      title="Change direction"
      triggerLabel="Change direction"
      variant="quiet"
    >
      <RecordForm action={changeDirectionAction.bind(null, id)} closeOnSuccess>
        <BusinessSelect label="Direction" name="direction" value={direction}>
          <option value="EXPLORING">Exploring</option>
          <option value="PURSUING">Pursuing</option>
          <option value="PAUSED">Paused</option>
          <option value="STOPPED">Stopped</option>
        </BusinessSelect>
        <BusinessField
          label="Why this change?"
          name="rationale"
          multiline
          required
        />
      </RecordForm>
    </RecordDialog>
  );
}
