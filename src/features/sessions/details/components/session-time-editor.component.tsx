"use client";

import { DateTime } from "luxon";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export function SessionTimeEditor({
  session,
  onSaved,
}: {
  session: SessionDetailItem;
  onSaved: (session: SessionDetailItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session.endedAt) return null;

  const formatInput = (iso: string) =>
    DateTime.fromISO(iso)
      .setZone(APP_TIMEZONE)
      .toFormat("yyyy-MM-dd'T'HH:mm:ss");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = DateTime.fromISO(value, {
      zone: APP_TIMEZONE,
    });
    if (!selected.isValid) {
      setError("Choose a valid date and time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endedAt: selected.toUTC().toISO(),
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
            setValue(formatInput(latest.endedAt!));
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
            setValue(formatInput(session.endedAt!));
            setError(null);
            setEditing(true);
          }}
        >
          Edit recorded time
        </button>
      ) : (
        <form onSubmit={save} className="gap-md grid">
          <label className="block">
            <span className="field-label">When did you stop working?</span>
            <input
              type="datetime-local"
              step="1"
              className="text-input"
              value={value}
              min={formatInput(session.startedAt)}
              max={formatInput(new Date().toISOString())}
              onChange={(event) => setValue(event.target.value)}
              required
              data-testid="session-corrected-end"
            />
          </label>
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
