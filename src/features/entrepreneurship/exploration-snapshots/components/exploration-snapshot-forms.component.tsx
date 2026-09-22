"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import {
  createExplorationClaimAction,
  createExplorationUncertaintyAction,
  publishExplorationSnapshotAction,
} from "@/features/entrepreneurship/exploration-snapshots/actions/exploration-snapshot.action";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

export type ObservationChoice = {
  id: string;
  revisionId: string;
  name: string;
};

export type CitationValue = {
  observationId: string;
  observationRevisionId: string;
  stance: string;
  note: string | null;
};

export function readSnapshotCitations(
  data: FormData,
  citationIds: string[],
  prefix = "citation",
): CitationValue[] {
  return citationIds.flatMap((id) => {
    const selected = String(data.get(`${prefix}-observation-${id}`) ?? "");
    const [observationId, observationRevisionId] = selected.split(":");
    if (!observationId || !observationRevisionId) return [];
    return [
      {
        observationId,
        observationRevisionId,
        stance: String(data.get(`${prefix}-stance-${id}`)),
        note: String(data.get(`${prefix}-note-${id}`) ?? "") || null,
      },
    ];
  });
}

export function SnapshotCitationFields({
  observations,
  citationIds,
  setCitationIds,
  prefix = "citation",
  initial = [],
}: {
  observations: ObservationChoice[];
  citationIds: string[];
  setCitationIds: React.Dispatch<React.SetStateAction<string[]>>;
  prefix?: string;
  initial?: CitationValue[];
}) {
  return (
    <fieldset className="snapshot-citation-editor">
      <legend>Sources</legend>
      <p>
        Every finding needs an observation. Add more when evidence supports,
        challenges or qualifies the same conclusion.
      </p>
      <div className="snapshot-citation-list">
        {citationIds.map((id, index) => {
          const citation = initial[index];
          return (
            <div className="snapshot-citation-row" key={id}>
              <BusinessSelect
                label={`Source ${index + 1}`}
                name={`${prefix}-observation-${id}`}
                value={
                  citation
                    ? `${citation.observationId}:${citation.observationRevisionId}`
                    : ""
                }
                required
              >
                <option value="">Choose an observation</option>
                {observations.map((observation) => (
                  <option
                    key={observation.id}
                    value={`${observation.id}:${observation.revisionId}`}
                  >
                    {observation.name}
                  </option>
                ))}
              </BusinessSelect>
              <BusinessSelect
                label="Relationship"
                name={`${prefix}-stance-${id}`}
                value={citation?.stance ?? "SUPPORTS"}
              >
                <option value="SUPPORTS">Supports</option>
                <option value="CONTRADICTS">Challenges</option>
                <option value="CONTEXT">Adds context</option>
              </BusinessSelect>
              <BusinessField
                label="Source note"
                name={`${prefix}-note-${id}`}
                multiline
                value={citation?.note}
              />
              {citationIds.length > 1 && (
                <button
                  type="button"
                  className="snapshot-citation-remove"
                  onClick={() =>
                    setCitationIds((current) =>
                      current.filter((citationId) => citationId !== id),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" /> Remove source
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="snapshot-citation-add"
        onClick={() =>
          setCitationIds((current) => [
            ...current,
            `citation-${crypto.randomUUID()}`,
          ])
        }
      >
        <Plus aria-hidden="true" /> Add another source
      </button>
    </fieldset>
  );
}

export function SnapshotClaimForm({
  nicheId,
  observations,
}: {
  nicheId: string;
  observations: ObservationChoice[];
}) {
  const [citationIds, setCitationIds] = useState(["citation-0"]);
  if (observations.length === 0)
    return (
      <Link
        className="finance-dialog-trigger"
        href={explorationHref(nicheId, "/learn/observations")}
      >
        Keep an observation first
      </Link>
    );
  return (
    <RecordDialog
      eyebrow="Snapshot review"
      title="Add to what you know"
      triggerLabel="Add finding"
      description="Keep an observed fact distinct from your interpretation, and cite the observation that supports or challenges it."
    >
      <RecordForm
        action={async (data) => {
          const captureKey = String(data.get("captureKey"));
          return createExplorationClaimAction(captureKey, {
            nicheId,
            lane: String(data.get("lane")),
            kind: String(data.get("kind")),
            statement: String(data.get("statement")),
            citations: readSnapshotCitations(data, citationIds),
          });
        }}
        closeOnSuccess
        resetOnSuccess
        submitLabel="Keep finding"
      >
        <CaptureKey />
        <BusinessSelect label="Market" name="lane">
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="CROSS_MARKET">Cross-market</option>
        </BusinessSelect>
        <BusinessSelect label="Finding type" name="kind">
          <option value="OBSERVED">Observed fact</option>
          <option value="INTERPRETATION">Interpretation</option>
        </BusinessSelect>
        <BusinessField label="Finding" name="statement" multiline required />
        <SnapshotCitationFields
          observations={observations}
          citationIds={citationIds}
          setCitationIds={setCitationIds}
        />
      </RecordForm>
    </RecordDialog>
  );
}

export function SnapshotUncertaintyForm({ nicheId }: { nicheId: string }) {
  return (
    <RecordDialog
      eyebrow="Keep the question open"
      title="Name an uncertainty"
      triggerLabel="Add uncertainty"
      variant="secondary"
      description="Write what you still need to learn without turning it into a claim."
    >
      <RecordForm
        action={async (data) =>
          createExplorationUncertaintyAction(String(data.get("captureKey")), {
            nicheId,
            lane: String(data.get("lane")),
            statement: String(data.get("statement")),
          })
        }
        closeOnSuccess
        resetOnSuccess
        submitLabel="Keep uncertainty"
      >
        <CaptureKey />
        <BusinessSelect label="Market" name="lane">
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="CROSS_MARKET">Cross-market</option>
        </BusinessSelect>
        <BusinessField
          label="What remains uncertain?"
          name="statement"
          multiline
          required
        />
      </RecordForm>
    </RecordDialog>
  );
}

export function SnapshotPublishForm({
  nicheId,
  claims,
  uncertainties,
}: {
  nicheId: string;
  claims: { id: string; label: string }[];
  uncertainties: { id: string; label: string }[];
}) {
  return (
    <RecordDialog
      eyebrow="Historical record"
      title="Publish this snapshot"
      triggerLabel="Publish snapshot"
      variant="secondary"
      description="Publishing freezes this selection as an edition. Later corrections update the living record without rewriting history."
    >
      <RecordForm
        action={async (data) =>
          publishExplorationSnapshotAction(String(data.get("captureKey")), {
            nicheId,
            claimIds: data.getAll("claimIds").map(String),
            uncertaintyIds: data.getAll("uncertaintyIds").map(String),
          })
        }
        closeOnSuccess
        submitLabel="Publish edition"
      >
        <CaptureKey />
        <fieldset className="business-form-record">
          <legend>Findings in this edition</legend>
          {claims.map((claim) => (
            <label className="business-choice-row" key={claim.id}>
              <input
                type="checkbox"
                name="claimIds"
                value={claim.id}
                defaultChecked
              />
              <span>{claim.label}</span>
            </label>
          ))}
        </fieldset>
        {uncertainties.length > 0 && (
          <fieldset className="business-form-record">
            <legend>Open questions in this edition</legend>
            {uncertainties.map((uncertainty) => (
              <label className="business-choice-row" key={uncertainty.id}>
                <input
                  type="checkbox"
                  name="uncertaintyIds"
                  value={uncertainty.id}
                  defaultChecked
                />
                <span>{uncertainty.label}</span>
              </label>
            ))}
          </fieldset>
        )}
      </RecordForm>
    </RecordDialog>
  );
}
