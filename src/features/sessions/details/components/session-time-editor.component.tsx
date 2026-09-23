"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { DurationPicker } from "@/features/sessions/details/components/duration-picker.component";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";

export function SessionTimeEditor({
  session,
  onSaved,
}: {
  session: SessionDetailItem;
  onSaved: (session: SessionDetailItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(
    session.durationSeconds,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session.endedAt) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationSeconds,
            expectedEndedAt: session.endedAt,
          }),
        },
      );
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        if (response.status === 409) {
          const refreshed = await fetch(
            `/api/sessions/${encodeURIComponent(session.id)}`,
          );
          if (refreshed.ok) {
            const latest = (await refreshed.json()) as SessionDetailItem;
            onSaved(latest);
            setDurationSeconds(latest.durationSeconds);
          }
        }
        setError(result.error || "Could not update the session.");
        return;
      }
      onSaved((await response.json()) as SessionDetailItem);
      setEditing(false);
    } catch {
      setError("Could not update the session. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-border py-xl border-t">
      {!editing ? (
        <button
          type="button"
          className="text-primary hover:text-primary-hover text-body-sm font-medium"
          onClick={() => {
            setDurationSeconds(session.durationSeconds);
            setError(null);
            setEditing(true);
          }}
        >
          Edit recorded time
        </button>
      ) : (
        <form onSubmit={save} className="gap-md grid">
          <fieldset className="gap-sm m-0 grid min-w-0 border-0 p-0">
            <legend className="field-label">How long did you work?</legend>
            <DurationPicker
              value={durationSeconds}
              onChange={setDurationSeconds}
              disabled={saving}
            />
          </fieldset>
          <p className="text-text-muted text-body-sm">
            Focused time and reports will update. Recorded breaks stay excluded.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="gap-sm flex">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save time"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
