"use client";

import { Check, Move, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import {
  seasonImagePosition,
  seasonImagePositionDescription,
  type SeasonImagePosition,
} from "@/features/seasons/posters/utils/season-image-position.util";
import type { SeasonView } from "@/features/seasons/types/season.types";

function positionsMatch(a: SeasonImagePosition, b: SeasonImagePosition) {
  return Math.abs(a.x - b.x) < 0.0001 && Math.abs(a.y - b.y) < 0.0001;
}

export function SeasonCardPlacementEditor({
  season,
  initialPosition,
  saving,
  error,
  onCancel,
  onSave,
}: {
  season: SeasonView;
  initialPosition: SeasonImagePosition;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (position: SeasonImagePosition) => void;
}) {
  const [position, setPosition] = useState(initialPosition);
  const [available, setAvailable] = useState(true);
  const [movableAxes, setMovableAxes] = useState({ x: true, y: true });
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dirty = !positionsMatch(position, initialPosition);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const updateAxis = (axis: "x" | "y", value: number) =>
    setPosition((current) =>
      seasonImagePosition(
        axis === "x" ? value : current.x,
        axis === "y" ? value : current.y,
      ),
    );

  return (
    <section
      className="season-card-placement-editor"
      aria-labelledby="season-card-placement-title"
    >
      <header>
        <div>
          <p className="eyebrow">Edit card</p>
          <h3 id="season-card-placement-title">Adjust the featured image</h3>
          <p>
            Drag the image to choose what stays in frame. The card’s layout and
            words will not change.
          </p>
        </div>
        <aside>
          <Check aria-hidden="true" />
          <span>
            This focus point is also used by the season card on your dashboard.
          </span>
        </aside>
      </header>

      <p className="season-card-placement-boundary">
        You’re repositioning the current featured image. To choose a different
        image, cancel and use Change artwork.
      </p>

      <div className="season-opening-reveal-poster season-card-placement-preview">
        <SeasonPoster
          season={season}
          imagePosition={position}
          imageEditor={{
            autoFocus: true,
            disabled: saving,
            onAvailabilityChange: setAvailable,
            onChange: setPosition,
            onMovableAxesChange: setMovableAxes,
          }}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {seasonImagePositionDescription(position)}
      </p>

      {!available && (
        <div className="season-card-placement-unavailable" role="alert">
          <strong>Featured image unavailable</strong>
          <p>
            Repositioning is unavailable until the image can be loaded. Cancel
            and use Change artwork if you want to replace it.
          </p>
        </div>
      )}

      <details className="season-card-placement-fine-tune">
        <summary>
          <SlidersHorizontal aria-hidden="true" /> Fine tune
        </summary>
        <div>
          <label>
            <span>Horizontal image position</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(position.x * 100)}
              disabled={saving || !available || !movableAxes.x}
              onChange={(event) =>
                updateAxis("x", Number(event.target.value) / 100)
              }
            />
          </label>
          <label>
            <span>Vertical image position</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(position.y * 100)}
              disabled={saving || !available || !movableAxes.y}
              onChange={(event) =>
                updateAxis("y", Number(event.target.value) / 100)
              }
            />
          </label>
          {(!movableAxes.x || !movableAxes.y) && (
            <p>
              {!movableAxes.x && !movableAxes.y
                ? "This image already fills the crop at this card size."
                : !movableAxes.x
                  ? "This image already fills the available width."
                  : "This image already fills the available height."}
            </p>
          )}
        </div>
      </details>

      <footer className="season-card-placement-actions">
        <Button
          type="button"
          variant="ghost"
          disabled={
            saving || !available || positionsMatch(position, { x: 0.5, y: 0.5 })
          }
          onClick={() => setPosition({ x: 0.5, y: 0.5 })}
        >
          <Move aria-hidden="true" /> Center image
        </Button>
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !available || !dirty}
            onClick={() => onSave(position)}
          >
            {saving
              ? "Saving placement…"
              : error
                ? "Try again"
                : "Save placement"}
          </Button>
        </div>
      </footer>

      {error && (
        <p
          ref={errorRef}
          className="season-card-placement-error"
          role="alert"
          tabIndex={-1}
        >
          Image placement couldn’t be saved. Your adjustment is still here.{" "}
          {error}
        </p>
      )}
    </section>
  );
}
