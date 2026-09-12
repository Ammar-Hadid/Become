"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImageOff,
  Layers3,
  Quote,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  CotsFinalizationChoices,
  CotsFinalizationImageChoice,
} from "@/features/seasons/discovery/types/cots-finalization.types";
import { cn } from "@/lib/styles/utils/class-name.util";

function imageStatus(choice: CotsFinalizationImageChoice, featured: boolean) {
  if (choice.status === "FAILED") return "Couldn’t be saved";
  if (choice.status === "PENDING" || choice.status === "SELECTED")
    return featured ? "Featured when ready" : "Waiting to import";
  if (choice.status === "IMPORTING")
    return featured ? "Featured when ready" : "Importing · choose now";
  return featured ? "Featured image" : "Ready";
}

function FinalImageArtwork({
  choice,
  featured,
  eager,
}: {
  choice: CotsFinalizationImageChoice;
  featured: boolean;
  eager: boolean;
}) {
  return (
    <>
      <span className="cots-final-image-preview">
        {choice.href ? (
          // Discovery and authenticated media URLs both need browser credentials.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={choice.href}
            alt={choice.alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="cots-final-image-missing">
            <ImageOff aria-hidden="true" /> Preview unavailable
          </span>
        )}
        <span className="cots-final-feature-badge">
          {featured && <Check aria-hidden="true" />}
          {imageStatus(choice, featured)}
        </span>
      </span>
      <span className="cots-final-image-copy">
        <strong>{choice.title}</strong>
        <small>{choice.detail}</small>
      </span>
    </>
  );
}

export function CotsFinalization({
  choices,
  selectedImageKey,
  selectedQuoteId,
  busy,
  blockedImage = null,
  onSelectImage,
  onSelectQuote,
  onRetryImage,
  onRemoveImage,
  onReturnToImages,
  onReturnToWords,
  onCheckAgain,
  onUseCurrentPoster,
}: {
  choices: CotsFinalizationChoices;
  selectedImageKey: string | null;
  selectedQuoteId: string | null;
  busy: boolean;
  blockedImage?: CotsFinalizationImageChoice | null;
  onSelectImage: (choice: CotsFinalizationImageChoice) => void;
  onSelectQuote: (quoteId: string) => void;
  onRetryImage: (selectionId: string) => void;
  onRemoveImage: (selectionId: string) => void;
  onReturnToImages: () => void;
  onReturnToWords: () => void;
  onCheckAgain: () => void;
  onUseCurrentPoster: () => void;
}) {
  const usableImages = choices.images.filter(
    ({ status }) => status !== "FAILED",
  );
  const quoteIds = choices.quotes.map(({ quoteId }) => quoteId).join(",");
  const selectedQuoteIndex = Math.max(
    0,
    choices.quotes.findIndex(({ quoteId }) => quoteId === selectedQuoteId),
  );
  const quotePositionKey = `${quoteIds}:${selectedQuoteId ?? "none"}`;
  const [quotePosition, setQuotePosition] = useState({
    key: quotePositionKey,
    index: selectedQuoteIndex,
  });
  const quoteIndex =
    quotePosition.key === quotePositionKey
      ? Math.min(quotePosition.index, Math.max(0, choices.quotes.length - 1))
      : selectedQuoteIndex;
  const activeQuote = choices.quotes[quoteIndex];
  const selectedImage = choices.images.find(
    ({ key }) => key === selectedImageKey,
  );
  const selectedQuote = choices.quotes.find(
    ({ quoteId }) => quoteId === selectedQuoteId,
  );
  const imageChosen = usableImages.length === 0 || Boolean(selectedImageKey);
  const quoteChosen = choices.quotes.length === 0 || Boolean(selectedQuoteId);
  const pendingOtherImages = choices.images.filter(
    ({ key, status }) =>
      key !== selectedImageKey &&
      (status === "PENDING" || status === "IMPORTING" || status === "SELECTED"),
  ).length;
  const failedImages = choices.images.filter(
    ({ status }) => status === "FAILED",
  ).length;
  const moveQuote = (index: number) =>
    setQuotePosition({
      key: quotePositionKey,
      index: Math.max(0, Math.min(index, choices.quotes.length - 1)),
    });

  return (
    <section className="cots-finalization" aria-labelledby="cots-final-title">
      <div className="season-opening-question">
        <p className="eyebrow">Finalization</p>
        <h2 id="cots-final-title" tabIndex={-1}>
          Choose what leads the season.
        </h2>
        <p>
          You’ve chosen what belongs. Now choose the image and words that should
          represent this season at a glance.
        </p>
      </div>

      <aside className="cots-finalization-note">
        <Layers3 aria-hidden="true" />
        <div>
          <strong>Featured is the lead, not the whole collection.</strong>
          <p>
            Your featured image and quote shape the season poster. Every other
            image and quote you kept stays with the season and can still appear
            across Become as supporting artwork, loading art, cadence moments,
            and rotating words.
          </p>
        </div>
      </aside>

      <section
        className="cots-finalization-section"
        aria-labelledby="cots-final-image-title"
      >
        <header>
          <div>
            <p className="eyebrow">Featured image</p>
            <h3 id="cots-final-image-title" tabIndex={-1}>
              Which image should lead?
            </h3>
            <p>
              This becomes the main visual on your season poster. Your other
              saved images remain part of the season and can appear elsewhere
              across the website.
            </p>
          </div>
          {usableImages.length > 0 && (
            <span>{selectedImageKey ? "1 chosen" : "Choose one"}</span>
          )}
        </header>

        {choices.images.length > 0 ? (
          <fieldset className="cots-final-image-group" disabled={busy}>
            <legend className="sr-only">Choose the featured image</legend>
            {choices.images.map((choice, index) => {
              const featured = choice.key === selectedImageKey;
              const failed = choice.status === "FAILED";
              if (failed)
                return (
                  <article
                    key={choice.key}
                    className="cots-final-image-card has-failed"
                  >
                    <FinalImageArtwork
                      choice={choice}
                      featured={false}
                      eager={index < 3}
                    />
                    {choice.selectionId && (
                      <span className="cots-final-image-recovery">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => onRetryImage(choice.selectionId!)}
                        >
                          <RotateCcw aria-hidden="true" /> Try again
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => onRemoveImage(choice.selectionId!)}
                        >
                          Remove
                        </Button>
                      </span>
                    )}
                  </article>
                );
              return (
                <label
                  key={choice.key}
                  className={cn(
                    "cots-final-image-card",
                    featured && "is-featured",
                  )}
                >
                  <input
                    className="cots-final-image-input"
                    type="radio"
                    name="cots-featured-image"
                    checked={featured}
                    disabled={busy}
                    onChange={() => onSelectImage(choice)}
                  />
                  <FinalImageArtwork
                    choice={choice}
                    featured={featured}
                    eager={index < 3}
                  />
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div className="cots-final-empty">
            <ImageOff aria-hidden="true" />
            <div>
              <strong>No images to feature</strong>
              <p>
                Your season poster will use Become’s graphic character
                treatment. Return to Images if you want a visual anchor.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onReturnToImages}
            >
              Return to Images
            </Button>
          </div>
        )}

        {blockedImage && (
          <aside className="cots-finalization-blocked" role="status">
            <div>
              <strong>{blockedImage.title} is still arriving.</strong>
              <p>
                Wait for it, choose another ready image, or continue with the
                current poster. It will still join your season when it
                finishes—it just won’t lead yet.
              </p>
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={onCheckAgain}
              >
                Check again
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  document
                    .getElementById("cots-final-image-title")
                    ?.focus({ preventScroll: false })
                }
              >
                Choose another image
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={onUseCurrentPoster}
              >
                Use current poster
              </Button>
            </div>
          </aside>
        )}

        {(pendingOtherImages > 0 || failedImages > 0) && (
          <p className="cots-finalization-secondary-status" role="status">
            {pendingOtherImages > 0 &&
              `${pendingOtherImages} other image${pendingOtherImages === 1 ? " is" : "s are"} still arriving. `}
            {failedImages > 0 &&
              `${failedImages} image${failedImages === 1 ? "" : "s"} couldn’t be saved and won’t appear unless retried.`}
          </p>
        )}
      </section>

      <section
        className="cots-finalization-section"
        aria-labelledby="cots-final-quote-title"
      >
        <header>
          <div>
            <p className="eyebrow">Featured quote</p>
            <h3 id="cots-final-quote-title" tabIndex={-1}>
              Which words should meet you first?
            </h3>
            <p>
              These words appear on your season poster. Every other quote you
              kept remains in the season and can return elsewhere across the
              website.
            </p>
          </div>
          {choices.quotes.length > 0 && (
            <span>{selectedQuoteId ? "1 chosen" : "Choose one"}</span>
          )}
        </header>

        {activeQuote ? (
          <div className="cots-final-quote-picker">
            <div className="cots-final-quote-nav">
              <span aria-live="polite">
                {quoteIndex + 1} of {choices.quotes.length}
              </span>
              <div aria-label="Browse saved quotes">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Previous saved quote"
                  disabled={quoteIndex === 0}
                  onClick={() => moveQuote(quoteIndex - 1)}
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Next saved quote"
                  disabled={quoteIndex === choices.quotes.length - 1}
                  onClick={() => moveQuote(quoteIndex + 1)}
                >
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
            <article
              className={cn(
                "cots-word-frame cots-final-quote-frame",
                activeQuote.quoteId === selectedQuoteId && "is-selected",
              )}
              aria-label={`Saved quote ${quoteIndex + 1} of ${choices.quotes.length}`}
            >
              <div className="cots-word-frame-bezel">
                <span className="cots-word-frame-ornament" aria-hidden="true" />
                <span className="cots-word-frame-corners" aria-hidden="true" />
                <div className="cots-word-frame-liner">
                  <div className="cots-word-canvas">
                    <header>
                      <span>{activeQuote.formLabel}</span>
                      <span className="cots-word-frame-status">
                        <span>{activeQuote.evidenceLabel}</span>
                        {activeQuote.quoteId === selectedQuoteId && (
                          <span className="cots-word-selected-mark">
                            <Check aria-hidden="true" /> Featured quote
                          </span>
                        )}
                      </span>
                    </header>
                    <blockquote>
                      <Quote aria-hidden="true" />
                      <p>“{activeQuote.text}”</p>
                    </blockquote>
                  </div>
                </div>
              </div>
            </article>
            <div className="cots-final-quote-choice">
              <div>
                <cite>{activeQuote.attribution}</cite>
                <small>{activeQuote.detail}</small>
              </div>
              <Button
                type="button"
                variant={
                  activeQuote.quoteId === selectedQuoteId
                    ? "secondary"
                    : "primary"
                }
                disabled={busy || activeQuote.quoteId === selectedQuoteId}
                aria-pressed={activeQuote.quoteId === selectedQuoteId}
                onClick={() => onSelectQuote(activeQuote.quoteId)}
              >
                {activeQuote.quoteId === selectedQuoteId && (
                  <Check aria-hidden="true" />
                )}
                {activeQuote.quoteId === selectedQuoteId
                  ? "Featured quote"
                  : "Feature these words"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="cots-final-empty">
            <Quote aria-hidden="true" />
            <div>
              <strong>No quote to feature</strong>
              <p>
                Your poster can stand without one. Return to Words if there are
                words you want to carry forward.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onReturnToWords}>
              Return to Words
            </Button>
          </div>
        )}
      </section>

      <div className="cots-finalization-summary" aria-live="polite">
        {imageChosen && quoteChosen ? (
          <>
            {selectedImage?.href ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedImage.href} alt="" />
            ) : (
              <span className="cots-finalization-summary-mark">
                <Check aria-hidden="true" />
              </span>
            )}
            <span>
              <strong>
                {usableImages.length === 0 && choices.quotes.length === 0
                  ? "No featured choices needed"
                  : usableImages.length === 0
                    ? "Featured quote chosen"
                    : choices.quotes.length === 0
                      ? "Featured image chosen"
                      : "Featured image and quote chosen"}
              </strong>
              {(selectedImage || selectedQuote) && (
                <small>
                  {[selectedImage?.title, selectedQuote?.text]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              )}
            </span>
          </>
        ) : (
          <span>
            Choose {imageChosen ? "a featured quote" : "a featured image"}
            {!imageChosen && !quoteChosen ? " and quote" : ""} to continue.
          </span>
        )}
      </div>
    </section>
  );
}
