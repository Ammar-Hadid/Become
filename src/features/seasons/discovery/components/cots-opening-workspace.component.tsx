"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  Search,
  Trash2,
  X,
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
import { CotsFinalization } from "@/features/seasons/discovery/components/cots-finalization.component";
import { CotsManualEntry } from "@/features/seasons/discovery/components/cots-manual-entry.component";
import { CotsPendingArtwork } from "@/features/seasons/discovery/components/cots-pending-artwork.component";
import { CotsWordDeck } from "@/features/seasons/discovery/components/cots-word-deck.component";
import { useCotsCollection } from "@/features/seasons/discovery/hooks/use-cots-collection.hook";
import { cotsImagePreviewHref } from "@/features/seasons/discovery/utils/cots-image-preview.util";
import { cotsIdentitySuggestionStatusMessage } from "@/features/seasons/discovery/utils/cots-source-status.util";
import type {
  CotsCategory,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import type { CotsFinalizationImageChoice } from "@/features/seasons/discovery/types/cots-finalization.types";
import { cotsFinalizationChoices } from "@/features/seasons/discovery/utils/cots-finalization.util";
import type {
  SeasonCharacter,
  SeasonQuoteView,
  SeasonStandard,
  SeasonView,
} from "@/features/seasons/types/season.types";
import "@/features/seasons/discovery/styles/cots-discovery.css";

const COTS_SUBVIEWS = [
  "identity",
  "standards",
  "images",
  "words",
  "finalize",
] as const;
type CotsSubview = (typeof COTS_SUBVIEWS)[number];
const COTS_SUBVIEW_LABELS: Record<CotsSubview, string> = {
  identity: "Identity",
  standards: "Standards",
  images: "Images",
  words: "Words",
  finalize: "Finalization",
};
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
  if (
    requested === "standards" ||
    requested === "images" ||
    requested === "words" ||
    requested === "finalize"
  )
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
    refreshCollection,
    updateMediaPreferences,
    updateQuotePreferences,
  } = useCotsCollection(season.year, season.quarter);
  const [subview, setSubviewState] = useState<CotsSubview>("identity");
  const [imageCandidateToReveal, setImageCandidateToReveal] = useState<
    string | null
  >(null);
  const [featuredImageOverride, setFeaturedImageOverride] = useState<
    string | null
  >(null);
  const [featuredQuoteOverride, setFeaturedQuoteOverride] = useState<
    string | null
  >(null);
  const [finalizationGate, setFinalizationGate] =
    useState<CotsSelectionView | null>(null);
  const [editingManualQuote, setEditingManualQuote] =
    useState<SeasonQuoteView | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [associationChoice, setAssociationChoice] = useState(false);
  const [externalId, setExternalId] = useState<string | undefined>();
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<IdentitySuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<IdentitySuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<string | null>(null);
  const [nameSuggestionsOpen, setNameSuggestionsOpen] = useState(false);
  const [expandedIdentityDetails, setExpandedIdentityDetails] = useState(
    () => ({
      sourceWork: Boolean(character.sourceWork.trim()),
      adaptation: Boolean(character.adaptation.trim()),
    }),
  );
  const [dismissedSavedIdentityId, setDismissedSavedIdentityId] = useState<
    string | null
  >(null);
  const [dismissedMismatchId, setDismissedMismatchId] = useState<string | null>(
    null,
  );
  const initialized = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const sourceWorkInputRef = useRef<HTMLInputElement>(null);
  const adaptationInputRef = useRef<HTMLInputElement>(null);
  const suggestionRequest = useRef(0);
  const preloadedImages = useRef(new Map<string, HTMLImageElement>());

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
    if (subview !== "identity" && !pages.IMAGE && !discovering.IMAGE)
      void discover("IMAGE");
    if (
      (subview === "images" || subview === "words" || subview === "finalize") &&
      !pages.TEXT &&
      !discovering.TEXT
    )
      void discover("TEXT");
  }, [
    collection?.identity,
    discover,
    discovering.IMAGE,
    discovering.TEXT,
    pages.IMAGE,
    pages.TEXT,
    subview,
  ]);

  useEffect(() => {
    if (subview !== "standards" || !pages.IMAGE) return;
    pages.IMAGE.items.forEach((candidate, index) => {
      const href = cotsImagePreviewHref(
        candidate,
        candidate.provider === "zerochan" && index < 4,
      );
      if (!href || preloadedImages.current.has(href)) return;
      const image = new window.Image();
      image.decoding = "async";
      image.src = href;
      preloadedImages.current.set(href, image);
    });
  }, [pages.IMAGE, subview]);

  const sourceCategory =
    character.sourceCategory ?? collection?.identity?.sourceCategory ?? null;
  const category = cotsCategory(sourceCategory);
  const rankedSuggestions = useMemo(() => {
    const sourceWork = character.sourceWork.trim().toLocaleLowerCase();
    if (!sourceWork || suggestions.length < 2) return suggestions;
    return [...suggestions].sort(
      (a, b) =>
        Number(b.description.toLocaleLowerCase().includes(sourceWork)) -
        Number(a.description.toLocaleLowerCase().includes(sourceWork)),
    );
  }, [character.sourceWork, suggestions]);
  const savedIdentity = collection?.identity;
  const savedSuggestion =
    !selectedSuggestion &&
    !externalId &&
    savedIdentity?.sourceEntityId &&
    dismissedSavedIdentityId !== savedIdentity.id &&
    savedIdentity.sourceCategory === sourceCategory &&
    normalizedName(savedIdentity.displayName) === normalizedName(character.name)
      ? {
          id: savedIdentity.sourceEntityId,
          label: savedIdentity.displayName,
          description:
            [savedIdentity.sourceWork, savedIdentity.adaptation]
              .map((value) => value.trim())
              .filter(Boolean)
              .join(" · ") || "Saved identity",
          subjectKind: savedIdentity.subjectKind,
        }
      : null;
  const chosenSuggestion =
    selectedSuggestion ??
    rankedSuggestions.find(({ id }) => id === externalId) ??
    savedSuggestion;
  const identityResolved = Boolean(chosenSuggestion);
  const suggestionsVisible =
    !chosenSuggestion &&
    nameSuggestionsOpen &&
    Boolean(suggestionStatus || suggestions.length > 0);
  const suggestionMismatch =
    chosenSuggestion?.subjectKind === "PERSON" &&
    category?.subjectKind === "FICTIONAL" &&
    dismissedMismatchId !== chosenSuggestion.id;

  useEffect(() => {
    const name = character.name.trim();
    const requestId = ++suggestionRequest.current;
    if (identityResolved || !sourceCategory || name.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestions([]);
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
        if (requestId !== suggestionRequest.current) return;
        setSuggestions(body?.items ?? []);
        setSuggestionStatus(
          body?.items?.length
            ? "Choose a match, or keep the name exactly as you wrote it."
            : cotsIdentitySuggestionStatusMessage(body?.status),
        );
      } catch (cause) {
        if (
          requestId === suggestionRequest.current &&
          (cause as { name?: string }).name !== "AbortError"
        ) {
          setSuggestions([]);
          setSuggestionStatus(
            "Suggestions are unavailable. Your name still works.",
          );
        }
      }
    }, 650);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    character.name,
    identityResolved,
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
  const failedImageCandidateRef = imageSelections.find(
    ({ status }) => status === "FAILED",
  )?.candidate.candidateRef;
  const hasImportedImages = importCounts.ready > 0 || manualMedia.length > 0;
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

  const finalizationChoices = useMemo(
    () => cotsFinalizationChoices(season, collection?.selections ?? []),
    [collection?.selections, season],
  );
  const preferredFeaturedImageKey =
    featuredImageOverride ?? finalizationChoices.currentImageKey;
  const selectedFeaturedImageKey = finalizationChoices.images.some(
    ({ key }) => key === preferredFeaturedImageKey,
  )
    ? preferredFeaturedImageKey
    : null;
  const preferredFeaturedQuoteId =
    featuredQuoteOverride ?? finalizationChoices.currentQuoteId;
  const selectedFeaturedQuoteId = finalizationChoices.quotes.some(
    ({ quoteId }) => quoteId === preferredFeaturedQuoteId,
  )
    ? preferredFeaturedQuoteId
    : null;
  const finalizationReady =
    (finalizationChoices.images.every(({ status }) => status === "FAILED") ||
      Boolean(selectedFeaturedImageKey)) &&
    (!finalizationChoices.quotes.length || Boolean(selectedFeaturedQuoteId));
  const blockedFeaturedImage = finalizationGate
    ? (finalizationChoices.images.find(
        ({ selectionId }) => selectionId === finalizationGate.id,
      ) ?? null)
    : null;

  async function removeManualQuote(quote: SeasonQuoteView) {
    const saved = await updateQuotePreferences(quote.id, { retire: true });
    if (!saved) return;
    setEditingManualQuote((current) =>
      current?.id === quote.id ? null : current,
    );
    router.refresh();
  }

  async function enterFinalization() {
    const confirmed = await confirmSelections();
    if (!confirmed) return;
    setFinalizationGate(null);
    router.refresh();
    setSubview("finalize");
  }

  async function chooseFeaturedImage(choice: CotsFinalizationImageChoice) {
    const previousChoice = selectedFeaturedImageKey;
    setFeaturedImageOverride(choice.key);
    setFinalizationGate(null);
    const saved = choice.selectionId
      ? await confirmSelections(choice.selectionId)
      : choice.mediaId
        ? await updateMediaPreferences(choice.mediaId, { poster: true })
        : null;
    if (!saved) {
      setFeaturedImageOverride(previousChoice);
      return;
    }
    router.refresh();
  }

  async function chooseFeaturedQuote(quoteId: string) {
    const previousQuote = selectedFeaturedQuoteId;
    setFeaturedQuoteOverride(quoteId);
    const saved = await updateQuotePreferences(quoteId, { featured: true });
    if (!saved) {
      setFeaturedQuoteOverride(previousQuote);
      return;
    }
    router.refresh();
  }

  async function removeFinalizationImage(selectionId: string) {
    const selection = imageSelections.find(({ id }) => id === selectionId);
    if (!selection) return;
    const saved = await selectCandidate(selection.candidate, false);
    if (!saved) return;
    if (featuredImageOverride === `selection:${selectionId}`)
      setFeaturedImageOverride(null);
    setFinalizationGate((current) =>
      current?.id === selectionId ? null : current,
    );
  }

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
    if (saved) {
      setDismissedSavedIdentityId(null);
      setSubview("standards");
    }
  }

  function revealIdentityDetail(field: "sourceWork" | "adaptation") {
    setExpandedIdentityDetails((current) => ({ ...current, [field]: true }));
    window.requestAnimationFrame(() => {
      if (field === "sourceWork") sourceWorkInputRef.current?.focus();
      else adaptationInputRef.current?.focus();
    });
  }

  async function continueFromImages() {
    const confirmed = await confirmSelections();
    if (confirmed) setSubview("words");
  }

  async function continueToPreview(beginWithCurrentPoster = false) {
    const result = await preflight(beginWithCurrentPoster);
    if (!result) return;
    const desired = result.collection.selections.find(
      ({ desiredPoster }) => desiredPoster,
    );
    if (!beginWithCurrentPoster && desired && desired.status !== "READY") {
      setFinalizationGate(desired);
      return;
    }
    setFinalizationGate(null);
    router.refresh();
    onContinuePreview();
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
        {COTS_SUBVIEWS.map((step, index) => (
          <button
            key={step}
            type="button"
            aria-current={subview === step ? "step" : undefined}
            disabled={!collection?.identity && step !== "identity"}
            onClick={() =>
              step === "finalize" ? void enterFinalization() : setSubview(step)
            }
          >
            <span>{index + 1}</span>
            {COTS_SUBVIEW_LABELS[step]}
          </button>
        ))}
      </nav>
      <p className="cots-mobile-step" aria-live="polite">
        Inspiration · {COTS_SUBVIEWS.indexOf(subview) + 1} of{" "}
        {COTS_SUBVIEWS.length} · {COTS_SUBVIEW_LABELS[subview]}
      </p>

      {subview === "identity" && (
        <section className="cots-panel" aria-labelledby="cots-identity-title">
          <div className="season-opening-question">
            <p className="eyebrow">Inspiration for this season</p>
            <h2 id="cots-identity-title" tabIndex={-1}>
              Who belongs in this season?
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
                    suggestionRequest.current += 1;
                    setExternalId(undefined);
                    setSelectedSuggestion(null);
                    setDismissedMismatchId(null);
                    setSuggestions([]);
                    setSuggestionStatus(null);
                    setNameSuggestionsOpen(false);
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

            <div
              className="cots-identity-name-field"
              data-popover-open={suggestionsVisible || undefined}
              onFocus={() => setNameSuggestionsOpen(true)}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget instanceof Node
                      ? event.relatedTarget
                      : null,
                  )
                )
                  setNameSuggestionsOpen(false);
              }}
            >
              <span className="field-label" id="cots-identity-name-label">
                {category?.subjectKind === "PERSON"
                  ? "Person’s name"
                  : "Character name"}
              </span>
              {chosenSuggestion ? (
                <div
                  className="cots-identity-selected"
                  role="group"
                  aria-labelledby="cots-identity-name-label"
                >
                  <Check aria-hidden="true" />
                  <span>
                    <strong>{chosenSuggestion.label}</strong>
                    <small>{chosenSuggestion.description}</small>
                  </span>
                  <button
                    className="cots-identity-selected-remove"
                    type="button"
                    aria-label={`Remove ${chosenSuggestion.label}`}
                    disabled={controlsDisabled}
                    onClick={() => {
                      suggestionRequest.current += 1;
                      if (savedIdentity)
                        setDismissedSavedIdentityId(savedIdentity.id);
                      setExternalId(undefined);
                      setSelectedSuggestion(null);
                      setDismissedMismatchId(null);
                      setSuggestions([]);
                      setSuggestionStatus(null);
                      setNameSuggestionsOpen(false);
                      onPatchCharacter({ name: "" });
                      window.requestAnimationFrame(() =>
                        nameInputRef.current?.focus(),
                      );
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={nameInputRef}
                    id="cots-identity-name"
                    className="text-input"
                    aria-labelledby="cots-identity-name-label"
                    value={character.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      suggestionRequest.current += 1;
                      setExternalId(undefined);
                      setSelectedSuggestion(null);
                      setDismissedMismatchId(null);
                      setSuggestions([]);
                      setSuggestionStatus(null);
                      onPatchCharacter({ name });
                    }}
                    placeholder={
                      category?.subjectKind === "PERSON"
                        ? "Cristiano Ronaldo"
                        : "Levi Ackerman"
                    }
                    autoComplete="off"
                  />

                  {suggestionsVisible && (
                    <div
                      className="cots-identity-suggestions"
                      id="cots-identity-suggestions"
                      aria-live="polite"
                    >
                      <p>{suggestionStatus}</p>
                      {suggestions.length > 0 && (
                        <ul>
                          {rankedSuggestions.map((suggestion) => (
                            <li key={suggestion.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setExternalId(suggestion.id);
                                  setSelectedSuggestion(suggestion);
                                  setDismissedMismatchId(null);
                                  setNameSuggestionsOpen(false);
                                  onPatchCharacter({
                                    name: suggestion.label,
                                  });
                                }}
                              >
                                <Search aria-hidden="true" />
                                <span>
                                  <strong>{suggestion.label}</strong>
                                  <small>{suggestion.description}</small>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {category && (
              <div
                className="cots-identity-optional"
                aria-labelledby="cots-identity-optional-title"
              >
                <div className="cots-identity-optional-intro">
                  <span
                    className="field-label"
                    id="cots-identity-optional-title"
                  >
                    Optional context
                  </span>
                  <small>
                    Add only what helps Become find the right match.
                  </small>
                </div>
                <div className="cots-identity-optional-fields">
                  {expandedIdentityDetails.sourceWork ? (
                    <label className="cots-identity-optional-field">
                      <span className="field-label">{category.workLabel}</span>
                      <input
                        ref={sourceWorkInputRef}
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
                  ) : (
                    <button
                      className="cots-identity-optional-trigger"
                      type="button"
                      aria-label={`Add ${category.workLabel}`}
                      onClick={() => revealIdentityDetail("sourceWork")}
                    >
                      <Plus aria-hidden="true" />
                      <span>
                        <strong>{category.workLabel}</strong>
                        <small>Add a work, field, or discipline</small>
                      </span>
                    </button>
                  )}

                  {expandedIdentityDetails.adaptation ? (
                    <label className="cots-identity-optional-field">
                      <span className="field-label">
                        {category.adaptationLabel}
                      </span>
                      <input
                        ref={adaptationInputRef}
                        className="text-input"
                        value={character.adaptation}
                        onChange={(event) =>
                          onPatchCharacter({ adaptation: event.target.value })
                        }
                      />
                    </label>
                  ) : (
                    <button
                      className="cots-identity-optional-trigger"
                      type="button"
                      aria-label={`Add ${category.adaptationLabel}`}
                      onClick={() => revealIdentityDetail("adaptation")}
                    >
                      <Plus aria-hidden="true" />
                      <span>
                        <strong>{category.adaptationLabel}</strong>
                        <small>Add a version, era, team, or role</small>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

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

      {subview === "standards" && collection?.identity && (
        <section className="cots-panel" aria-labelledby="cots-standards-title">
          <div className="season-opening-question">
            <p className="eyebrow">Make it yours</p>
            <h2 id="cots-standards-title" tabIndex={-1}>
              Borrow the quality. Leave the costume.
            </h2>
            <p>
              Name what you admire, set the tone, and turn their example into
              standards you can actually practice.
            </p>
          </div>

          <div className="cots-personal-details">
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
              <p>Wording may change later. Evidence and thresholds never do.</p>
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
                                  criterionId: event.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Goal only</option>
                              {season.goals
                                .find(({ goal }) => goal.id === standard.goalId)
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
            discovering={discovering.IMAGE}
            revealCandidateRef={imageCandidateToReveal}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(selectionId) => void retrySelection(selectionId)}
            onRetryDiscovery={() => void discover("IMAGE")}
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
            <small>Choose the featured image in Finalization.</small>
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
          {(importCounts.active > 0 || importCounts.failed > 0) && (
            <CotsPendingArtwork
              media={readyLoadingMedia}
              active={importCounts.active > 0}
              label={
                importCounts.active > 0
                  ? `Importing ${importCounts.active} image${importCounts.active === 1 ? "" : "s"}`
                  : `${importCounts.failed} image${importCounts.failed === 1 ? "" : "s"} couldn’t be saved`
              }
              detail={
                importCounts.failed
                  ? `${importCounts.ready} ready · Review failed images to retry or replace them.`
                  : `${importCounts.ready} ready`
              }
              actionLabel={
                importCounts.failed ? "Review failed images" : undefined
              }
              onAction={
                importCounts.failed
                  ? () => {
                      setImageCandidateToReveal(
                        failedImageCandidateRef ?? null,
                      );
                      setSubview("images");
                    }
                  : undefined
              }
            />
          )}
          <CotsWordDeck
            page={pages.TEXT}
            selections={textSelections}
            savedQuotes={manualQuotes}
            pendingCandidateRefs={pendingCandidateRefs}
            discovering={discovering.TEXT}
            onToggle={(candidate, selected) =>
              void selectCandidate(candidate, selected)
            }
            onRetry={(selectionId) => void retrySelection(selectionId)}
            onRetryDiscovery={() => void discover("TEXT")}
            onLoadMore={() => void discover("TEXT", true)}
            savedQuotePending={Boolean(pendingAction)}
            onEditSavedQuote={setEditingManualQuote}
            onRemoveSavedQuote={(quote) => void removeManualQuote(quote)}
          />
          <CotsManualEntry
            key={editingManualQuote?.id ?? "manual-text-entry"}
            kind="text"
            disabled={Boolean(pendingAction)}
            editingText={editingManualQuote}
            onCancelTextEdit={() => setEditingManualQuote(null)}
            onAddImage={async (file, draft, operationKey) =>
              addManualImage(file, draft, operationKey).then((saved) => {
                if (saved) router.refresh();
                return Boolean(saved);
              })
            }
            onAddText={async (draft, operationKey, quoteId) =>
              addManualText(draft, operationKey, quoteId).then((saved) => {
                if (saved) {
                  setEditingManualQuote(null);
                  router.refresh();
                }
                return Boolean(saved);
              })
            }
          />
        </section>
      )}

      {subview === "finalize" && collection?.identity && (
        <CotsFinalization
          choices={finalizationChoices}
          selectedImageKey={selectedFeaturedImageKey}
          selectedQuoteId={selectedFeaturedQuoteId}
          busy={controlsDisabled || Boolean(pendingAction)}
          blockedImage={blockedFeaturedImage}
          onSelectImage={(choice) => void chooseFeaturedImage(choice)}
          onSelectQuote={(quoteId) => void chooseFeaturedQuote(quoteId)}
          onRetryImage={(selectionId) => {
            setFinalizationGate(null);
            void retrySelection(selectionId);
          }}
          onRemoveImage={(selectionId) =>
            void removeFinalizationImage(selectionId)
          }
          onReturnToImages={() => setSubview("images")}
          onReturnToWords={() => setSubview("words")}
          onCheckAgain={() => {
            void refreshCollection().then(() => continueToPreview());
          }}
          onUseCurrentPoster={() => void continueToPreview(true)}
        />
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
              else if (subview === "standards") setSubview("identity");
              else if (subview === "images") setSubview("standards");
              else if (subview === "words") setSubview("images");
              else setSubview("words");
            }}
          >
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
          <Button
            type="button"
            disabled={
              controlsDisabled ||
              Boolean(pendingAction) ||
              (subview === "finalize" && !finalizationReady)
            }
            onClick={() => {
              if (subview === "identity") void confirmIdentity();
              else if (subview === "standards") setSubview("images");
              else if (subview === "images") void continueFromImages();
              else if (subview === "words") void enterFinalization();
              else void continueToPreview();
            }}
          >
            {subview === "identity"
              ? collection?.identity
                ? "Save identity"
                : "Use this identity"
              : subview === "standards"
                ? "Continue to images"
                : subview === "images"
                  ? selectedImages.length
                    ? `Continue · save ${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"}`
                    : hasImportedImages
                      ? "Continue to words"
                      : "Continue without images"
                  : subview === "words"
                    ? selectedWords.length
                      ? `Save ${selectedWords.length} item${selectedWords.length === 1 ? "" : "s"} & continue`
                      : "Continue to finalization"
                    : pendingAction
                      ? "Saving choices…"
                      : "See the season"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
