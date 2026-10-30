"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Save, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import { Select } from "@/components/ui/forms/select.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { CharacterConfirmation } from "@/components/ui/character-confirmation/character-confirmation.component";
import { LivingSeasonEditor } from "@/features/seasons/living/components/living-season-editor.component";
import type { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import { COTS_CATEGORIES } from "../constants/cots-category.constants";
import { useCotsCollection } from "../hooks/use-cots-collection.hook";
import type {
  CharacterCandidate,
  CharacterLookupResult,
} from "../schemas/character-lookup.schema";
import type { CotsCategory } from "../types/cots-discovery.types";
import type {
  SeasonCharacter,
  SeasonView,
} from "@/features/seasons/types/season.types";

type Draft = SeasonCharacter & { sourceCategory?: CotsCategory | null };
type Pack = NonNullable<Awaited<ReturnType<typeof getLivingSeasonPack>>>;
type Suggestion = { id: string; label: string; description: string };

export function CotsOpeningWorkspace({
  season,
  character,
  controlsDisabled,
  onSaveDraft,
  onPatchCharacter,
  onFinish,
  onSaveAndLeave,
}: {
  season: SeasonView;
  character: Draft;
  controlsDisabled: boolean;
  onSaveDraft: () => Promise<boolean>;
  onPatchCharacter: (patch: Partial<Draft>) => void;
  onFinish: () => void;
  onSaveAndLeave: () => void;
  showBannerExample?: boolean;
}) {
  const {
    collection,
    loadingCollection,
    pendingAction,
    error: collectionError,
    saveIdentity,
    confirmCharacter,
  } = useCotsCollection(season.year, season.quarter);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [lookup, setLookup] = useState<CharacterLookupResult | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [workId, setWorkId] = useState(0);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [externalId, setExternalId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestSequence = useRef(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const identity = collection?.identity;
  const identityId = identity?.id;
  const identityRevision = identity?.identityRevision;
  const disabled = controlsDisabled || busy || Boolean(pendingAction);
  const category = character.sourceCategory ?? "anime";
  const candidate = lookup?.candidates.find((item) => item.id === candidateId);
  const work = candidate?.works.find((item) => item.id === workId);

  useEffect(() => {
    if (!identityId || editingIdentity) return;
    const controller = new AbortController();
    void fetch(
      `/api/direction/seasons/living?year=${season.year}&quarter=${season.quarter}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.pack)
          throw new Error(body.error ?? "Could not load this Season.");
        if (!controller.signal.aborted) setPack(body.pack);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load this Season.",
          );
      });
    return () => controller.abort();
  }, [
    identityId,
    identityRevision,
    editingIdentity,
    attempt,
    season.year,
    season.quarter,
  ]);

  function invalidateLookup() {
    requestSequence.current++;
    setLookup(null);
    setSuggestions([]);
    setExternalId(undefined);
    setNotice("");
  }
  async function lookupName() {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError("");
    setNotice("");
    setLookup(null);
    try {
      const anime = !manual || category === "anime" || category === "comic";
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          anime
            ? {
                action: "LOOKUP_CHARACTER",
                name: character.name,
                sourceWork: character.sourceWork,
              }
            : {
                action: "SUGGEST_IDENTITY",
                displayName: character.name,
                sourceCategory: category,
                sourceWork: character.sourceWork,
              },
        ),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Character lookup is unavailable.");
      if (sequence !== requestSequence.current) return;
      if (anime) {
        const result = body as CharacterLookupResult;
        const chosen =
          result.candidates.find((item) => item.id === result.suggestedId) ??
          result.candidates[0];
        setLookup(result);
        setCandidateId(chosen?.id ?? "");
        const version =
          chosen?.works.find((item) => item.id === result.suggestedWorkId) ??
          chosen?.works.find((item) => item.adaptation === "TV anime") ??
          chosen?.works[0];
        setWorkId(version?.id ?? 0);
        setVersionsOpen(false);
      } else {
        setSuggestions(body.items ?? []);
        setNotice(
          body.items?.length
            ? "Choose a retrieved record, or enter the identity yourself."
            : "No catalogue match. You can provide the identity and authentic references yourself.",
        );
      }
    } catch (cause) {
      if (sequence === requestSequence.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not look up this character.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function chooseCandidate(next: CharacterCandidate) {
    const sequence = ++requestSequence.current;
    setCandidateId(next.id);
    setWorkId(next.works[0]?.id ?? 0);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHARACTER_IMAGES",
          candidateId: next.id,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error ?? "Could not retrieve this character's images.",
        );
      if (sequence === requestSequence.current)
        setLookup((current) =>
          current
            ? {
                ...current,
                candidates: current.candidates.map((item) =>
                  item.id === next.id ? body : item,
                ),
              }
            : current,
        );
    } catch (cause) {
      if (sequence === requestSequence.current)
        setError(
          cause instanceof Error ? cause.message : "Images unavailable.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!candidate || !work) {
      setVersionsOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!(await onSaveDraft())) return;
      const result = await confirmCharacter({
        candidateId: candidate.id,
        workId: work.id,
        association: identity ? "NEW" : undefined,
      });
      if (!result) return;
      const saved = result.collection.identity!;
      onPatchCharacter({
        name: saved.displayName,
        sourceCategory: saved.sourceCategory,
        sourceWork: saved.sourceWork,
        adaptation: saved.adaptation,
      });
      setNotice(
        result.referenceNotice ??
          "Character confirmed. Review the imported images in References before generation.",
      );
      setEditingIdentity(false);
      setPack(null);
      setAttempt((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }
  async function confirmManual() {
    setBusy(true);
    setError("");
    try {
      if (!(await onSaveDraft())) return;
      const saved = await saveIdentity({
        displayName: character.name,
        sourceCategory: category,
        sourceWork: character.sourceWork,
        adaptation: character.adaptation,
        externalId,
        association: identity ? "NEW" : undefined,
      });
      if (saved) {
        setEditingIdentity(false);
        setPack(null);
        setAttempt((value) => value + 1);
      }
    } finally {
      setBusy(false);
    }
  }
  const identityControls = (
    <Card spacing="dense">
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-md)",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="type-overline">Confirmed identity</p>
          <p className="type-widget-title">{identity?.displayName}</p>
          <p className="type-body-sm">
            {identity?.sourceWork} · {identity?.adaptation}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            setEditingIdentity(true);
            invalidateLookup();
          }}
        >
          Change character
        </Button>
      </div>
    </Card>
  );
  return (
    <div style={{ display: "grid", gap: "var(--spacing-xl)", width: "100%" }}>
      {(error || collectionError) && (
        <p className="type-body" role="alert">
          {error || collectionError}
        </p>
      )}
      {notice && (
        <p className="type-body-sm" role="status">
          {notice}
        </p>
      )}
      {loadingCollection ? (
        <LoadingIndicator label="Loading this Season" area="direction" />
      ) : identity && !editingIdentity ? (
        pack ? (
          <LivingSeasonEditor
            key={identity.id + identity.identityRevision}
            year={season.year}
            quarter={season.quarter}
            initialPack={pack}
            embeddedInOpening
            identityControls={identityControls}
            onActivated={onFinish}
          />
        ) : (
          <div>
            <LoadingIndicator
              label="Loading character workspace"
              area="direction"
            />
            <Button
              variant="ghost"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        )
      ) : (
        <>
          <section
            className="cots-character-entry"
            aria-labelledby="cots-character-entry-title"
          >
            <header className="cots-character-entry-heading">
              <h1
                className="type-season-entry-title"
                id="cots-character-entry-title"
              >
                <span>Who will inspire</span> <span>this Season?</span>
              </h1>
              <p className="type-season-entry-description">
                Name a character. AI will find the real one.
                <br />
                You choose the character and version.
              </p>
            </header>
            <form
              className="cots-character-entry-form"
              onSubmit={(event) => {
                event.preventDefault();
                void lookupName();
              }}
            >
              <Input
                label="Character name"
                variant="featured"
                ref={nameRef}
                value={character.name}
                placeholder="Kaoruko Waguri"
                disabled={disabled}
                onChange={(event) => {
                  invalidateLookup();
                  onPatchCharacter({ name: event.target.value });
                }}
              />
              <Input
                label="Source work · optional"
                variant="featured"
                value={character.sourceWork}
                placeholder="Anime, manga, series, or work"
                disabled={disabled}
                onChange={(event) => {
                  invalidateLookup();
                  onPatchCharacter({ sourceWork: event.target.value });
                }}
              />
              <div className="cots-character-entry-actions">
                <Button
                  type="submit"
                  disabled={disabled || character.name.trim().length < 2}
                >
                  <WandSparkles aria-hidden="true" /> Find my character
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => setManual((value) => !value)}
                >
                  {manual
                    ? "Use assisted lookup"
                    : "Enter another character or person"}
                </Button>
                {editingIdentity && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => setEditingIdentity(false)}
                  >
                    Keep current character
                  </Button>
                )}
              </div>
            </form>
          </section>
          {(lookup || busy) && !manual && (
            <CharacterConfirmation
              key={candidateId}
              loading={busy && !candidate}
              busy={disabled}
              aiUsed={lookup?.aiUsed}
              notice={lookup?.notice}
              match={
                candidate
                  ? {
                      name: candidate.name,
                      sourceWork: work?.title ?? "Choose a source work",
                      adaptation: work?.adaptation ?? "Version needed",
                      images: candidate.images,
                    }
                  : null
              }
              onConfirm={() => void confirm()}
              onDifferentVersion={() => setVersionsOpen(true)}
              onWrongCharacter={() => {
                invalidateLookup();
                nameRef.current?.focus();
              }}
            />
          )}
          {lookup && lookup.candidates.length > 1 && (
            <Card spacing="dense">
              <p className="type-label">Other retrieved matches</p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--spacing-sm)",
                }}
              >
                {lookup.candidates
                  .filter((item) => item.id !== candidateId)
                  .map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => void chooseCandidate(item)}
                    >
                      {item.name}
                    </Button>
                  ))}
              </div>
            </Card>
          )}
          {(versionsOpen || (candidate && !work)) && candidate && (
            <Card spacing="dense">
              <FieldLabel>
                Choose the source and adaptation
                <Select
                  label="Character adaptation"
                  value={String(workId)}
                  options={candidate.works.map((item) => ({
                    value: String(item.id),
                    label: `${item.title} · ${item.adaptation}`,
                  }))}
                  onValueChange={(value) => setWorkId(Number(value))}
                  disabled={disabled}
                />
              </FieldLabel>
            </Card>
          )}
          {manual && (
            <Card spacing="action">
              <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
                <FieldLabel>
                  Where do you know them from?
                  <Select
                    label="Character source category"
                    value={category}
                    options={COTS_CATEGORIES.map((item) => ({
                      value: item.value,
                      label: item.label,
                    }))}
                    disabled={disabled}
                    onValueChange={(value) => {
                      invalidateLookup();
                      onPatchCharacter({ sourceCategory: value });
                    }}
                  />
                </FieldLabel>
                <FieldLabel>
                  Version or adaptation
                  <Input
                    value={character.adaptation}
                    disabled={disabled}
                    onChange={(event) =>
                      onPatchCharacter({ adaptation: event.target.value })
                    }
                    placeholder="TV anime, manga, historical person…"
                  />
                </FieldLabel>
                {suggestions.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => {
                      setExternalId(item.id);
                      onPatchCharacter({ name: item.label });
                      setNotice(`Selected ${item.label}. ${item.description}`);
                    }}
                  >
                    {item.label} · {item.description}
                  </Button>
                ))}
                <Button
                  disabled={
                    disabled ||
                    !character.name.trim() ||
                    !character.sourceWork.trim()
                  }
                  onClick={() => void confirmManual()}
                >
                  Confirm identity <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
      <footer>
        <Button variant="ghost" disabled={disabled} onClick={onSaveAndLeave}>
          <Save aria-hidden="true" /> Save and leave
        </Button>
      </footer>
    </div>
  );
}
