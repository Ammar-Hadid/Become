"use client";

import {
  AlertCircle,
  ChevronDown,
  Eye,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { ReusableEntityCombobox } from "@/components/ui/forms/reusable-entity-combobox.component";
import { CriterionPreview } from "@/features/direction/criteria/components/criterion-preview.component";
import {
  searchDirectionOptions,
  type DirectionOptionKind,
} from "@/features/direction/options/utils/direction-option-client.util";
import { getMetricCatalog } from "@/features/direction/preview/utils/direction-preview-client.util";
import type {
  CriterionDraft,
  CriterionEvaluation,
  CriterionScopes,
  MetricCapability,
  OwnedOption,
} from "@/features/direction/types/direction.types";

const evidenceTypes = [
  ["FEATURE_COMPLETED", "Feature completed"],
  ["BUG_SOLVED", "Bug solved"],
  ["CONCEPT_LEARNED", "Concept learned"],
  ["DEPLOYMENT", "Deployment"],
  ["ARCHITECTURE_DECISION", "Architecture decision"],
  ["TECHNICAL_DISCOVERY", "Technical discovery"],
] as const;

const contentFormats = [
  ["", "Every format"],
  ["LONG_FORM", "Long form"],
  ["SHORT_VERTICAL", "Short vertical"],
  ["OTHER", "Other format"],
] as const;

function newCriterion(metric: CriterionDraft["metric"]): CriterionDraft {
  return {
    key: crypto.randomUUID(),
    metric,
    label: "",
    target: "",
  };
}

function ScopePicker({
  criterion,
  field,
  label,
  entityName,
  optionKind,
  initial,
  onChange,
  optional = true,
  scope,
}: {
  criterion: CriterionDraft;
  field:
    | "workSourceId"
    | "companyId"
    | "personId"
    | "segmentId"
    | "offerRevisionId"
    | "nicheId"
    | "projectId"
    | "domainId"
    | "activityTypeId"
    | "savingsGoalId"
    | "contentId"
    | "channelId";
  label: string;
  entityName: string;
  optionKind: DirectionOptionKind;
  initial?: OwnedOption;
  onChange: (patch: Partial<CriterionDraft>) => void;
  optional?: boolean;
  scope?: { companyId?: string; domainId?: string };
}) {
  const selectedId = criterion[field];
  const initialOption = initial?.id === selectedId ? initial : undefined;
  return (
    <ReusableEntityCombobox
      key={`${criterion.key}-${field}-${scope?.companyId ?? ""}-${scope?.domainId ?? ""}`}
      label={label}
      entityName={entityName}
      idFieldName={`criteria.${criterion.key}.${field}`}
      queryFieldName={`criteria.${criterion.key}.${field}Search`}
      options={initialOption ? [initialOption] : []}
      initialId={selectedId}
      initialName={initialOption?.name}
      optional={optional}
      required={!optional}
      searchAction={(query) => searchDirectionOptions(optionKind, query, scope)}
      onSelectedOptionChange={(option) =>
        onChange({ [field]: option?.id || undefined })
      }
      placeholder={`Search ${entityName.toLowerCase()}…`}
    />
  );
}

export function CriterionBuilder({
  criteria,
  criterionMode,
  scopeOptions = {},
  preview,
  previewError,
  previewPending,
  onChange,
  onModeChange,
  onPreview,
  context = "GOAL",
}: {
  criteria: CriterionDraft[];
  criterionMode: "ALL" | "ANY";
  scopeOptions?: CriterionScopes;
  preview: CriterionEvaluation[];
  previewError: string | null;
  previewPending: boolean;
  onChange: (criteria: CriterionDraft[]) => void;
  onModeChange: (mode: "ALL" | "ANY") => void;
  onPreview: () => void;
  context?: "GOAL" | "EXPERIMENT";
}) {
  const [catalog, setCatalog] = useState<MetricCapability[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMetricCatalog()
      .then((items) => {
        if (!cancelled) {
          setCatalog(items);
          setCatalogError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Evidence definitions could not be loaded.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patchCriterion(key: string, patch: Partial<CriterionDraft>) {
    onChange(
      criteria.map((criterion) =>
        criterion.key === key ? { ...criterion, ...patch } : criterion,
      ),
    );
  }

  return (
    <section
      className="direction-criteria-builder"
      aria-labelledby="criteria-builder-title"
    >
      <header className="direction-criteria-header">
        <div>
          <p className="eyebrow">Optional evidence</p>
          <h2 id="criteria-builder-title">
            Define what the record can establish.
          </h2>
          <p>
            Every definition names its source, window, and exclusions. Leave
            this empty when the outcome needs your judgment.
          </p>
        </div>
        {criteria.length > 1 && (
          <fieldset className="direction-mode-switch">
            <legend className="sr-only">How criteria combine</legend>
            <button
              type="button"
              aria-pressed={criterionMode === "ALL"}
              onClick={() => onModeChange("ALL")}
            >
              All required
            </button>
            <button
              type="button"
              aria-pressed={criterionMode === "ANY"}
              onClick={() => onModeChange("ANY")}
            >
              Any one
            </button>
          </fieldset>
        )}
      </header>

      {catalogError && (
        <p className="season-form-error" role="alert">
          <AlertCircle aria-hidden="true" /> {catalogError}
        </p>
      )}

      <div className="direction-criterion-editors">
        {criteria.map((criterion, index) => {
          const capability = catalog.find(
            ({ key }) => key === criterion.metric,
          );
          const resolvedScopes = scopeOptions[criterion.key] ?? {};
          const evaluation = preview.find(({ key }) => key === criterion.key);
          const monetary =
            capability?.monetary ??
            [
              "WORK_SOURCE_INCOME",
              "BUSINESS_RECEIPTS",
              "NEW_RECURRING_COMPANY",
            ].includes(criterion.metric);
          const projectCompletion =
            criterion.metric === "ENGINEERING_PROJECT_COMPLETED";
          const needsTarget =
            !projectCompletion &&
            !["MANUAL", "SAVINGS_GOAL"].includes(criterion.metric);
          const isContentMetric = [
            "CONTENT_CREATED",
            "CONTENT_VARIANTS_CREATED",
            "CONTENT_PUBLICATIONS",
          ].includes(criterion.metric);
          const isContentTime =
            criterion.metric === "SESSION_TIME" &&
            Boolean(criterion.contentId || criterion.selectedContentOnly);
          const hasAudienceScope = [
            "CONVERSATIONS",
            "CONVERSATION_PEOPLE",
            "BUSINESS_RECEIPTS",
          ].includes(criterion.metric);
          const patch = (value: Partial<CriterionDraft>) =>
            patchCriterion(criterion.key, value);
          return (
            <details
              className="direction-criterion-editor"
              key={criterion.key}
              open
            >
              <summary>
                <span>
                  <em>{String(index + 1).padStart(2, "0")}</em>
                  <strong>
                    {criterion.label ||
                      capability?.name ||
                      "Evidence definition"}
                  </strong>
                </span>
                <span>
                  {capability?.unit ?? "definition"}
                  <ChevronDown aria-hidden="true" />
                </span>
              </summary>
              <div className="direction-criterion-body">
                <div className="direction-form-grid">
                  <label>
                    <span className="field-label">Evidence type</span>
                    <span className="select-wrap">
                      <select
                        value={criterion.metric}
                        onChange={(event) =>
                          onChange(
                            criteria.map((item) =>
                              item.key === criterion.key
                                ? {
                                    ...newCriterion(
                                      event.target
                                        .value as CriterionDraft["metric"],
                                    ),
                                    key: item.key,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {catalog.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                  <label>
                    <span className="field-label">Definition label</span>
                    <input
                      className="text-input"
                      value={criterion.label}
                      maxLength={200}
                      onChange={(event) => patch({ label: event.target.value })}
                      placeholder={
                        capability?.name ?? "What this evidence means"
                      }
                    />
                  </label>
                  {needsTarget && (
                    <label>
                      <span className="field-label">
                        {monetary
                          ? "Target amount"
                          : `Target ${capability?.unit ?? "value"}`}
                      </span>
                      <input
                        className="text-input"
                        inputMode={monetary ? "decimal" : "numeric"}
                        value={criterion.target}
                        onChange={(event) =>
                          patch({ target: event.target.value })
                        }
                        placeholder={monetary ? "150.00" : "1"}
                      />
                    </label>
                  )}
                  {monetary && (
                    <CurrencySelect
                      value={criterion.currency ?? ""}
                      onValueChange={(currency) => patch({ currency })}
                      required
                    />
                  )}
                  {!projectCompletion && (
                    <>
                      <label>
                        <span className="field-label">
                          Evidence starts <span>— defaults to goal</span>
                        </span>
                        <input
                          className="text-input"
                          type="date"
                          value={criterion.startOn ?? ""}
                          onChange={(event) =>
                            patch({ startOn: event.target.value || undefined })
                          }
                        />
                      </label>
                      <label>
                        <span className="field-label">
                          Evidence ends <span>— defaults to goal</span>
                        </span>
                        <input
                          className="text-input"
                          type="date"
                          value={criterion.endOn ?? ""}
                          onChange={(event) =>
                            patch({ endOn: event.target.value || undefined })
                          }
                        />
                      </label>
                    </>
                  )}

                  {(isContentMetric || criterion.metric === "SESSION_TIME") &&
                    !criterion.selectedContentOnly && (
                      <ScopePicker
                        criterion={criterion}
                        field="contentId"
                        label={
                          criterion.metric === "SESSION_TIME"
                            ? "Creative work time"
                            : "One creative work"
                        }
                        entityName="creative work"
                        optionKind="content"
                        initial={resolvedScopes.contentId}
                        onChange={(value) =>
                          patch({
                            ...value,
                            ...(criterion.metric === "SESSION_TIME" &&
                            value.contentId
                              ? {
                                  domainId: undefined,
                                  activityTypeId: undefined,
                                  projectId: undefined,
                                  nicheId: undefined,
                                  companyId: undefined,
                                }
                              : {}),
                          })
                        }
                      />
                    )}
                  {criterion.metric === "CONTENT_PUBLICATIONS" && (
                    <ScopePicker
                      criterion={criterion}
                      field="channelId"
                      label="Release channel"
                      entityName="channel"
                      optionKind="channel"
                      initial={resolvedScopes.channelId}
                      onChange={patch}
                    />
                  )}
                  {[
                    "CONTENT_VARIANTS_CREATED",
                    "CONTENT_PUBLICATIONS",
                  ].includes(criterion.metric) && (
                    <label>
                      <span className="field-label">
                        Version format <span>— optional</span>
                      </span>
                      <span className="select-wrap">
                        <select
                          value={criterion.contentFormat ?? ""}
                          onChange={(event) =>
                            patch({
                              contentFormat:
                                (event.target.value as
                                  CriterionDraft["contentFormat"] | "") ||
                                undefined,
                            })
                          }
                        >
                          {contentFormats.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                  )}
                  {context === "EXPERIMENT" &&
                    (isContentMetric ||
                      criterion.metric === "SESSION_TIME") && (
                      <label className="direction-outreach-only direction-field-wide">
                        <input
                          type="checkbox"
                          checked={criterion.selectedContentOnly ?? false}
                          onChange={(event) =>
                            patch({
                              selectedContentOnly: event.target.checked,
                              ...(event.target.checked
                                ? {
                                    contentId: undefined,
                                    domainId: undefined,
                                    activityTypeId: undefined,
                                    projectId: undefined,
                                    nicheId: undefined,
                                    companyId: undefined,
                                  }
                                : {}),
                            })
                          }
                        />
                        <span>
                          <strong>
                            Only work selected for this experiment
                          </strong>
                          <small>
                            Choose the exact creative work cohort in the
                            experiment above. The evidence stays unconfigured
                            until at least one work is selected.
                          </small>
                        </span>
                      </label>
                    )}

                  {criterion.metric === "WORK_SOURCE_INCOME" && (
                    <ScopePicker
                      criterion={criterion}
                      field="workSourceId"
                      label="Exact WorkSource"
                      entityName="WorkSource"
                      optionKind="workSource"
                      initial={resolvedScopes.workSourceId}
                      optional={false}
                      onChange={patch}
                    />
                  )}
                  {criterion.metric === "NEW_RECURRING_COMPANY" && (
                    <ScopePicker
                      criterion={criterion}
                      field="companyId"
                      label="Business scope"
                      entityName="business"
                      optionKind="company"
                      initial={resolvedScopes.companyId}
                      onChange={(value) =>
                        patch({
                          ...value,
                          offerRevisionId:
                            value.companyId === criterion.companyId
                              ? criterion.offerRevisionId
                              : undefined,
                          baselineAssertions:
                            value.companyId === criterion.companyId
                              ? criterion.baselineAssertions
                              : undefined,
                        })
                      }
                    />
                  )}
                  {criterion.metric === "NEW_RECURRING_COMPANY" && (
                    <ScopePicker
                      criterion={criterion}
                      field="offerRevisionId"
                      label="Offer revision"
                      entityName="offer revision"
                      optionKind="offerRevision"
                      initial={resolvedScopes.offerRevisionId}
                      scope={{ companyId: criterion.companyId }}
                      onChange={patch}
                    />
                  )}
                  {[
                    "CONVERSATION_COMPANIES",
                    ...(isContentTime ? [] : ["SESSION_TIME"]),
                  ].includes(criterion.metric) && (
                    <ScopePicker
                      criterion={criterion}
                      field="nicheId"
                      label="Exploration scope"
                      entityName="exploration"
                      optionKind="niche"
                      initial={resolvedScopes.nicheId}
                      onChange={patch}
                    />
                  )}
                  {[
                    "CONVERSATION_COMPANIES",
                    ...(isContentTime ? [] : ["SESSION_TIME"]),
                  ].includes(criterion.metric) && (
                    <ScopePicker
                      criterion={criterion}
                      field="companyId"
                      label="Business scope"
                      entityName="business"
                      optionKind="company"
                      initial={resolvedScopes.companyId}
                      onChange={patch}
                    />
                  )}
                  {hasAudienceScope && (
                    <details
                      className="direction-field-wide rounded-control border-border p-lg border"
                      open={
                        Boolean(
                          criterion.nicheId ||
                          criterion.personId ||
                          criterion.companyId ||
                          criterion.segmentId ||
                          criterion.marketType ||
                          criterion.offerRevisionId,
                        ) || undefined
                      }
                    >
                      <summary className="text-body cursor-pointer font-medium">
                        Audience scope
                        {criterion.metric === "BUSINESS_RECEIPTS"
                          ? " · choose a boundary"
                          : " · optional"}
                      </summary>
                      <div className="direction-form-grid mt-xl">
                        <p className="direction-field-wide text-body-sm text-text-secondary">
                          {criterion.metric === "BUSINESS_RECEIPTS"
                            ? "Choose an exploration, person, business, segment, or exact offer terms to define which actual receipts count."
                            : "Leave these open to count every qualifying conversation, or limit the definition to the audience you examined."}{" "}
                          Identity and buying context remain separate.
                        </p>
                        <ScopePicker
                          criterion={criterion}
                          field="nicheId"
                          label="Exploration"
                          entityName="exploration"
                          optionKind="niche"
                          initial={resolvedScopes.nicheId}
                          onChange={patch}
                        />
                        <ScopePicker
                          criterion={criterion}
                          field="personId"
                          label="Person"
                          entityName="person"
                          optionKind="person"
                          initial={resolvedScopes.personId}
                          onChange={patch}
                        />
                        <ScopePicker
                          criterion={criterion}
                          field="companyId"
                          label="Business"
                          entityName="business"
                          optionKind="company"
                          initial={resolvedScopes.companyId}
                          onChange={(value) =>
                            patch({
                              ...value,
                              ...(criterion.metric === "BUSINESS_RECEIPTS"
                                ? {
                                    offerRevisionId:
                                      value.companyId === criterion.companyId
                                        ? criterion.offerRevisionId
                                        : undefined,
                                  }
                                : {}),
                            })
                          }
                        />
                        <ScopePicker
                          criterion={criterion}
                          field="segmentId"
                          label="Audience segment"
                          entityName="segment"
                          optionKind="segment"
                          initial={resolvedScopes.segmentId}
                          onChange={patch}
                        />
                        <label>
                          <span className="field-label">
                            Recorded buying context
                          </span>
                          <select
                            className="text-input"
                            value={criterion.marketType ?? ""}
                            onChange={(event) =>
                              patch({
                                marketType: (event.target.value ||
                                  undefined) as CriterionDraft["marketType"],
                              })
                            }
                          >
                            <option value="">Every recorded context</option>
                            <option value="UNKNOWN">Not sure yet</option>
                            <option value="B2C">Consumers</option>
                            <option value="B2B">Businesses</option>
                            <option value="BOTH">Consumers & businesses</option>
                          </select>
                        </label>
                        {criterion.metric === "BUSINESS_RECEIPTS" && (
                          <ScopePicker
                            criterion={criterion}
                            field="offerRevisionId"
                            label="Exact shared offer terms"
                            entityName="offer revision"
                            optionKind="offerRevision"
                            initial={resolvedScopes.offerRevisionId}
                            scope={{ companyId: criterion.companyId }}
                            onChange={patch}
                          />
                        )}
                      </div>
                    </details>
                  )}
                  {context === "EXPERIMENT" &&
                    [
                      "CONVERSATIONS",
                      "CONVERSATION_COMPANIES",
                      "CONVERSATION_PEOPLE",
                    ].includes(criterion.metric) && (
                      <label className="direction-outreach-only direction-field-wide">
                        <input
                          type="checkbox"
                          checked={criterion.selectedOutreachOnly ?? false}
                          onChange={(event) =>
                            patch({
                              selectedOutreachOnly: event.target.checked,
                            })
                          }
                        />
                        <span>
                          <strong>
                            Only conversations linked to this trial’s selected
                            outreach
                          </strong>
                          <small>
                            Same recorded recipient, exploration, and evidence
                            window. Choose at least one outreach record before
                            this definition can be evaluated.
                          </small>
                        </span>
                      </label>
                    )}
                  {[
                    "SESSION_TIME",
                    "ENGINEERING_EVIDENCE",
                    "ENGINEERING_PROJECT_COMPLETED",
                  ].includes(criterion.metric) &&
                    !isContentTime && (
                      <ScopePicker
                        criterion={criterion}
                        field="projectId"
                        label={
                          projectCompletion
                            ? "Engineering project"
                            : "Project scope"
                        }
                        entityName="project"
                        optionKind="project"
                        initial={resolvedScopes.projectId}
                        optional={!projectCompletion}
                        onChange={patch}
                      />
                    )}
                  {criterion.metric === "SESSION_TIME" && !isContentTime && (
                    <ScopePicker
                      criterion={criterion}
                      field="domainId"
                      label="Domain scope"
                      entityName="domain"
                      optionKind="domain"
                      initial={resolvedScopes.domainId}
                      onChange={(value) =>
                        patch({
                          ...value,
                          activityTypeId:
                            value.domainId === criterion.domainId
                              ? criterion.activityTypeId
                              : undefined,
                        })
                      }
                    />
                  )}
                  {criterion.metric === "SESSION_TIME" && !isContentTime && (
                    <ScopePicker
                      criterion={criterion}
                      field="activityTypeId"
                      label="Activity scope"
                      entityName="activity"
                      optionKind="activity"
                      initial={resolvedScopes.activityTypeId}
                      scope={{ domainId: criterion.domainId }}
                      onChange={patch}
                    />
                  )}
                  {criterion.metric === "ENGINEERING_EVIDENCE" && (
                    <label>
                      <span className="field-label">
                        Output kind <span>— optional</span>
                      </span>
                      <span className="select-wrap">
                        <select
                          value={criterion.evidenceType ?? ""}
                          onChange={(event) =>
                            patch({
                              evidenceType: event.target.value || undefined,
                            })
                          }
                        >
                          <option value="">Every output kind</option>
                          {evidenceTypes.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </span>
                    </label>
                  )}
                  {criterion.metric === "SAVINGS_GOAL" && (
                    <ScopePicker
                      criterion={criterion}
                      field="savingsGoalId"
                      label="Finance savings goal"
                      entityName="savings goal"
                      optionKind="savingsGoal"
                      initial={resolvedScopes.savingsGoalId}
                      optional={false}
                      onChange={patch}
                    />
                  )}

                  {criterion.metric === "NEW_RECURRING_COMPANY" && (
                    <>
                      <label>
                        <span className="field-label">
                          Minimum received{" "}
                          <span>— optional, separate from quote</span>
                        </span>
                        <input
                          className="text-input"
                          inputMode="decimal"
                          value={criterion.minimumReceived ?? ""}
                          onChange={(event) =>
                            patch({
                              minimumReceived: event.target.value || undefined,
                            })
                          }
                          placeholder="A separate receipt threshold"
                        />
                      </label>
                      {criterion.companyId && (
                        <div className="direction-baseline direction-field-wide">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(
                                criterion.baselineAssertions?.some(
                                  ({ companyId, noPriorPaidRelationship }) =>
                                    companyId === criterion.companyId &&
                                    noPriorPaidRelationship,
                                ),
                              )}
                              onChange={(event) =>
                                patch({
                                  baselineAssertions: event.target.checked
                                    ? [
                                        {
                                          companyId: criterion.companyId!,
                                          noPriorPaidRelationship: true,
                                          note:
                                            criterion.baselineAssertions?.[0]
                                              ?.note ?? "",
                                        },
                                      ]
                                    : [],
                                })
                              }
                            />
                            <span>
                              I reviewed the history and found no paid
                              relationship before this baseline.
                            </span>
                          </label>
                          {criterion.baselineAssertions?.[0]
                            ?.noPriorPaidRelationship && (
                            <textarea
                              className="text-input text-input--textarea-sm"
                              value={criterion.baselineAssertions[0].note}
                              onChange={(event) =>
                                patch({
                                  baselineAssertions: [
                                    {
                                      ...criterion.baselineAssertions![0],
                                      note: event.target.value,
                                    },
                                  ],
                                })
                              }
                              placeholder="What history did you review?"
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {capability && (
                  <aside className="direction-capability-note">
                    <strong>{capability.description}</strong>
                    {capability.caveat && <p>{capability.caveat}</p>}
                  </aside>
                )}

                {evaluation && <CriterionPreview criterion={evaluation} />}
                <button
                  className="direction-remove-criterion"
                  type="button"
                  onClick={() =>
                    onChange(
                      criteria.filter(({ key }) => key !== criterion.key),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" /> Remove this definition
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <div className="direction-criteria-actions">
        <button
          type="button"
          disabled={!catalog.length || criteria.length >= 8}
          onClick={() =>
            onChange([...criteria, newCriterion(catalog[0]?.key ?? "MANUAL")])
          }
        >
          <Plus aria-hidden="true" /> Add evidence definition
        </button>
        {criteria.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            disabled={previewPending}
            onClick={onPreview}
          >
            {previewPending ? (
              <LoaderCircle className="direction-spin" aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}{" "}
            {previewPending ? "Reading evidence…" : "Preview current evidence"}
          </Button>
        )}
      </div>
      {previewError && (
        <p className="season-form-error" role="alert">
          {previewError}
        </p>
      )}
    </section>
  );
}
