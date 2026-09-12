"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import "@/features/direction/styles/direction.css";

export default function DirectionError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell direction-shell">
      <section className="direction-page-error" role="alert">
        <p className="eyebrow">Direction paused</p>
        <h1>This season could not be loaded.</h1>
        <p>
          Your saved season and goals have not changed. Try loading this view
          again.
        </p>
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" /> Try again
        </Button>
      </section>
    </div>
  );
}
