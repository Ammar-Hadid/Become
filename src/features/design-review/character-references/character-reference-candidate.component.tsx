"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import type { OfficialTrialReport } from "@/features/seasons/discovery/trial/official-references/types";
import { VersionDrawer } from "./version-drawer.component";
import { RecognizedCharacter } from "./recognized-character.component";
import { SeasonRitualLayout } from "@/components/layout/season-ritual/season-ritual-layout.component";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { StepIndicator } from "@/components/ui/step-indicator/step-indicator.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import "./character-reference-candidate.css";

export function CharacterReferenceCandidate({
  report,
}: {
  report: OfficialTrialReport;
}) {
  const [characterId, setCharacterId] = useState(
    report.characters[0].characterId,
  );
  const [workIds, setWorkIds] = useState<Record<number, number>>({});
  const [versionOpen, setVersionOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [stage, setStage] = useState<"world" | "summary">("world");
  const [setting, setSetting] = useState("");
  const [mood, setMood] = useState("");
  const [paused, setPaused] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const priorStage = useRef(stage);
  const versionTrigger = useRef<HTMLButtonElement>(null);
  const characterTrigger = useRef<HTMLButtonElement>(null);
  const characterClose = useRef<HTMLButtonElement>(null);
  const characterPresence = usePresence(characterOpen, "surface");
  const character = report.characters.find(
    (row) => row.characterId === characterId,
  )!;
  const workId = workIds[characterId] ?? character.workId;
  const work = character.works.find((row) => row.id === workId)!;
  useEffect(() => {
    if (priorStage.current !== stage) title.current?.focus();
    priorStage.current = stage;
  }, [stage]);
  const reference =
    character.workId === workId
      ? character.references.find((image) => image.group === "From the show")
      : undefined;

  return (
    <div className="reference-inline-candidate">
      <SeasonRitualLayout
        split
        paused={paused}
        contentKey={stage}
        header={
          <>
            <div className="opening-layout-brand">
              <BrandMark />
              <span className="type-system">Season preview</span>
            </div>
            <div className="opening-layout-header-actions">
              <span className="type-caption reference-candidate-note">
                Preview only · not saved
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={paused}
                aria-controls="opening-layout-content"
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {paused ? "Resume motion" : "Pause motion"}
              </Button>
            </div>
          </>
        }
        introduction={
          <>
            <span className="opening-step-numeral" aria-hidden="true">
              {stage === "world" ? "02" : "03"}
            </span>
            <div className="opening-intro-copy">
              <p className="type-overline">YOUR NEXT SEASON</p>
              <h1
                ref={title}
                tabIndex={-1}
                id="opening-step-title"
                className="type-season-entry-title"
              >
                {stage === "world" ? (
                  <>
                    Shape the world of your <em>Season.</em>
                  </>
                ) : (
                  <>
                    Your direction, <em>together.</em>
                  </>
                )}
              </h1>
              <p className="type-body-lg">
                {stage === "world"
                  ? "Give it a place and a feeling. Your character comes with you."
                  : "Your character and the world you described, ready for the next part."}
              </p>
            </div>
          </>
        }
        footer={null}
      >
        <StepIndicator
          label="Season preparation"
          items={[
            { id: "character", label: "Character", state: "complete" },
            {
              id: "world",
              label: "World & mood",
              state: stage === "world" ? "current" : "complete",
            },
            {
              id: "summary",
              label: "Summary",
              state: stage === "summary" ? "current" : "upcoming",
            },
          ]}
        />
        <div className="reference-candidate-workspace">
          <RecognizedCharacter
            name={character.name}
            sourceWork={work.title}
            adaptation={`${work.medium} · ${work.year ?? "Year unavailable"}`}
            reference={reference}
            actions={
              <>
                <Button
                  ref={characterTrigger}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCharacterOpen(true)}
                >
                  Change character
                </Button>
                <Button
                  ref={versionTrigger}
                  variant="ghost"
                  size="sm"
                  onClick={() => setVersionOpen(true)}
                >
                  Change version
                </Button>
              </>
            }
          />
          {stage === "world" ? (
            <form
              className="reference-world-form"
              onSubmit={(event) => {
                event.preventDefault();
                setStage("summary");
              }}
            >
              <Input
                label="Setting"
                variant="featured"
                placeholder="A quiet mountain city at sunrise"
                value={setting}
                onChange={(event) => setSetting(event.target.value)}
              />
              <Textarea
                label="Mood & atmosphere"
                variant="featured"
                placeholder="Calm, spacious, quietly determined…"
                value={mood}
                onChange={(event) => setMood(event.target.value)}
              />
              <Button type="submit">
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          ) : (
            <section
              className="reference-direction-summary"
              aria-label="Your direction"
            >
              <p className="type-overline">YOUR ENTRIES · PREVIEW ONLY</p>
              <div>
                <h2 className="type-label">Setting</h2>
                <p className="type-body">{setting || "Not specified yet"}</p>
              </div>
              <div>
                <h2 className="type-label">Mood & atmosphere</h2>
                <p className="type-body">{mood || "Not specified yet"}</p>
              </div>
              <p className="type-body-sm reference-candidate-note">
                This preview ends here. Character research and artwork-reference
                review happen later in the connected flow.
              </p>
              <Button variant="secondary" onClick={() => setStage("world")}>
                <ArrowLeft aria-hidden="true" />
                Edit world & mood
              </Button>
            </section>
          )}
        </div>
      </SeasonRitualLayout>
      <VersionDrawer
        open={versionOpen}
        works={character.works}
        selected={workId}
        trigger={versionTrigger}
        onClose={() => setVersionOpen(false)}
        onSelect={(id) => {
          setWorkIds((current) => ({ ...current, [characterId]: id }));
          setVersionOpen(false);
        }}
      />
      {characterPresence.isPresent && (
        <Drawer
          open={characterOpen}
          presenceState={characterPresence.presenceState}
          exiting={characterPresence.isExiting}
          onPresenceAnimationEnd={characterPresence.onPresenceAnimationEnd}
          onClose={() => setCharacterOpen(false)}
          titleId="reference-character-title"
          descriptionId="reference-character-description"
          initialFocusRef={characterClose}
          returnFocusRef={characterTrigger}
          header={
            <>
              <div>
                <h2
                  id="reference-character-title"
                  className="type-widget-title"
                >
                  Change character
                </h2>
                <p
                  id="reference-character-description"
                  className="type-body-sm"
                >
                  This preview contains three examples. General character search
                  is not connected here.
                </p>
              </div>
              <Button
                ref={characterClose}
                variant="ghost"
                size="icon"
                aria-label="Close character selection"
                onClick={() => setCharacterOpen(false)}
              >
                <X />
              </Button>
            </>
          }
        >
          <div className="reference-character-options">
            {report.characters.map((row) => (
              <Button
                key={row.characterId}
                variant="secondary"
                aria-pressed={characterId === row.characterId}
                onClick={() => {
                  setCharacterId(row.characterId);
                  setCharacterOpen(false);
                }}
              >
                {row.name}
              </Button>
            ))}
          </div>
        </Drawer>
      )}
    </div>
  );
}
