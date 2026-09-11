"use client";

import { History, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { SeasonView } from "@/features/seasons/types/season.types";

type ReusableImage = {
  mediaId: string;
  href: string;
  alt: string;
  width: number;
  height: number;
  seasonTitle: string;
  year: number;
  quarter: number;
  credit: string | null;
};

function responseError(body: unknown) {
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : "Past season images could not be loaded.";
}

export function CotsReusePicker({
  season,
  pending,
  onReuse,
  onClose,
}: {
  season: SeasonView;
  pending: boolean;
  onReuse: (mediaId: string, poster: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ReusableImage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [poster, setPoster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/direction/cots?year=${season.year}&quarter=${season.quarter}&library=1`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const body = (await response.json().catch(() => null)) as {
          items?: ReusableImage[];
          error?: string;
        } | null;
        if (!response.ok) throw new Error(responseError(body));
        const currentIds = new Set(season.media.map(({ id }) => id));
        setItems(
          (body?.items ?? []).filter(({ mediaId }) => !currentIds.has(mediaId)),
        );
      } catch (cause) {
        if ((cause as { name?: string }).name !== "AbortError")
          setError(
            cause instanceof Error
              ? cause.message
              : "Past season images could not be loaded.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [season.media, season.quarter, season.year]);

  return (
    <section
      className="cots-reuse-picker"
      aria-labelledby="cots-reuse-picker-title"
    >
      <header>
        <div>
          <p className="eyebrow">Reuse from a past season</p>
          <h3 id="cots-reuse-picker-title">Bring a familiar image forward.</h3>
          <p>
            This season gets its own placement and crop. The original season
            keeps its history.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close past season images"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      {loading ? (
        <p className="cots-collection-loading" role="status">
          Opening your past seasons…
        </p>
      ) : items.length ? (
        <div className="cots-reuse-grid">
          {items.map((item) => (
            <button
              key={item.mediaId}
              type="button"
              aria-pressed={selectedId === item.mediaId}
              onClick={() => setSelectedId(item.mediaId)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.href}
                alt={item.alt}
                width={item.width}
                height={item.height}
              />
              <span>
                <strong>{item.seasonTitle || `Season ${item.quarter}`}</strong>
                <small>
                  {item.year} · Season {item.quarter}
                  {item.credit ? ` · ${item.credit}` : ""}
                </small>
              </span>
              {selectedId === item.mediaId && <History aria-hidden="true" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="cots-reuse-empty">
          No other season images are ready to reuse yet.
        </p>
      )}

      {selectedId && (
        <label className="season-check-field">
          <input
            type="checkbox"
            checked={poster}
            onChange={(event) => setPoster(event.target.checked)}
          />
          <span>
            <Star aria-hidden="true" /> Use as this season’s poster
          </span>
        </label>
      )}
      {error && (
        <p className="cots-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!selectedId || pending}
          onClick={async () => {
            if (await onReuse(selectedId, poster)) onClose();
          }}
        >
          <History aria-hidden="true" /> {pending ? "Adding…" : "Reuse image"}
        </Button>
      </footer>
    </section>
  );
}
