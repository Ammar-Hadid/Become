"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { MOTION_DURATION_MS } from "@/components/ui/motion/constants/motion.constants";

const preludeLines = [
  "What came before has taken its shape.",
  "The months ahead have not.",
  "Choose what enters them.",
] as const;

const PRELUDE_BEAT_MS = MOTION_DURATION_MS.signature * 8;

export function SeasonOpeningPrelude({
  seasonLabel,
  onContinue,
}: {
  seasonLabel: string;
  onContinue: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;
    const timer = window.setTimeout(() => {
      if (reducedMotion.matches) return;
      if (lineIndex === preludeLines.length - 1) onContinue();
      else setLineIndex((current) => current + 1);
    }, PRELUDE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [lineIndex, onContinue]);

  return (
    <section
      className="season-opening-prelude"
      aria-labelledby="season-opening-prelude-title"
      aria-describedby="season-opening-prelude-description"
    >
      <h1 id="season-opening-prelude-title" className="sr-only">
        Opening {seasonLabel}
      </h1>
      <p id="season-opening-prelude-description" className="sr-only">
        {preludeLines.join(" ")}
      </p>

      <p className="eyebrow">{seasonLabel}</p>
      <div className="season-opening-prelude-lines" aria-hidden="true">
        {preludeLines.map((line, index) => (
          <p
            key={line}
            data-state={
              index === lineIndex
                ? "current"
                : index < lineIndex
                  ? "past"
                  : "future"
            }
          >
            {line}
          </p>
        ))}
      </div>

      <div className="season-opening-prelude-actions">
        <span className="season-opening-prelude-guide" aria-hidden="true">
          {preludeLines.map((line, index) => (
            <i key={line} data-current={index === lineIndex || undefined} />
          ))}
        </span>
        <Button type="button" variant="ghost" onClick={onContinue}>
          Open the season <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
