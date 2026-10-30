"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import { characterBannerPrompt } from "@/features/seasons/living/utils/living-character-banner-prompt.util";
import { characterPortraitPrompt } from "@/features/seasons/living/utils/living-character-portrait-prompt.util";
import {
  CharacterWorkspacePreview,
  type CandidateBannerArt,
} from "@/features/seasons/living/character-workspace/components/character-workspace.component";
import type { AvatarPlacement } from "@/components/ui/character-avatar/character-avatar-editor.component";
import {
  loadPreviewPortrait,
  savePreviewPortrait,
} from "../services/character-avatar-preview-storage.service";
import "@/features/seasons/living/styles/living-character-workspace.css";

type Variant = "levi" | "gentle" | "long";

const gentleProfile: LivingCharacterProfile = {
  characterName: "Mina Hoshino",
  sourceWork: "The Last Letter Café",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    {
      id: "gentle-1",
      title: "Character premise · illustrative record",
      notes: "Mina is a fictional test character used to review this layout.",
    },
    {
      id: "gentle-2",
      title: "Bakery setting · illustrative record",
      notes: "A neighborhood patisserie forms the setting of this visual test.",
    },
    {
      id: "gentle-3",
      title: "Voice direction · illustrative record",
      notes: "Her replies are patient, observant and gently direct.",
    },
  ],
  speechPatterns: [
    {
      description:
        "She notices a person's hesitation before offering a small, concrete next step.",
      sourceIds: ["gentle-3"],
    },
    {
      description:
        "She uses warm, clear sentences and leaves room for the other person to answer.",
      sourceIds: ["gentle-3"],
    },
    {
      description:
        "When uncertain, she names what she does know instead of making a promise.",
      sourceIds: ["gentle-3"],
    },
  ],
  signaturePhrases: [],
  canonReferences: [
    {
      description:
        "The patisserie is the visual setting for this fictional design example.",
      sourceIds: ["gentle-2"],
    },
  ],
  responseToSuccess:
    "Offer warm, specific recognition without exaggerating the achievement.",
  responseToSetback:
    "Acknowledge the feeling, then help identify the next manageable step.",
  responseToRecovery: "Notice the effort it took to begin again.",
  visualDirection:
    "Young adult romance-anime woman with chestnut hair, a ribbon, expressive gentle eyes and a light blue cardigan; quietly hopeful expression.",
  visualBoundaries:
    "Keep the recognizable face, outfit and calm warmth; no weapons, combat, rage, superhero pose or invented lettering.",
};

const presets: Record<
  Variant,
  Pick<CandidateBannerArt, "quote" | "attribution" | "rightLine"> & {
    source: string;
  }
> = {
  levi: {
    quote: "Give up on your dreams and die.",
    attribution: "Levi Ackerman",
    rightLine: "FEW WORDS.\nNO WASTED MOVES.",
    source:
      "Attack on Titan, Season 3 episode 53 · exact subtitle wording awaits owner review",
  },
  gentle: {
    quote: "Sometimes courage is just opening the door again.",
    attribution: "Mina Hoshino",
    rightLine: "A SOFTER KIND\nOF COURAGE.",
    source:
      "Fictional layout example · replace with verified source before approval",
  },
  long: {
    quote:
      "The smallest decision can change the shape of a whole season when someone finally chooses to begin again.",
    attribution: "Mina Hoshino",
    rightLine: "AN EXTRAORDINARY\nORDINARY DAY.",
    source: "Fictional long-copy stress test",
  },
};

export function CharacterWorkspaceCandidate({
  initialProfile,
}: {
  initialProfile: LivingCharacterProfile;
}) {
  const [variant, setVariant] = useState<Variant>("levi");
  const [quote, setQuote] = useState(presets.levi.quote);
  const [attribution, setAttribution] = useState(presets.levi.attribution);
  const [rightLine, setRightLine] = useState(presets.levi.rightLine);
  const [source, setSource] = useState(presets.levi.source);
  const [imageFailure, setImageFailure] = useState(false);
  const [savedPortrait, setSavedPortrait] = useState<{
    variant: Variant;
    source: string;
    image: Blob | null;
    placement: AvatarPlacement;
  } | null>(null);
  const [portraitStorageError, setPortraitStorageError] = useState("");
  const portraitRevisionRef = useRef(0);
  const isLevi = variant === "levi";
  const generatedAvatarSrc = `/design-review/character-workspace-v3/${isLevi ? "levi" : "gentle"}-avatar.webp`;
  const currentPortrait =
    savedPortrait?.variant === variant ? savedPortrait : null;

  useEffect(() => {
    let active = true;
    const revision = ++portraitRevisionRef.current;
    void loadPreviewPortrait(variant)
      .then((portrait) => {
        if (!active || revision !== portraitRevisionRef.current) return;
        setSavedPortrait(
          portrait
            ? {
                variant,
                source: portrait.image
                  ? URL.createObjectURL(portrait.image)
                  : variant === "levi"
                    ? "/design-review/character-workspace-v3/levi-avatar.webp"
                    : "/design-review/character-workspace-v3/gentle-avatar.webp",
                image: portrait.image,
                placement: portrait.placement,
              }
            : null,
        );
        setPortraitStorageError("");
      })
      .catch(() => {
        if (active && revision === portraitRevisionRef.current)
          setPortraitStorageError("Saved preview picture could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [variant]);

  useEffect(() => {
    return () => {
      if (savedPortrait?.source.startsWith("blob:"))
        URL.revokeObjectURL(savedPortrait.source);
    };
  }, [savedPortrait]);
  const profile = isLevi
    ? initialProfile
    : {
        ...gentleProfile,
        characterName:
          variant === "long"
            ? "Mina Hoshino of the Sunlit Terrace"
            : gentleProfile.characterName,
        sources:
          variant === "long"
            ? [
                ...gentleProfile.sources,
                ...Array.from({ length: 9 }, (_, index) => ({
                  id: `sample-${index + 1}`,
                  title: `Illustrative saved record ${index + 4}: the patisserie and its neighbors`,
                  notes:
                    "Extra candidate-only record for testing independent list overflow.",
                })),
              ]
            : gentleProfile.sources,
      };
  const art: CandidateBannerArt = {
    desktopSrc: imageFailure
      ? "/design-review/character-workspace-v3/missing-desktop.webp"
      : `/design-review/character-workspace-v3/${isLevi ? "levi-desktop-v2" : "gentle-desktop"}.webp`,
    phoneSrc: imageFailure
      ? "/design-review/character-workspace-v3/missing-phone.webp"
      : `/design-review/character-workspace-v3/${isLevi ? "levi-phone-v2" : "gentle-phone"}.webp`,
    avatarSrc: currentPortrait?.source ?? generatedAvatarSrc,
    generatedAvatarSrc,
    crop: currentPortrait?.placement,
    alt: isLevi
      ? "Levi on a Survey Corps rooftop at golden dusk, the city extending across the entire banner"
      : "A gentle romance character in a sunlit neighborhood patisserie",
    quote,
    attribution,
    rightLine,
    exampleResponse: isLevi
      ? "You gather the facts, weigh the consequences, and choose what keeps people alive. Indecision gets people killed."
      : "Start with what you know. Then choose one small step you can take today. You don't have to solve everything at once.",
  };
  const prompt = characterBannerPrompt(
    profile,
    isLevi
      ? "Survey Corps rooftop above a richly detailed city at sunset"
      : "Sunlit neighborhood patisserie with flowers and warm interior detail",
    isLevi
      ? "Moody, warm Attack on Titan anime with depth and golden rim light"
      : "Luminous romance anime with gentle warmth and saturated natural color",
    "desktop",
  );

  function select(next: Variant) {
    setVariant(next);
    setQuote(presets[next].quote);
    setAttribution(presets[next].attribution);
    setRightLine(presets[next].rightLine);
    setSource(presets[next].source);
  }

  return (
    <>
      <div
        className="character-candidate-controls"
        aria-label="Candidate preview controls"
      >
        <p className="type-body-sm">Character workspace · candidate preview</p>
        {(["levi", "gentle", "long"] as const).map((choice) => (
          <Button
            key={choice}
            size="sm"
            variant="secondary"
            aria-pressed={variant === choice}
            onClick={() => select(choice)}
          >
            {choice === "levi"
              ? "Levi"
              : choice === "gentle"
                ? "Gentle character"
                : "Long copy + records"}
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={imageFailure}
          onClick={() => setImageFailure((previous) => !previous)}
        >
          Image fallback
        </Button>
      </div>
      <CharacterWorkspacePreview
        key={`${variant}-${imageFailure}`}
        initialProfile={profile}
        year={2026}
        quarter={4}
        version={1}
        approved={false}
        active={false}
        responseAvailable={false}
        candidateArt={art}
        avatarPersistenceHint="Saved in this browser for this approval preview."
        onAvatarApply={async (nextSource, placement, file) => {
          const image =
            file ??
            (nextSource === generatedAvatarSrc
              ? null
              : (currentPortrait?.image ?? null));
          try {
            await savePreviewPortrait(variant, { image, placement });
            portraitRevisionRef.current += 1;
            setSavedPortrait({
              variant,
              source: image
                ? file
                  ? nextSource
                  : URL.createObjectURL(image)
                : generatedAvatarSrc,
              image,
              placement,
            });
            setPortraitStorageError("");
            return true;
          } catch {
            setPortraitStorageError(
              "Picture could not be saved in this browser.",
            );
            return false;
          }
        }}
      />
      {portraitStorageError && (
        <p className="character-candidate-note type-body-sm" role="alert">
          {portraitStorageError}
        </p>
      )}
      <details className="character-candidate-note type-body-sm">
        <summary>Review banner and portrait generation direction</summary>
        <p>
          The artwork and copy are local examples. Levi’s quoted subtitle
          wording and attribution still need your source review. The gentle
          character and her quote are fictional stress tests.
        </p>
        <div className="character-candidate-fields">
          <FieldLabel>
            Banner quote
            <Input
              value={quote}
              maxLength={240}
              onChange={(event) => setQuote(event.target.value)}
            />
          </FieldLabel>
          <FieldLabel>
            Attribution
            <Input
              value={attribution}
              maxLength={120}
              onChange={(event) => setAttribution(event.target.value)}
            />
          </FieldLabel>
          <FieldLabel>
            Right-side line
            <Input
              value={rightLine.replaceAll("\n", " ")}
              maxLength={100}
              onChange={(event) => setRightLine(event.target.value)}
            />
          </FieldLabel>
          <FieldLabel>
            Quote source / verification note
            <Input
              value={source}
              maxLength={300}
              onChange={(event) => setSource(event.target.value)}
            />
          </FieldLabel>
        </div>
        <p>
          Proposed typography token after approval: <code>banner-title</code> ·
          bold, responsive 2.5–4 rem. Current tokens remain untouched.
        </p>
        <details>
          <summary>Desktop generation prompt</summary>
          <pre>{prompt}</pre>
        </details>
        <details>
          <summary>Phone generation prompt</summary>
          <pre>
            {characterBannerPrompt(
              profile,
              isLevi
                ? "Survey Corps rooftop above a richly detailed city at sunset"
                : "Sunlit neighborhood patisserie with flowers and warm interior detail",
              isLevi
                ? "Moody, warm Attack on Titan anime with depth and golden rim light"
                : "Luminous romance anime with gentle warmth and saturated natural color",
              "phone",
            )}
          </pre>
        </details>
        <details>
          <summary>Profile-picture generation prompt</summary>
          <pre>
            {characterPortraitPrompt(
              profile,
              isLevi
                ? "Survey Corps rooftops, smoky golden sunset and restrained cinematic lighting"
                : "Sunlit patisserie, flowers and softly luminous romance-anime warmth",
            )}
          </pre>
        </details>
      </details>
    </>
  );
}
