"use client";

import { useEffect, useRef, useState } from "react";
import { onboardingProgress } from "@/features/seasons/living/onboarding/onboarding-progress.util";
import { Button } from "@/components/ui/buttons/button.component";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import {
  SeasonOnboardingView,
  type GuidedActions,
  type GuidedModel,
  type GuidedStage,
} from "@/features/seasons/living/onboarding/components/season-onboarding-view.component";

const art = {
  desktop: "/design-review/character-workspace-v3/levi-desktop-v2.webp",
  phone: "/design-review/character-workspace-v3/levi-phone-v2.webp",
  avatar: "/design-review/character-workspace-v3/levi-avatar.webp",
};
const sampleProfile: LivingCharacterProfile = {
  characterName: "Levi Ackerman",
  sourceWork: "Attack on Titan",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    {
      id: "catalogue",
      title: "AniList character catalogue · preview reference",
      url: "https://anilist.co/character/45627/Levi/",
      notes:
        "Illustrative preview notes. In a connected Season, AI gathers adaptation-specific evidence and saves its actual sources.",
    },
  ],
  personality: {
    description:
      "Reserved, observant and exacting; care appears through practical action.",
    sourceIds: ["catalogue"],
  },
  speechPatterns: [
    {
      description:
        "Short, direct sentences. Concrete observations before advice. Restrained praise and dry humor.",
      sourceIds: ["catalogue"],
    },
  ],
  signaturePhrases: [],
  canonReferences: [
    {
      description:
        "Responsibility, uncertain decisions and loyalty to comrades; use sparingly, when relevant.",
      sourceIds: ["catalogue"],
    },
  ],
  responseToSuccess:
    "Notice the specific effort and encourage its continuation.",
  responseToSetback:
    "Name the gap plainly, without humiliation or invented disappointment.",
  responseToRecovery:
    "Acknowledge the return and focus on the next useful action.",
  visualDirection:
    "Dark hair, sharp eyes, a restrained expression and recognizable clothing.",
  visualBoundaries:
    "Avoid generic aggression, exaggerated anatomy and invented insignia.",
};
const sampleSummary = `Levi brings a quiet, exacting presence to this Season. His reserved manner suggests someone who notices the details and takes responsibility seriously. Care should come through practical action rather than long speeches or constant reassurance. These are illustrative character notes for this preview; connected onboarding will research and cite the chosen adaptation. [catalogue]

His voice will use short, direct sentences and concrete observations. Praise stays specific: what you did, what improved, and what deserves to continue. Dry humor can appear occasionally, without turning every response into a performance. Signature phrases will only be included when their wording can be verified. This example deliberately includes no attributed quotation.

Canon references should appear naturally and sparingly. Responsibility, loyalty and choices made under uncertainty are useful themes; a response should connect those themes to the situation you actually recorded. It should never invent achievements or treat missing evidence as success.

When things go well, he will acknowledge the effort. During a setback, he will name the difficulty plainly and suggest one useful next action. Recovery receives recognition for returning to the work. These are proposed character-inspired reactions for your approval, rather than claims that a particular line appeared in the story.

Visually, the Season places him in a quiet mountain city with early morning light. The recognizable hair, eyes, clothing and restrained expression remain consistent. Progress can develop the environment without forcing combat, darkness or exaggerated anger. Desktop and phone artwork will be composed separately, with room for Become’s interface. You will approve the banners, then your profile picture, then each chapter’s six scenes. Nothing becomes active until you choose Activate Season.`;

export function createOnboardingPreviewModel(
  stage: GuidedStage,
  chapter = 1,
): GuidedModel {
  if (stage === "READY" || stage === "ACTIVE") chapter = 7;
  return {
    stage,
    status: "WAITING",
    chapter,
    progress: onboardingProgress(stage, chapter),
    name: "Levi Ackerman",
    work: "Attack on Titan",
    setting: "A quiet mountain city",
    visualDirection: "Calm, cinematic, early morning light",
    match: {
      name: "Levi Ackerman",
      sourceWork: "Attack on Titan",
      adaptation: "TV anime",
      images: [
        {
          href: art.avatar,
          alt: "Levi · sample artwork, not an authentic original",
          sourceUrl: sampleProfile.sources[0].url!,
          sourceLabel:
            "Preview sample · connected lookup retrieves authentic images",
        },
      ],
    },
    originals: [
      {
        id: "sample",
        href: art.avatar,
        label: "Preview sample · live Seasons require authentic originals",
        sourceUrl: sampleProfile.sources[0].url,
      },
    ],
    summary: sampleSummary,
    profile: sampleProfile,
    banner: {
      name: "Levi Ackerman",
      sourceWork: "Attack on Titan",
      adaptation: "TV anime",
      desktopSrc: art.desktop,
      phoneSrc: art.phone,
      avatarSrc: art.avatar,
      rightLine: "A deliberate next attempt",
      crop: { x: 0.5, y: 0.5, zoom: 1.24 },
    },
    scenes: ["ON_TRACK", "NEUTRAL", "FAR_BEHIND"].flatMap((state) =>
      ["DESKTOP", "MOBILE"].map((format) => ({
        id: `${chapter}:${state}:${format}`,
        state,
        format,
        href: format === "MOBILE" ? art.phone : art.desktop,
        // The wide sample banner places the character at the right edge.
        focalX: format === "DESKTOP" ? 1 : 0.5,
        focalY: 0.5,
      })),
    ),
    pendingImageCount:
      stage === "GENERATING_BANNER"
        ? 2
        : stage === "GENERATING_PORTRAIT"
          ? 1
          : 6,
    budgetReserved: [
      "ENTRY",
      "WORLD",
      "SUMMARY",
      "ASSEMBLING",
      "NEEDS_INPUT",
    ].includes(stage)
      ? 0
      : stage === "BANNER"
        ? 34
        : (3 +
            (["SCENES", "READY", "ACTIVE"].includes(stage)
              ? chapter
              : chapter - 1) *
              6) *
          17,
  };
}

export function SeasonOnboardingDemo() {
  const [model, setModel] = useState(() =>
    createOnboardingPreviewModel("ENTRY"),
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNext = useRef<GuidedStage>("SUMMARY");
  useEffect(() => {
    const restore = setTimeout(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("become-season-onboarding-candidate-v1") ??
            "null",
        ) as { stage?: GuidedStage; chapter?: number; status?: string } | null;
        if (saved && String(saved.stage) === "CONFIRM") saved.stage = "WORLD";
        if (
          saved?.stage &&
          [
            "ENTRY",
            "WORLD",
            "SUMMARY",
            "BANNER",
            "PORTRAIT",
            "SCENES",
            "READY",
            "ACTIVE",
          ].includes(saved.stage)
        )
          setModel({
            ...createOnboardingPreviewModel(
              saved.stage,
              Math.min(7, Math.max(1, saved.chapter ?? 1)),
            ),
            status: saved.status === "PAUSED" ? "PAUSED" : "WAITING",
          });
      } catch {
        /* A corrupt preview preference has no effect on real Seasons. */
      }
    }, 0);
    return () => {
      clearTimeout(restore);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const go = (
    stage: GuidedStage,
    chapter = model.chapter,
    status = "WAITING",
  ) => {
    if (timer.current) clearTimeout(timer.current);
    setModel((previous) => ({
      ...createOnboardingPreviewModel(stage, chapter),
      setting: previous.setting,
      visualDirection: previous.visualDirection,
      status,
    }));
    localStorage.setItem(
      "become-season-onboarding-candidate-v1",
      JSON.stringify({ stage, chapter, status }),
    );
  };
  const assemble = (
    stage: GuidedStage,
    next: GuidedStage,
    chapter = model.chapter,
  ) => {
    pendingNext.current = next;
    go(stage, chapter, "RUNNING");
    timer.current = setTimeout(() => go(next, chapter), 1200);
  };
  const actions: GuidedActions = {
    lookup: async () => go("WORLD"),
    different: () => go("ENTRY"),
    start: async (setting, visualDirection) => {
      setModel((previous) => ({ ...previous, setting, visualDirection }));
      assemble("ASSEMBLING", "SUMMARY");
    },
    approve: async () => {
      if (model.stage === "SUMMARY") assemble("GENERATING_BANNER", "BANNER");
      else if (model.stage === "BANNER")
        assemble("GENERATING_PORTRAIT", "PORTRAIT");
      else if (model.stage === "PORTRAIT")
        assemble("GENERATING_SCENES", "SCENES", 1);
      else if (model.stage === "SCENES") {
        if (model.chapter === 7) go("READY");
        else assemble("GENERATING_SCENES", "SCENES", model.chapter + 1);
      } else if (model.stage === "READY") go("ACTIVE");
    },
    correct: async () => assemble("ASSEMBLING", "SUMMARY"),
    regenerate: async () =>
      assemble(
        model.stage === "BANNER" || model.stage === "GENERATING_BANNER"
          ? "GENERATING_BANNER"
          : model.stage.includes("PORTRAIT")
            ? "GENERATING_PORTRAIT"
            : "GENERATING_SCENES",
        model.stage === "BANNER" || model.stage === "GENERATING_BANNER"
          ? "BANNER"
          : model.stage.includes("PORTRAIT")
            ? "PORTRAIT"
            : "SCENES",
      ),
    pause: async () => go(model.stage, model.chapter, "PAUSED"),
    resume: async () =>
      model.stage.startsWith("GENERATING_") || model.stage === "ASSEMBLING"
        ? assemble(model.stage, pendingNext.current)
        : go(model.stage),
    back: () =>
      go(
        model.stage === "WORLD"
          ? "ENTRY"
          : model.stage === "SUMMARY"
            ? "WORLD"
            : model.stage === "SCENES"
              ? "PORTRAIT"
              : model.stage === "PORTRAIT"
                ? "BANNER"
                : "SUMMARY",
      ),
    leave: async () => go(model.stage, model.chapter, "PAUSED"),
    crop: async (placement) => {
      setModel((previous) => ({
        ...previous,
        banner: previous.banner && { ...previous.banner, crop: placement },
      }));
      return true;
    },
  };
  return (
    <>
      <SeasonOnboardingView
        key={model.stage}
        model={model}
        actions={actions}
        demo
      />
      <details className="guided-candidate-controls">
        <summary className="type-caption">Preview states · sample only</summary>
        <div>
          {(
            [
              "ENTRY",
              "WORLD",
              "ASSEMBLING",
              "SUMMARY",
              "BANNER",
              "PORTRAIT",
              "SCENES",
              "NEEDS_INPUT",
              "READY",
            ] as GuidedStage[]
          ).map((stage) => (
            <Button
              key={stage}
              variant="ghost"
              onClick={() => {
                go(stage);
                if (stage === "NEEDS_INPUT")
                  setModel((previous) => ({
                    ...previous,
                    question:
                      "Which adaptation should guide the character’s voice?",
                  }));
              }}
            >
              {stage.toLowerCase().replaceAll("_", " ")}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              go("GENERATING_BANNER", 1, "FAILED");
              setModel((previous) => ({
                ...previous,
                error:
                  "The image provider did not finish. Your saved summary and budget reservation are preserved.",
              }));
            }}
          >
            Provider failure
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              go("GENERATING_SCENES", 7, "FAILED");
              setModel((previous) => ({
                ...previous,
                budgetReserved: 1496,
                error:
                  "The €15 artwork cap has been reached. Use Back to choose manual uploads.",
              }));
            }}
          >
            Budget limit
          </Button>
          <a
            href="/season-onboarding-candidate?connect=1"
            className="type-caption"
          >
            Connect a saved Season
          </a>
        </div>
      </details>
    </>
  );
}
