"use client";

import { useId, useState } from "react";
import { Building2, CircleHelp, UserRound, UsersRound } from "lucide-react";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { BusinessField } from "@/features/entrepreneurship/shared/components/business-field.component";
import { searchCompaniesAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
import {
  searchPeopleAction,
  searchSegmentsAction,
} from "@/features/entrepreneurship/audiences/actions/audience.action";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import type {
  AudienceContextView,
  AudienceView,
} from "@/features/entrepreneurship/audiences/types/audience.types";
export type { AudienceOption } from "@/features/entrepreneurship/audiences/types/audience.types";
import type { AudienceOption } from "@/features/entrepreneurship/audiences/types/audience.types";
import { DeferredSegments } from "@/features/entrepreneurship/audiences/components/deferred-segments.component";

export type AudienceContextValue = AudienceContextView;

export type AudienceFieldValue = AudienceView & {
  marketType?: string;
  personName?: string | null;
  companyName?: string | null;
};

export function AudienceFields({
  people = [],
  segments = [],
  companies = [],
  value,
  target = false,
  identityLabel = "Source identity",
  open = false,
  recipient = false,
  allowAggregate = true,
  onBusinessContextChange,
}: {
  people?: BusinessOption[];
  segments?: AudienceOption[];
  companies?: BusinessOption[];
  value?: AudienceFieldValue;
  target?: boolean;
  identityLabel?: string;
  open?: boolean;
  recipient?: boolean;
  allowAggregate?: boolean;
  onBusinessContextChange?: (hasBusiness: boolean) => void;
}) {
  const context = value?.audienceContext;
  const [scopeEdited, setScopeEdited] = useState(false);
  const unrecordedOriginally =
    value &&
    Object.hasOwn(value, "audienceContext") &&
    context === null &&
    !scopeEdited;
  const [marketType, setMarketType] = useState(
    context?.marketType ?? value?.marketType ?? "UNKNOWN",
  );
  const [selectedSegments, setSelectedSegments] = useState<
    ReusableEntityOption[]
  >(
    context?.segments.map((segment) => ({
      id: segment.segmentId,
      name: segment.nameSnapshot,
      description: segment.descriptionSnapshot ?? undefined,
    })) ?? [],
  );
  const [identity, setIdentity] = useState(
    value?.identityKind ??
      (value?.personId
        ? "PERSON"
        : value?.companyId
          ? "BUSINESS"
          : recipient
            ? "ANONYMOUS"
            : "UNSPECIFIED"),
  );
  const [representsBusiness, setRepresentsBusiness] = useState(
    Boolean(value?.companyId || value?.companyName),
  );
  const marketId = useId();
  const identityGroup = useId();
  return (
    <div className="gap-xl grid">
      {scopeEdited && (
        <input type="hidden" name="audienceScopeEdited" value="true" />
      )}
      <details
        className="business-disclosure border-border pt-lg border-t"
        open={
          open || context?.segments.length || context?.description
            ? true
            : undefined
        }
      >
        <summary className="text-body text-text-secondary rounded-control py-sm cursor-pointer">
          {target ? "Who is this for?" : "Relevant audience"}
          <span className="ml-sm text-text-muted font-normal">
            {unrecordedOriginally
              ? "Not recorded originally"
              : marketTypeLabel(marketType)}
            {selectedSegments.length
              ? ` · ${selectedSegments.length} ${selectedSegments.length === 1 ? "segment" : "segments"}`
              : ""}
          </span>
        </summary>
        <div
          className="gap-lg pt-md grid"
          onChange={(event) => {
            if (
              (event.target as HTMLInputElement).name === "audienceDescription"
            )
              setScopeEdited(true);
          }}
        >
          {unrecordedOriginally && (
            <p className="text-body-sm text-text-muted">
              This source had no saved audience context. Other edits preserve
              that history.{" "}
              <button
                type="button"
                className="hover:text-text-primary underline"
                onClick={() => setScopeEdited(true)}
              >
                Record this audience context
              </button>
            </p>
          )}
          <div className="business-form-field gap-sm grid">
            <label className="field-label" htmlFor={marketId}>
              Buying context
            </label>
            <select
              id={marketId}
              name="marketType"
              className="text-input"
              value={marketType}
              onChange={(event) => {
                setMarketType(event.target.value);
                setScopeEdited(true);
              }}
            >
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers · buying for themselves</option>
              <option value="B2B">
                Businesses · buying for an organization
              </option>
              <option value="BOTH">Consumers & businesses</option>
            </select>
            <p className="business-hint text-body-sm text-text-muted">
              Describe the context of this record. A person may represent a
              business; their identity does not decide who buys.
            </p>
          </div>
          <ReusableEntityCombobox
            label="Audience segments"
            entityName="segment"
            idFieldName="segmentIds"
            queryFieldName="segmentQuery"
            options={segments.map((segment) => ({
              ...segment,
              description: segment.description ?? undefined,
            }))}
            selectedOptions={selectedSegments}
            onSelectionChange={(items) => {
              setSelectedSegments(items);
              setScopeEdited(true);
            }}
            searchAction={searchSegmentsAction}
            placeholder="Find a segment…"
          />
          <DeferredSegments onChange={() => setScopeEdited(true)} />
          <BusinessField
            label="Audience boundary"
            name="audienceDescription"
            multiline
            value={context?.description}
            hint="Describe the people, setting, or limits that matter here. Leave it open while you are still learning."
          />
        </div>
      </details>
      {!target && (
        <details
          className="business-disclosure border-border pt-lg border-t"
          open={recipient || identity !== "UNSPECIFIED" || undefined}
        >
          <summary className="text-body text-text-secondary rounded-control py-sm cursor-pointer">
            {identityLabel}
            {!recipient && (
              <span className="ml-sm text-text-muted font-normal">
                {" "}
                · optional
              </span>
            )}
          </summary>
          <div className="gap-lg pt-md grid">
            <fieldset className="gap-sm grid">
              <legend className="sr-only">{identityLabel}</legend>
              {(
                [
                  ["UNSPECIFIED", "No specific identity", CircleHelp],
                  ["PERSON", "An identifiable person", UserRound],
                  ["BUSINESS", "A business", Building2],
                  ["ANONYMOUS", "An unnamed individual", UserRound],
                  ["GROUP", "A group or aggregate source", UsersRound],
                ] as const
              )
                .filter(
                  ([kind]) =>
                    (allowAggregate || kind !== "GROUP") &&
                    (!recipient || !["UNSPECIFIED", "GROUP"].includes(kind)),
                )
                .map(([kind, label, Icon]) => (
                  <label
                    key={kind}
                    className={`gap-md rounded-control px-lg py-md text-body flex cursor-pointer items-center border ${identity === kind ? "border-primary/40 bg-primary/5 text-text-primary" : "border-border text-text-secondary hover:bg-surface-elevated"}`}
                  >
                    <input
                      type="radio"
                      name="identityKind"
                      id={`${identityGroup}-${kind}`}
                      value={kind}
                      checked={identity === kind}
                      onChange={() => {
                        setIdentity(kind);
                        onBusinessContextChange?.(
                          kind === "BUSINESS" ||
                            (kind === "PERSON" && representsBusiness),
                        );
                      }}
                      className="accent-primary"
                    />
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </label>
                ))}
            </fieldset>
            {identity === "PERSON" && (
              <>
                <ReusableEntityCombobox
                  label="Person"
                  entityName="person"
                  idFieldName="personId"
                  queryFieldName="personName"
                  options={people}
                  initialId={value?.personId}
                  initialName={value?.personName ?? value?.personSnapshot}
                  searchAction={searchPeopleAction}
                  deferCreation
                  allowDuplicateNames
                  required={recipient}
                  optional={!recipient}
                  placeholder="Find or add a person…"
                />
                <label className="business-choice-row gap-sm text-body text-text-secondary flex items-center">
                  <input
                    type="checkbox"
                    checked={representsBusiness}
                    onChange={(event) => {
                      setRepresentsBusiness(event.target.checked);
                      onBusinessContextChange?.(event.target.checked);
                    }}
                  />
                  They represent a business in this record
                </label>
              </>
            )}
            {(identity === "BUSINESS" ||
              (identity === "PERSON" && representsBusiness)) && (
              <ReusableEntityCombobox
                label="Business"
                entityName="business"
                idFieldName="companyId"
                queryFieldName="companyName"
                options={companies}
                initialId={value?.companyId}
                initialName={value?.companyName ?? value?.companySnapshot}
                searchAction={searchCompaniesAction}
                deferCreation
                required={recipient}
                optional={!recipient}
                placeholder="Find or add a business…"
              />
            )}
            {["ANONYMOUS", "GROUP"].includes(identity) && (
              <BusinessField
                label={
                  identity === "GROUP"
                    ? "Source or group label"
                    : "Anonymous source label"
                }
                name="audienceLabel"
                value={value?.audienceLabel}
                required={recipient}
                hint={
                  identity === "GROUP"
                    ? "For example, mousepad enthusiast survey."
                    : "For example, anonymous daily gamer interview. This creates no person record."
                }
              />
            )}
            {identity === "GROUP" && (
              <>
                <div className="gap-lg grid sm:grid-cols-2">
                  <BusinessField
                    label="Reported sample size"
                    name="sampleSize"
                    type="number"
                    min={1}
                    step={1}
                    value={
                      value?.sampleSize ? String(value.sampleSize) : undefined
                    }
                  />
                  <BusinessField
                    label="Sample unit"
                    name="sampleUnit"
                    value={value?.sampleUnit}
                    hint="For example, respondents, cafés, or comments."
                  />
                </div>
                <p className="business-hint text-body-sm text-text-muted">
                  Keep only a count the source reports. Aggregate evidence does
                  not create individual contacts or responses.
                </p>
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

export function AudienceSummary({
  audienceContext,
  marketType,
  personSnapshot,
  companySnapshot,
  audienceLabel,
  sampleSize,
  sampleUnit,
}: AudienceFieldValue) {
  const identities = [personSnapshot, companySnapshot, audienceLabel].filter(
    Boolean,
  );
  const segments =
    audienceContext?.segments.map((segment) => segment.nameSnapshot) ?? [];
  return (
    <span className="gap-x-sm gap-y-xs inline-flex flex-wrap items-center">
      {identities.length > 0 && <span>{identities.join(" · ")}</span>}
      {segments.length > 0 && (
        <span>
          {identities.length ? "· " : ""}
          {segments.join(" · ")}
        </span>
      )}
      <span className="text-text-secondary">
        {identities.length || segments.length ? "· " : ""}
        {marketTypeLabel(audienceContext?.marketType ?? marketType)}
      </span>
      {sampleSize != null && (
        <span>
          · Source reports {sampleSize}
          {sampleUnit ? ` ${sampleUnit}` : " in the sample"}
        </span>
      )}
    </span>
  );
}
