"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/cards/card.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Badge } from "@/components/ui/badges/badge.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import "./character-confirmation.css";

export type CharacterConfirmationMatch = {
  name: string;
  sourceWork: string;
  adaptation: string;
  images: {
    href: string;
    alt: string;
    sourceUrl: string;
    sourceLabel: string;
  }[];
};
export function CharacterConfirmation({
  match,
  loading = false,
  busy = false,
  aiUsed = false,
  notice,
  onConfirm,
  onDifferentVersion,
  onWrongCharacter,
  actions,
  emptyImageMessage,
  footer,
}: {
  match: CharacterConfirmationMatch | null;
  loading?: boolean;
  busy?: boolean;
  aiUsed?: boolean;
  notice?: string | null;
  onConfirm: () => void;
  onDifferentVersion: () => void;
  onWrongCharacter: () => void;
  /** Feature-owned copy/actions; shared layout and carousel stay consistent. */
  actions?: ReactNode;
  emptyImageMessage?: ReactNode;
  footer?: ReactNode;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const images = match?.images ?? [];
  const currentIndex = images.length ? imageIndex % images.length : 0;
  const currentImage = images[currentIndex];
  function advance(direction: number) {
    if (images.length > 1)
      setImageIndex(
        (index) => (index + direction + images.length) % images.length,
      );
  }
  return (
    <Card
      material="glass"
      spacing="action"
      className="character-confirmation"
      aria-busy={loading || busy}
    >
      <header className="character-confirmation__heading">
        <IconFrame treatment="featured" area="direction">
          {loading || aiUsed ? <Sparkles /> : <Search />}
        </IconFrame>
        <div>
          <p className="type-overline">
            {aiUsed
              ? "AI · CHARACTER IDENTIFICATION"
              : "CHARACTER IDENTIFICATION"}
          </p>
          <h2 className="type-widget-title">
            {loading
              ? "Finding your character"
              : match
                ? "Is this the character you mean?"
                : "Let’s find the right character"}
          </h2>
        </div>
        {loading && (
          <LoadingIndicator
            label="Looking up character records and reference images"
            area="direction"
          />
        )}
      </header>
      {loading ? (
        <p className="type-body">
          Checking the character, source work, and existing reference images.
        </p>
      ) : match ? (
        <>
          <div className="character-confirmation__identity">
            <h3 className="type-section-title">{match.name}</h3>
            <p className="type-body">{match.sourceWork}</p>
            <Badge variant="specimen-strip" area="direction">
              {match.adaptation}
            </Badge>
          </div>
          {currentImage ? (
            <div
              className="character-confirmation__carousel"
              role="region"
              aria-roledescription="carousel"
              aria-label={`${match.name} source images`}
              tabIndex={images.length > 1 ? 0 : undefined}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  advance(event.key === "ArrowLeft" ? -1 : 1);
                }
              }}
              onTouchStart={(event) => {
                const touch = event.touches[0];
                touchStart.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (!start) return;
                const touch = event.changedTouches[0];
                const dx = touch.clientX - start.x;
                if (
                  Math.abs(dx) > 40 &&
                  Math.abs(dx) > Math.abs(touch.clientY - start.y)
                )
                  advance(dx > 0 ? -1 : 1);
              }}
            >
              <figure>
                <div className="character-confirmation__image">
                  <Image
                    key={currentImage.href}
                    src={currentImage.href}
                    alt={currentImage.alt}
                    fill
                    unoptimized
                    sizes="90vw"
                  />
                </div>
                <figcaption className="character-confirmation__image-controls">
                  <a
                    className="type-caption"
                    href={currentImage.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentImage.sourceLabel} ↗
                  </a>
                  {images.length > 1 && (
                    <div className="character-confirmation__pagination">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Previous source image"
                        onClick={() => advance(-1)}
                      >
                        <ChevronLeft aria-hidden="true" />
                      </Button>
                      <span
                        className="type-caption"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {currentIndex + 1} / {images.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Next source image"
                        onClick={() => advance(1)}
                      >
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </figcaption>
              </figure>
            </div>
          ) : (
            <p className="type-body-sm">
              {emptyImageMessage ??
                "This record has no image. You can confirm the identity and add authentic references before generation."}
            </p>
          )}
          <div className="character-confirmation__actions">
            {actions ?? (
              <>
                <Button disabled={busy} onClick={onConfirm}>
                  <Check aria-hidden="true" /> Yes, this character
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={onDifferentVersion}
                >
                  Different version
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={onWrongCharacter}
                >
                  Wrong character
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="type-body">
          No reliable match yet. Refine the name or provide the character and
          references yourself.
        </p>
      )}
      {notice && (
        <p className="type-body-sm" role="status">
          {notice}
        </p>
      )}
      {!loading && match && footer !== null && (
        <p className="type-caption">
          {footer === undefined
            ? "Existing source images. Confirm both the character and the version you want."
            : footer}
        </p>
      )}
    </Card>
  );
}
