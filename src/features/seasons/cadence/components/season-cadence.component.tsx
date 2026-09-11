"use client";

import { Check, Clock3, Compass } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import type { SeasonView } from "@/features/seasons/types/season.types";

export function SeasonCadence({ season }: { season: SeasonView }) {
  const router = useRouter();
  const runStable = useStableOperation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cadence = season.cadence;
  if (!cadence) return null;
  const cadenceMedia = season.presentation.cadenceMediaId
    ? season.media.find(({ id }) => id === season.presentation.cadenceMediaId)
    : null;
  const cadenceQuote = season.presentation.cadenceQuoteId
    ? season.quotes.find(({ id }) => id === season.presentation.cadenceQuoteId)
    : null;

  async function act(action: "ACKNOWLEDGE" | "SNOOZE") {
    setPending(true);
    setError(null);
    const identity = {
      type: "SEASON_LIFECYCLE" as const,
      year: season.year,
      quarter: season.quarter,
      expectedVersion: season.version,
      action,
      milestone: cadence!.key as
        "MIDPOINT" | "FINAL_14" | "FINAL_7" | "FINAL_3" | "ENDED",
      ...(action === "SNOOZE" ? { snoozeDays: 3 as const } : {}),
    };
    const result = await runStable(identity, (operationKey) =>
      sendDirectionCommand({ ...identity, operationKey }),
    );
    setPending(false);
    setError(result.recoveredPrevious ? null : result.error);
    if (!result.error || result.recoveredPrevious) router.refresh();
  }

  return (
    <section className="season-cadence" aria-labelledby="season-cadence-title">
      {cadenceMedia ? (
        <span className="season-cadence-visual">
          {/* Authenticated local media cannot use the default optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cadenceMedia.href}
            alt={cadenceMedia.decorative ? "" : cadenceMedia.alt}
            width={cadenceMedia.width}
            height={cadenceMedia.height}
            style={{
              objectPosition: `${cadenceMedia.focalX * 100}% ${cadenceMedia.focalY * 100}%`,
            }}
          />
        </span>
      ) : (
        <span className="season-cadence-mark" aria-hidden="true">
          <Compass />
        </span>
      )}
      <div>
        <p className="eyebrow">A moment to return</p>
        <h2 id="season-cadence-title">{cadence.title}</h2>
        <p>{cadence.body}</p>
        {cadenceQuote && (
          <SeasonQuoteExcerpt
            className="season-cadence-quote"
            quote={cadenceQuote}
          />
        )}
        {error && (
          <p className="direction-inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="season-cadence-actions">
        <Link
          href={`/direction/seasons/${season.year}/${season.quarter}/opening`}
        >
          Revisit direction
        </Link>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => void act("SNOOZE")}
        >
          <Clock3 aria-hidden="true" /> In 3 days
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void act("ACKNOWLEDGE")}
        >
          <Check aria-hidden="true" /> Done for now
        </Button>
      </div>
    </section>
  );
}
