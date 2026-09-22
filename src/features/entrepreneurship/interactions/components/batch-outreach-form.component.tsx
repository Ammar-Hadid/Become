"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { useState } from "react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import { BusinessFormSection } from "@/features/entrepreneurship/shared/components/business-field.component";
import { batchOutreachAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
import { channels } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import {
  businessToday,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";
import {
  AudienceFields,
  type AudienceOption,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
type Values = {
  summary: string;
  channel: string;
  occurredAt: string;
  notes: string;
};
function BatchFields({
  companies,
  people = [],
  segments = [],
}: {
  companies: BusinessOption[];
  people?: BusinessOption[];
  segments?: AudienceOption[];
}) {
  const exploration = useExploration();
  const [key] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<BusinessOption[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<BusinessOption[]>([]);
  const recipients = [
    ...selected,
    ...selectedPeople.map((person) => ({
      ...person,
      id: `person:${person.id}`,
    })),
  ];
  const [shared, setShared] = useState<Values>({
    summary: "",
    channel: "EMAIL",
    occurredAt: businessToday(),
    notes: "",
  });
  const [overrides, setOverrides] = useState<Record<string, Partial<Values>>>(
    {},
  );
  const field = (
    name: keyof Values,
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label className="field-label">
      {label}
      {name === "channel" ? (
        <select
          className="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {channels.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </select>
      ) : name === "occurredAt" ? (
        <input
          className="text-input"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <textarea
          className="text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
  return (
    <>
      <input type="hidden" name="captureKey" value={key} />
      {exploration && !exploration.archived && (
        <>
          <input type="hidden" name="nicheId" value={exploration.id} />
          <p className="business-hint">
            These sent messages were part of {exploration.name}. Only include
            recipients contacted in this exploration.
          </p>
        </>
      )}
      <input
        name="overrides"
        type="hidden"
        value={JSON.stringify(
          Object.fromEntries(
            Object.entries(overrides).filter(([id]) =>
              recipients.some((c) => c.id === id),
            ),
          ),
        )}
      />
      <BusinessFormSection
        eyebrow="Recipients"
        title="Who you actually contacted"
        description="Select only people and businesses that received this outreach."
      >
        <BusinessRecordPicker
          kind="company"
          label="Business recipients"
          name="companyIds"
          nicheId={exploration?.id}
          options={companies}
          values={selected.map((company) => company.id)}
          multiple
          onSelectionChange={(items) => setSelected(items)}
          placeholder="Search active businesses…"
        />
        <BusinessRecordPicker
          kind="person"
          label="People contacted directly"
          name="personIds"
          nicheId={exploration?.id}
          options={people}
          values={selectedPeople.map((person) => person.id)}
          multiple
          onSelectionChange={(items) => setSelectedPeople(items)}
          placeholder="Search active people…"
        />
        <p className="business-hint">
          {recipients.length}{" "}
          {recipients.length === 1 ? "recipient" : "recipients"} selected
        </p>
        <AudienceFields target segments={segments} />
      </BusinessFormSection>
      <BusinessFormSection
        eyebrow="Shared record"
        title="Defaults for every message"
        description="You can override any field for an individual recipient below."
      >
        {(["occurredAt", "channel", "summary", "notes"] as const).map(
          (name) => (
            <div key={name}>
              {field(
                name,
                {
                  occurredAt: "Date sent",
                  channel: "Channel",
                  summary: "Shared summary",
                  notes: "Shared notes · optional",
                }[name],
                shared[name],
                (value) =>
                  setShared((current) => ({ ...current, [name]: value })),
              )}
              <input type="hidden" name={name} value={shared[name]} />
            </div>
          ),
        )}
      </BusinessFormSection>
      {recipients.map((company) => {
        const own = overrides[company.id] ?? {};
        const effective = { ...shared, ...own };
        return (
          <article key={company.id} className="business-form-record">
            <h3>{company.name}</h3>
            <p className="business-meta">
              {effective.occurredAt} · {humanize(effective.channel)} ·{" "}
              {Object.keys(own).length ? "Customized" : "Shared defaults"}
            </p>
            <p className="business-prose">
              {effective.summary || "Summary needed"}
            </p>
            <p className="business-hint">{effective.notes || "No notes"}</p>
            <details className="business-disclosure">
              <summary>Customize {company.name}</summary>
              <div>
                {(["occurredAt", "channel", "summary", "notes"] as const).map(
                  (name) => (
                    <div className="space-y-sm" key={name}>
                      <label className="business-hint">
                        <input
                          type="checkbox"
                          checked={Object.hasOwn(own, name)}
                          onChange={(e) =>
                            setOverrides((current) => {
                              const values = { ...current[company.id] };
                              if (e.target.checked) values[name] = shared[name];
                              else delete values[name];
                              return { ...current, [company.id]: values };
                            })
                          }
                        />{" "}
                        Override {name === "occurredAt" ? "date" : name} for{" "}
                        {company.name}
                      </label>
                      {Object.hasOwn(own, name) ? (
                        field(
                          name,
                          `${company.name} · ${name === "occurredAt" ? "Date sent" : humanize(name)}`,
                          own[name] ?? "",
                          (value) =>
                            setOverrides((current) => ({
                              ...current,
                              [company.id]: {
                                ...current[company.id],
                                [name]: value,
                              },
                            })),
                        )
                      ) : (
                        <p className="business-hint">Use shared value</p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </details>
          </article>
        );
      })}
      <label className="business-choice-row business-choice-row--confirm">
        <input type="checkbox" name="confirmedSent" required />I actually sent
        this message to each selected recipient. This records outreach already
        sent; it does not send messages.
      </label>
    </>
  );
}
export function BatchOutreachForm({
  companies,
  people,
  segments,
}: {
  companies: BusinessOption[];
  people?: BusinessOption[];
  segments?: AudienceOption[];
}) {
  return (
    <RecordDialog
      eyebrow="Manual record"
      triggerLabel="Record batch outreach"
      title="Record messages already sent"
      variant="secondary"
      description="One shared summary, one actual event per recipient. This records outreach; it doesn’t send messages."
    >
      <RecordForm
        action={batchOutreachAction}
        closeOnSuccess
        submitLabel="Record sent outreach"
      >
        <BatchFields
          companies={companies}
          people={people}
          segments={segments}
        />
      </RecordForm>
    </RecordDialog>
  );
}
