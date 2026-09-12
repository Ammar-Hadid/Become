"use client";

import { BookCheck, Save } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import {
  confirmRecordFormDiscard,
  useRecordFormGuard,
} from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import type { SeasonView } from "@/features/seasons/types/season.types";

export function SeasonClosingCard({ season }: { season: SeasonView }) {
  const router = useRouter();
  const runStable = useStableOperation();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function closeSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    const identity = {
      type: "SEASON_LIFECYCLE" as const,
      year: season.year,
      quarter: season.quarter,
      expectedVersion: season.version,
      action: "CLOSE" as const,
      note,
    };
    const result = await runStable(identity, (operationKey) =>
      sendDirectionCommand({ ...identity, operationKey }),
    );
    setPending(false);
    setError(result.recoveredPrevious ? null : result.error);
    if (!result.error || result.recoveredPrevious) {
      markSaved();
      setOpen(false);
      router.refresh();
    }
  }

  if (season.closedAt) {
    return (
      <section className="season-closing-card season-closing-card--closed">
        <BookCheck aria-hidden="true" />
        <div>
          <p className="eyebrow">Season closed</p>
          <h2>{season.closingNote || "This season has been preserved."}</h2>
          <p>
            Closed {new Date(season.closedAt).toLocaleDateString()}. Its goals
            and evidence may continue to change independently.
          </p>
        </div>
      </section>
    );
  }
  if (season.calendar.phase !== "ENDED") return null;

  return (
    <section className="season-closing-card">
      <BookCheck aria-hidden="true" />
      <div>
        <p className="eyebrow">The calendar season has ended</p>
        <h2>Keep one small truth from this season.</h2>
        <p>
          Closing preserves this view. It does not reset, stop, or conclude any
          goal.
        </p>
        {!open && (
          <button type="button" onClick={() => setOpen(true)}>
            Close this season
          </button>
        )}
      </div>
      <form ref={formRef} onSubmit={closeSeason} hidden={!open}>
        <label>
          <span className="field-label">
            What do you want to remember? <span>— optional</span>
          </span>
          <textarea
            className="text-input text-input--textarea-sm"
            name="note"
            maxLength={6000}
            autoFocus={open}
          />
        </label>
        {error && (
          <p className="season-form-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirmRecordFormDiscard(formRef.current ?? undefined))
                setOpen(false);
            }}
          >
            Not yet
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden="true" />{" "}
            {pending ? "Closing…" : "Preserve this season"}
          </Button>
        </div>
      </form>
    </section>
  );
}
