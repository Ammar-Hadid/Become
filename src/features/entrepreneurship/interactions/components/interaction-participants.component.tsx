"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { Input } from "@/components/ui/forms/input.component";
import { useState } from "react";
export type ParticipantSnapshot = {
  name: string;
  role?: string | null;
  email?: string;
};
export function InteractionParticipants({
  initial = [],
}: {
  initial?: ParticipantSnapshot[];
}) {
  const [rows, setRows] = useState(() =>
    initial.map((p) => ({ ...p, key: crypto.randomUUID() })),
  );
  return (
    <div className="business-form-collection">
      <input
        type="hidden"
        name="participants"
        value={JSON.stringify(
          rows.map(({ name, role, email }) => ({
            name,
            role,
            email: email || undefined,
          })),
        )}
      />
      <p className="business-hint">
        Who was involved? These are snapshots for this interaction.
      </p>
      {rows.map((row, i) => (
        <fieldset key={row.key} className="business-form-record">
          <legend>Participant {i + 1}</legend>
          <div className="gap-lg grid sm:grid-cols-2">
            {(["name", "role", "email"] as const).map((field) => (
              <label key={field} className="field-label">
                {field === "name"
                  ? "Name"
                  : field === "role"
                    ? "Role"
                    : "Email · optional"}
                <Input
                  type={field === "email" ? "email" : "text"}
                  required={field === "name"}
                  value={row[field] ?? ""}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((r) =>
                        r.key === row.key
                          ? { ...r, [field]: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            type="button"

            aria-label={`Remove participant ${i + 1}`}
            onClick={() =>
              setRows((current) => current.filter((r) => r.key !== row.key))
            }
          >
            Remove participant
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        type="button"

        disabled={rows.length >= 30}
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: crypto.randomUUID(), name: "", role: "", email: "" },
          ])
        }
      >
        Add participant
      </Button>
    </div>
  );
}
