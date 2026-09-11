"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { OwnedOption } from "@/features/direction/types/direction.types";
import {
  COTS_CATEGORIES,
  cotsCategory,
} from "@/features/seasons/discovery/constants/cots-category.constants";
import { CotsImageRail } from "@/features/seasons/discovery/components/cots-image-rail.component";
import { CotsManualEntry } from "@/features/seasons/discovery/components/cots-manual-entry.component";
import { CotsPendingArtwork } from "@/features/seasons/discovery/components/cots-pending-artwork.component";
import { CotsWordDeck } from "@/features/seasons/discovery/components/cots-word-deck.component";
import { useCotsCollection } from "@/features/seasons/discovery/hooks/use-cots-collection.hook";
import { COTS_TEXT_FORM_LABEL } from "@/features/seasons/discovery/utils/cots-text-label.util";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";
import type {
  CotsCategory,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import type {
  SeasonCharacter,
  SeasonStandard,
  SeasonView,
} from "@/features/seasons/types/season.types";
import "@/features/seasons/discovery/styles/cots-discovery.css";

type CotsSubview = "identity" | "images" | "words";
type CotsCharacterDraft = SeasonCharacter & {
  sourceCategory?: CotsCategory | null;
};
type IdentitySuggestion = {
  id: string;
  label: string;
  description: string;
  subjectKind: "FICTIONAL" | "PERSON" | "UNKNOWN";
};

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function initialSubview(hasIdentity: boolean): CotsSubview {
  if (typeof window === "undefined") return "identity";
  const requested = new URLSearchParams(window.location.search).get("cots");
  if (requested === "images" || requested === "words")
    return hasIdentity ? requested : "identity";
  return "identity";
}

function statusSummary(selections: CotsSelectionView[]) {
  const counts = { ready: 0, active: 0, failed: 0 };
  selections.forEach(({ status }) => {
    if (status === "READY") counts.ready += 1;
    if (status === "PENDING" || status === "IMPORTING") counts.active += 1;
    if (status === "FAILED") counts.failed += 1;
  });
  return counts;
}

export function CotsOpeningWorkspace({
  season,
  character,
  controlsDisabled,
  goalOptions,
  onPatchCharacter,
  onUpdateStandard,
  onBackStage,
  onContinuePreview,
  onSaveAndLeave,
}: {
  season: SeasonView;
  character: CotsCharacterDraft;
  controlsDisabled: boolean;
  goalOptions: OwnedOption[];
  onPatchCharacter: (patch: Partial<CotsCharacterDraft>) => void;
  onUpdateStandard: (key: string, patch: Partial<SeasonStandard>) => void;
  onBackStage: () => void;
  onContinuePreview: () => void;
  onSaveAndLeave: () => void;
}) {
  const router = useRouter();
  const {
    collection,
    pages,
    loadingCollection,
    discovering,
    pendingCandidateRefs,
    pendingAction,
    error,
    setError,
    saveIdentity,
    discover,
    selectCandidate,
    confirmSelections,
    retrySelection,
    preflight,
    addManualImage,
    addManualText,
  } = useCotsCollection(season.year, season.quarter);
  const [subview, setSubviewState] = useState<CotsSubview>("identity");
  const [posterOverride, setPosterOverride] = useState<string | null>(null);
  const [featuredTextOverride, setFeaturedTextOverride] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [associationChoice, setAssociationChoice] = useState(false);
  const [externalId, setExternalId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<IdentitySuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<string | null>(null);
  const [dismissedMismatchId, setDismissedMismatchId] = useState<string | null>(
    null,
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || loadingCollection) return;
    initialized.current = true;
    setSubviewState(initialSubview(Boolean(collection?.identity)));
  }, [collection?.identity, loadingCollection]);

  const setSubview = useCallback((next: CotsSubview, replace = false) => {
    setSubviewState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("cots", next);
    window.history[replace ? "replaceState" : "pushState"](
      { ...window.history.state, cots: next },
      "",
      url,
    );
  }, []);

  useEffect(() => {
    const onPopState = () =>
      setSubviewState(initialSubview(Boolean(collection?.identity)));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [collection?.identity]);

  useEffect(() => {
    if (!collection?.identity) return;
    if (subview === "images" && !pages.IMAGE) void discover("IMAGE");
    if (subview === "words" && !pages.TEXT) void discover("TEXT");
  }, [collection?.identity, discover, pages.IMAGE, pages.TEXT, subview]);

  const sourceCategory =
    character.sourceCategory ?? collection?.identity?.sourceCategory ?? null;
  const category = cotsCategory(sourceCategory);
  const chosenSuggestion = suggestions.find(({ id }) => id === externalId);
  const suggestionMismatch =
    chosenSuggestion?.subjectKind === "PERSON" &&
    category?.subjectKind === "FICTIONAL" &&
    dismissedMismatchId !== chosenSuggestion.id;

  useEffect(() => {
    const name = character.name.trim();
    if (!sourceCategory || name.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionStatus("Looking for a match…");
      try {
        const response = await fetch("/api/direction/cots", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "SUGGEST_IDENTITY",
            year: season.year,
            quarter: season.quarter,
            sourceCategory,
            displayName: name,
            sourceWork: character.sourceWork.trim(),
          }),
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as {
          items?: IdentitySuggestion[];
          status?: string;
          error?: string;
        } | null;
        if (!response.ok)
          throw new Error(body?.error || "Suggestions unavailable");
        setSuggestions(body?.items ?? []);
        setSuggestionStatus(
          body?.items?.length
            ? "Choose a match, or keep the name exactly as you wrote it."
            : body?.status || "No exact match found. Your name still works.",
        );
      } catch (cause) {
        if ((cause as { name?: string }).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionStatus(
            "Suggestions are unavailable. Your name still works.",
          );
        }
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    character.name,
    character.sourceWork,
    season.quarter,
    season.year,
    sourceCategory,
  ]);

  const imageSelections = useMemo(
    () =>
      collection?.selections.filter(
        ({ candidate }) => candidate.form === "IMAGE",
      ) ?? [],
    [collection?.selections],
  );
  const textSelections = useMemo(
    () =>
      collection?.selections.filter(
        ({ candidate }) => candidate.form !== "IMAGE",
      ) ?? [],
    [collection?.selections],
  );
  const featureableTextSelections = textSelections.filter(
    ({ status }) => status === "SELECTED" || status === "READY",
  );
  const selectedImages = imageSelections.filter(
    ({ status }) => status === "SELECTED",
  );
  const selectedWords = textSelections.filter(
    ({ status }) => status === "SELECTED",
  );
  const importCounts = statusSummary(imageSelections);
  const manualMedia = season.media.filter(
    ({ provenance }) => provenance.origin === "MANUAL",
  );
  const manualQuotes = season.quotes.filter(
    ({ provenance }) => provenance.origin === "MANUAL",
  );
  const readyLoadingMedia = useMemo(() => {
    const ready = imageSelections.find(
      ({ status, mediaId }) => status === "READY" && mediaId,
    );
    return ready?.mediaId
      ? season.media.find(({ id }) => id === ready.mediaId)
      : undefined;
  }, [imageSelections, season.media]);

  const desiredPosterId =
    posterOverride ??
    imageSelections.find(({ desiredPoster }) => desiredPoster)?.id ??
    "";

  async function confirmIdentity(association?: "SAME" | "NEW") {
    const name = character.name.trim();
    if (!sourceCategory) {
      setIdentityError("Choose where you know them from.");
      return;
    }
    if (!name) {
      setIdentityError("Add the name you want to carry into this season.");
      return;
    }
    const existing = collection?.identity;
    if (
      existing &&
      normalizedName(existing.displayName) !== normalizedName(name) &&
      !association
    ) {
      setAssociationChoice(true);
      return;
    }
    setIdentityError(null);
    setAssociationChoice(false);
    const saved = await saveIdentity({
      displayName: name,
      sourceCategory,
      sourceWork: character.sourceWork.trim(),
      adaptation: character.adaptation.trim(),
      ...(externalId ? { externalId } : {}),
      ...(association
        ? { association }
        : existing
          ? { association: "SAME" }
          : {}),
    });
    if (saved) setSubview("images");
  }

  async function continueFromImages() {
    const confirmed = await confirmSelections(desiredPosterId || undefined);
    if (confirmed) setSubview("words");
  }

  async function continueToPreview() {
    const confirmed = await confirmSelections(
      undefined,
      featuredTextOverride || undefined,
    );
    if (!confirmed) return;
    const result = await preflight(false);
    if (result) onContinuePreview();
  }

  if (loadingCollection) {
    return (
      <div className="cots-workspace-loading" role="status">
        <span aria-hidden="true" />
        <p>Preparing your inspiration space…</p>
      </div>
    );
  }

  return (
    <div className="cots-workspace">
      <nav className="cots-subnav" aria-label="Inspiration steps">
        {(["identity", "images", "words"] as const).map((step, index) => (
          <button
            key={step}
            type="button"
            aria-current={subview === step ? "step" : undefined}
            disabled={!collection?.identity && step !== "identity"}
            onClick={() => setSubview(step)}
          >
            <span>{index + 1}</span>
            {step[0].toUpperCase() + step.slice(1)}
          </button>
        ))}
      </nav>
      <p className="cots-mobile-step" aria-live="polite">
        Inspiration ·{" "}
        {subview === "identity" ? "1" : subview === "images" ? "2" : "3"} of 3 ·{" "}
        {subview[0].toUpperCase() + subview.slice(1)}
      </p>

      {subview === "identity" && (
        <section className="cots-panel" aria-labelledby="cots-identity-title">
          <div className="season-opening-question">
            <p className="eyebrow">Inspiration for this season</p>
            <h2 id="cots-identity-title" tabIndex={-1}>
              Who belongs in this chapter?
            </h2>
            <p>
              Choose who you keep returning to, and what their example means in
              your own life.
            </p>
          </div>

          <div className="cots-identity-fields">
            <label className="cots-source-field">
              <span className="field-label">Where do you know them from?</span>
              <span className="select-wrap">
                <select
                  value={sourceCategory ?? ""}
                  onChange={(event) => {
                    setExternalId(undefined);
                    setDismissedMismatchId(null);
                    setSuggestions([]);
                    onPatchCharacter({
                      sourceCategory: (event.target.value ||
                        null) as CotsCategory | null,
                    });
                  }}
                >
                  <option value="">Choose a source</option>
                  {COTS_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>
              <small>
                This guides what Become searches. You can change it later
                without losing their collection.
              </small>
            </label>

            <label>
              <span className="field-label">
                {category?.subjectKind === "PERSON"
                  ? "Person’s name"
                  : "Character name"}
              </span>
              <input
                className="text-input"
                value={character.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setExternalId(undefined);
                  setDismissedMismatchId(null);
                  if (name.trim().length < 3) {
                    setSuggestions([]);
                    setSuggestionStatus(null);
                  }
                  onPatchCharacter({ name });
                }}
                placeholder={
                  category?.subjectKind === "PERSON"
                    ? "Cristiano Ronaldo"
                    : "Levi Ackerman"
                }
                autoComplete="off"
              />
            </label>

            {category && (
              <>
                <label>
                  <span className="field-label">{category.workLabel}</span>
                  <input
                    className="text-input"
                    value={character.sourceWork}
                    onChange={(event) =>
                      onPatchCharacter({ sourceWork: event.target.value })
                    }
                    placeholder={
                      category.value === "person"
                        ? "Football, film, science…"
                        : "Add the work for better matches"
                    }
                  />
                </label>
                <label>
                  <span className="field-label">
                    {category.adaptationLabel}
                  </span>
                  <input
                    className="text-input"
                    value={character.adaptation}
                    onChange={(event) =>
                      onPatchCharacter({ adaptation: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>

          {(suggestionStatus || suggestions.length > 0) && (
            <div className="cots-identity-suggestions" aria-live="polite">
              <p>{suggestionStatus}</p>
              {suggestions.length > 0 && (
                <ul>
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        data-selected={
                          externalId === suggestion.id || undefined
                        }
                        onClick={() => {
                          setExternalId(suggestion.id);
                          setDismissedMismatchId(null);
                          onPatchCharacter({ name: suggestion.label });
                        }}
                      >
                        <Search aria-hidden="true" />
                        <span>
                          <strong>{suggestion.label}</strong>
                          <small>{suggestion.description}</small>
                        </span>
                        {externalId === suggestion.id && (
                          <Check aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {suggestionMismatch && chosenSuggestion && (
            <aside className="cots-source-mismatch" role="status">
              <div>
                <p className="eyebrow">Check the source</p>
                <p>
                  {chosenSuggestion.label} looks like a real person. If you mean
                  the person themselves, Public figure will give you a better
                  search context.
                </p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onPatchCharacter({ sourceCategory: "person" })}
                >
                  Use Public figure
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDismissedMismatchId(chosenSuggestion.id)}
                >
                  Keep {category.label}
                </Button>
              </div>
            </aside>
          )}

          {collection?.identity && (
            <div className="cots-personal-details">
              <div>
                <p className="eyebrow">Make it yours</p>
                <h3>Borrow the quality. Leave the costume.</h3>
              </div>
              <div className="season-opening-fields season-opening-fields--two">
                <label>
                  <span className="field-label">What you admire</span>
                  <textarea
                    className="text-input"
                    value={character.motivation}
                    onChange={(event) =>
                      onPatchCharacter({ motivation: event.target.value })
                    }
                    placeholder="Why does their example matter now?"
                  />
                </label>
                <label>
                  <span className="field-label">
                    What you do not want to emulate
                  </span>
                  <textarea
                    className="text-input"
                    value={character.avoid}
                    onChange={(event) =>
                      onPatchCharacter({ avoid: event.target.value })
                    }
                    placeholder="Keep the inspiration honest."
                  />
                </label>
              </div>
              <fieldset className="season-tone">
                <legend className="field-label">Accountability tone</legend>
                {(["DIRECT", "HARSH", "RUTHLESS"] as const).map((tone) => (
                  <label key={tone}>
                    <input
                      type="radio"
                      name="tone"
                      value={tone}
                      checked={character.tone === tone}
                      onChange={() => onPatchCharacter({ tone })}
                    />
                    <span>{tone[0] + tone.slice(1).toLowerCase()}</span>
                  </label>
                ))}
                <p>
                  Wording may change later. Evidence and thresholds never do.
                </p>
              </fieldset>

              <div className="season-standards-editor">
                <div>
                  <p className="eyebrow">Traits in practice</p>
                  <h3>Make admiration observable.</h3>
                </div>
                {character.standards.map((standard) => (
                  <div className="season-standard-editor" key={standard.key}>
                    <label>
                      <span className="field-label">Trait</span>
                      <input
                        className="text-input"
                        value={standard.trait}
                        onChange={(event) =>
                          onUpdateStandard(standard.key, {
                            trait: event.target.value,
                          })
                        }
                        placeholder="Consistency"
                      />
                    </label>
                    <label>
                      <span className="field-label">
                        What it means in your life
                      </span>
                      <input
                        className="text-input"
                        value={standard.behavior}
                        onChange={(event) =>
                          onUpdateStandard(standard.key, {
                            behavior: event.target.value,
                          })
                        }
                        placeholder="Keep the promises I make to myself."
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${standard.trait || "trait"}`}
                      onClick={() =>
                        onPatchCharacter({
                          standards: character.standards.filter(
                            ({ key }) => key !== standard.key,
                          ),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                    <details className="season-standard-link">
                      <summary>
                        Connect this standard to a real signal{" "}
                        <span>— optional</span>
                      </summary>
                      <div>
                        <label>
                          <span className="field-label">Goal</span>
                          <span className="select-wrap">
                            <select
                              value={standard.goalId ?? ""}
                              onChange={(event) =>
                                onUpdateStandard(standard.key, {
                                  goalId: event.target.value || undefined,
                                  criterionId: undefined,
                                })
                              }
                            >
                              <option value="">No linked goal</option>
                              {goalOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </span>
                        </label>
                        {standard.goalId &&
                        season.goals.find(
                          ({ goal }) => goal.id === standard.goalId,
                        )?.goal.criteria.length ? (
                          <label>
                            <span className="field-label">Criterion</span>
                            <span className="select-wrap">
                              <select
                                value={standard.criterionId ?? ""}
                                onChange={(event) =>
                                  onUpdateStandard(standard.key, {
                                    criterionId:
                                      event.target.value || undefined,
                                  })
                                }
                              >
                                <option value="">Goal only</option>
                                {season.goals
                                  .find(
                                    ({ goal }) => goal.id === standard.goalId,
                                  )
                                  ?.goal.criteria.map((criterion) => (
                                    <option
                                      key={criterion.id}
                                      value={criterion.id}
                                    >
                                      {criterion.label}
                                    </option>
                                  ))}
                              </select>
                            </span>
                          </label>
                        ) : null}
                      </div>
                    </details>
                  </div>
                ))}
                <button
                  type="button"
                  className="season-add-standard"
                  onClick={() =>
                    onPatchCharacter({
                      standards: [
                        ...character.standards,
                        { key: crypto.randomUUID(), trait: "", behavior: "" },
                      ],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Add a trait
                </button>
              </div>
            </div>
          )}

          {associationChoice && collection?.identity && (
            <aside className="cots-identity-change" role="alert">
              <p className="eyebrow">Keep the right history</p>
              <h3>Is {character.name.trim()} the same inspiration?</h3>
              <p>
                {collection.identity.displayName} keeps the collection already
                attached to this season.
              </p>
              <div>
                <Button
                  type="button"
                  onClick={() => void confirmIdentity("NEW")}
                >
                  Start a collection for {character.name.trim()}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void confirmIdentity("SAME")}
                >
                  This is still the same identity
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAssociationChoice(false)}
                >
                  Cancel
                </Button>
              </div>
            </aside>
          )}
          {identityError && (
            <p className="cots-error" role="alert">
              {identityError}
            </p>
          )}
        </section>
      )}

      {subview === "images" && collection?.identity && (
        <section className="cots-panel" aria-labelledby="cots-images-title">
          <div className="season-opening-question">
            <p className="eyebrow">A visual anchor</p>
            <h2 id="cots-images-title" tabIndex={-1}>
              What feels like {collection.identity.displayName} to you?
            </h2>
            <p>
              Choose a few images worth living with. Fan art, portraits, stills,
              and illustrations can all belong here when the source is clear.
            </p>
          </div>
          {manualMedia.length > 0 && (
            <section
              className="cots-saved-items"
              aria-label="Your added images"
            >
              <p className="eyebrow">Already in this season</p>
              <div>
                {manualMedia.map((item) => (
                  <article key={item.id}>
                    {/* Authenticated local media cannot use the default image optimizer. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.href}
                      alt={item.decorative ? "" : item.alt}
                      width={item.width}
                      height={item.height}
                    />
                    <span>
                      <strong>
                        {item.poster ? "Season poster" : "Your image"}
                      </strong>
                      <small>
                        {item.provenance.sourceTitle ||
                          item.provenance.credit ||
                          "Private upload"}
                      </small>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
          <CotsImageRail
            page={pages.IMAGE}
            selections={imageSelections}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering === "IMAGE"}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(selectionId) => void retrySelection(selectionId)}
            onLoadMore={() => void discover("IMAGE", true)}
          />
          <CotsManualEntry
            kind="image"
            disabled={Boolean(pendingAction)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey) =>
              addManualText(draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
          />
          <div className="cots-selected-tray" aria-live="polite">
            <span>
              <strong>{imageSelections.length} selected</strong>
              <small>
                {importCounts.ready} ready
                {importCounts.active
                  ? ` · ${importCounts.active} importing`
                  : ""}
                {importCounts.failed ? ` · ${importCounts.failed} failed` : ""}
              </small>
            </span>
            {imageSelections.length > 0 && (
              <label>
                <span>Poster</span>
                <select
                  value={desiredPosterId}
                  onChange={(event) => setPosterOverride(event.target.value)}
                >
                  <option value="">Choose after import</option>
                  {imageSelections.map((selection) => (
                    <option key={selection.id} value={selection.id}>
                      {selection.candidate.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>
      )}

      {subview === "words" && collection?.identity && (
        <section className="cots-panel" aria-labelledby="cots-words-title">
          <div className="season-opening-question">
            <p className="eyebrow">Words to return to</p>
            <h2 id="cots-words-title" tabIndex={-1}>
              Which words hold the standard?
            </h2>
            <p>
              Keep the wording and its evidence together. Uncertain lines stay
              welcome—and stay honestly labeled.
            </p>
          </div>
          {manualQuotes.length > 0 && (
            <section className="cots-saved-words" aria-label="Your added words">
              <p className="eyebrow">Already in this season</p>
              {manualQuotes.map((quote) => (
                <SeasonQuoteExcerpt key={quote.id} quote={quote} />
              ))}
            </section>
          )}
          {(importCounts.active > 0 || importCounts.failed > 0) && (
            <CotsPendingArtwork
              media={readyLoadingMedia}
              active={importCounts.active > 0}
              label={
                importCounts.active > 0
                  ? `Importing ${importCounts.active} image${importCounts.active === 1 ? "" : "s"}`
                  : `${importCounts.failed} image import${importCounts.failed === 1 ? "" : "s"} need attention`
              }
              detail={`${importCounts.ready} ready${importCounts.failed ? ` · ${importCounts.failed} failed` : ""}`}
            />
          )}
          <CotsWordDeck
            page={pages.TEXT}
            selections={textSelections}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering === "TEXT"}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(selectionId) => void retrySelection(selectionId)}
            onLoadMore={() => void discover("TEXT", true)}
          />
          {featureableTextSelections.length > 0 && (
            <label className="cots-featured-text-choice">
              <span>Featured words</span>
              <select
                value={featuredTextOverride}
                onChange={(event) =>
                  setFeaturedTextOverride(event.target.value)
                }
              >
                <option value="">Keep the current poster words</option>
                {featureableTextSelections.map((selection) => (
                  <option key={selection.id} value={selection.id}>
                    {COTS_TEXT_FORM_LABEL[selection.candidate.form]} ·{" "}
                    {selection.candidate.title}
                  </option>
                ))}
              </select>
              <small>
                Choose one for the season poster. The rest stay in your
                collection.
              </small>
            </label>
          )}
          <CotsManualEntry
            kind="text"
            disabled={Boolean(pendingAction)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey) =>
              addManualText(draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
          />
        </section>
      )}

      {error && (
        <p className="cots-error" role="alert">
          {error}
        </p>
      )}

      <footer className="cots-actions">
        <Button
          type="button"
          variant="ghost"
          disabled={controlsDisabled || Boolean(pendingAction)}
          onClick={onSaveAndLeave}
        >
          <Save aria-hidden="true" /> Save and leave
        </Button>
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={controlsDisabled || Boolean(pendingAction)}
            onClick={() => {
              setError(null);
              if (subview === "identity") onBackStage();
              else setSubview(subview === "words" ? "images" : "identity");
            }}
          >
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
          <Button
            type="button"
            disabled={controlsDisabled || Boolean(pendingAction)}
            onClick={() => {
              if (subview === "identity") void confirmIdentity();
              else if (subview === "images") void continueFromImages();
              else void continueToPreview();
            }}
          >
            {subview === "identity"
              ? collection?.identity
                ? "Save identity"
                : "Use this identity"
              : subview === "images"
                ? selectedImages.length
                  ? `Continue · save ${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"}`
                  : manualMedia.length
                    ? "Continue to words"
                    : "Continue without images"
                : selectedWords.length
                  ? `Continue · save ${selectedWords.length} item${selectedWords.length === 1 ? "" : "s"}`
                  : "Continue to preview"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
