"use client";

import { useId, useState } from "react";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { searchSegmentsAction } from "@/features/entrepreneurship/audiences/actions/audience.action";
import type { AudienceOption } from "@/features/entrepreneurship/audiences/types/audience.types";
import { DeferredSegments } from "@/features/entrepreneurship/audiences/components/deferred-segments.component";

export type ObservationAudienceAttribution = {
  marketType: string;
  segmentIds: string[];
  segmentNames?: string[];
  audienceDescription: string;
};

export function ObservationAudienceAttributionFields({
  value,
  reason,
  segments,
  onChange,
  onReasonChange,
}: {
  value: ObservationAudienceAttribution;
  reason: string;
  segments: AudienceOption[];
  onChange: (value: ObservationAudienceAttribution) => void;
  onReasonChange: (reason: string) => void;
}) {
  const prefix = useId();
  const [selected, setSelected] = useState<ReusableEntityOption[]>(
    segments
      .filter((segment) => value.segmentIds.includes(segment.id))
      .map((segment) => ({
        ...segment,
        description: segment.description ?? undefined,
      })),
  );
  return (
    <div className="gap-lg rounded-control border-border p-lg grid border">
      <p className="business-hint">
        The interaction remains the source. Attribute this observation to a
        narrower group only when its words or context support that boundary.
      </p>
      <label className="field-label">
        Buying context
        <select
          className="text-input mt-sm"
          value={value.marketType}
          onChange={(event) =>
            onChange({ ...value, marketType: event.target.value })
          }
        >
          <option value="UNKNOWN">Not sure yet</option>
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="BOTH">Consumers & businesses</option>
        </select>
      </label>
      <ReusableEntityCombobox
        label="Audience segments"
        entityName="segment"
        idFieldName={`${prefix}-segmentIds`}
        queryFieldName={`${prefix}-segmentQuery`}
        options={segments.map((segment) => ({
          ...segment,
          description: segment.description ?? undefined,
        }))}
        selectedOptions={selected}
        searchAction={searchSegmentsAction}
        placeholder="Find a segment…"
        onSelectionChange={(items) => {
          setSelected(items);
          onChange({ ...value, segmentIds: items.map((item) => item.id) });
        }}
      />
      <DeferredSegments
        fieldName={null}
        onChange={(segmentNames) => onChange({ ...value, segmentNames })}
      />
      <label className="field-label">
        Audience boundary
        <textarea
          className="text-input mt-sm"
          rows={3}
          maxLength={2000}
          value={value.audienceDescription}
          onChange={(event) =>
            onChange({ ...value, audienceDescription: event.target.value })
          }
        />
      </label>
      <label className="field-label">
        Why this attribution?
        <textarea
          className="text-input mt-sm"
          rows={3}
          maxLength={2000}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </label>
    </div>
  );
}
