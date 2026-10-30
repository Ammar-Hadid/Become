"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { Select } from "@/components/ui/forms/select.component";
import {
  Checkbox,
  SelectionCopy,
  SelectionLabel,
} from "@/components/ui/forms/selection.component";
import { CharacterConfirmation } from "@/components/ui/character-confirmation/character-confirmation.component";
import { AiTextFrame } from "@/components/ui/ai-text-frame/ai-text-frame.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { createOnboardingPreviewModel } from "../season-onboarding/season-onboarding-candidate.component";
import {
  SeasonOnboardingView,
  type GuidedActions,
  type GuidedStage as CurrentGuidedStage,
} from "@/features/seasons/living/onboarding/components/season-onboarding-view.component";
import { SeasonRitualLayout } from "@/components/layout/season-ritual/season-ritual-layout.component";
import { StepIndicator } from "@/components/ui/step-indicator/step-indicator.component";
import {
  preparationSteps,
  resolveOpeningProgress,
} from "@/features/seasons/living/onboarding/utils/season-opening-progress.util";
import "./season-opening-layout-preview.css";

// Historical layout comparison retains its original checkpoint.
type GuidedStage = CurrentGuidedStage | "CONFIRM";
const previewStages: GuidedStage[] = [
  "ENTRY",
  "CONFIRM",
  "WORLD",
  "ASSEMBLING",
  "NEEDS_INPUT",
  "SUMMARY",
  "GENERATING_BANNER",
  "BANNER",
  "GENERATING_PORTRAIT",
  "PORTRAIT",
  "GENERATING_SCENES",
  "SCENES",
  "READY",
  "ACTIVE",
];
type PreviewSnapshot = {
  stage: GuidedStage;
  name: string;
  work: string;
  adaptation: string;
  setting: string;
  visualDirection: string;
  originalsReviewed: boolean;
  correction: string;
  chapter: number;
  status: "WAITING" | "RUNNING" | "PAUSED" | "FAILED";
};
const initialSnapshot: PreviewSnapshot = {
  stage: "ENTRY",
  name: "Levi Ackerman",
  work: "Attack on Titan",
  adaptation: "TV anime",
  setting: "A quiet city at the edge of the mountains",
  visualDirection: "Calm, cinematic, early morning light",
  originalsReviewed: false,
  correction: "",
  chapter: 1,
  status: "WAITING",
};

/** Isolated, local-only review. Never calls a catalogue, model, worker or Season command. */
export function SeasonOpeningLayoutPreview({
  season,
}: {
  season: { year: number; quarter: number };
}) {
  const router = useRouter();
  const storageKey = `become-opening-layout-preview-v1:${season.year}:${season.quarter}`;
  const [draft, setDraft] = useState(initialSnapshot);
  const draftRef = useRef(initialSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<
    "loading" | "saving" | "saved" | "failed"
  >("loading");
  const saveFailed = saveState === "failed";
  const [paused, setPaused] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (value: PreviewSnapshot) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("failed");
        return false;
      }
    },
    [storageKey],
  );
  const patch = useCallback(
    (value: Partial<PreviewSnapshot>) => {
      const next = { ...draftRef.current, ...value };
      draftRef.current = next;
      setDraft(next);
      saveDraft(next);
    },
    [saveDraft],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const value: unknown = JSON.parse(
          localStorage.getItem(storageKey) ?? "null",
        );
        if (
          value &&
          typeof value === "object" &&
          "stage" in value &&
          previewStages.includes(value.stage as GuidedStage)
        ) {
          const saved = value as Partial<PreviewSnapshot>;
          const restored: PreviewSnapshot = {
            ...initialSnapshot,
            stage: saved.stage!,
            name:
              typeof saved.name === "string"
                ? saved.name
                : initialSnapshot.name,
            work:
              typeof saved.work === "string"
                ? saved.work
                : initialSnapshot.work,
            adaptation:
              typeof saved.adaptation === "string"
                ? saved.adaptation
                : initialSnapshot.adaptation,
            setting:
              typeof saved.setting === "string"
                ? saved.setting
                : initialSnapshot.setting,
            visualDirection:
              typeof saved.visualDirection === "string"
                ? saved.visualDirection
                : initialSnapshot.visualDirection,
            correction:
              typeof saved.correction === "string" ? saved.correction : "",
            originalsReviewed: saved.originalsReviewed === true,
            chapter: Math.min(7, Math.max(1, Number(saved.chapter) || 1)),
            status:
              saved.status === "PAUSED" || saved.status === "FAILED"
                ? saved.status
                : "WAITING",
          };
          draftRef.current = restored;
          setDraft(restored);
        }
      } catch {
        /* Corrupt local sample does not affect actual Seasons. */
      }
      saveDraft(draftRef.current);
      setHydrated(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [storageKey, saveDraft]);

  const pending =
    draft.stage === "ASSEMBLING" || draft.stage.startsWith("GENERATING_");
  useEffect(() => {
    if (
      !hydrated ||
      !pending ||
      draft.status === "PAUSED" ||
      draft.status === "FAILED"
    )
      return;
    const timer = setTimeout(() => {
      const current = draftRef.current;
      patch({
        status: "WAITING",
        stage:
          current.stage === "ASSEMBLING"
            ? "SUMMARY"
            : current.stage === "GENERATING_BANNER"
              ? "BANNER"
              : current.stage === "GENERATING_PORTRAIT"
                ? "PORTRAIT"
                : "SCENES",
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [draft.stage, draft.status, hydrated, pending, patch]);
  useEffect(() => {
    title.current?.focus();
  }, [draft.stage, correcting]);

  function go(stage: GuidedStage) {
    setCorrecting(false);
    setVersionsOpen(false);
    patch({ stage, status: "WAITING" });
  }
  function back() {
    go(
      draft.stage === "CONFIRM"
        ? "ENTRY"
        : draft.stage === "WORLD"
          ? "CONFIRM"
          : draft.stage === "SUMMARY"
            ? "WORLD"
            : draft.stage === "BANNER"
              ? "SUMMARY"
              : draft.stage === "PORTRAIT"
                ? "BANNER"
                : draft.stage === "SCENES"
                  ? "PORTRAIT"
                  : "SCENES",
    );
  }
  function leave() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      router.push("/season-onboarding-candidate");
    } catch {
      setSaveState("failed");
    }
  }
  function approve() {
    if (draft.stage === "SUMMARY") go("GENERATING_BANNER");
    else if (draft.stage === "BANNER") go("GENERATING_PORTRAIT");
    else if (draft.stage === "PORTRAIT") go("GENERATING_SCENES");
    else if (draft.stage === "SCENES") {
      if (draft.chapter === 7) go("READY");
      else {
        patch({ chapter: draft.chapter + 1 });
        go("GENERATING_SCENES");
      }
    } else if (draft.stage === "READY") go("ACTIVE");
  }
  const progress = resolveOpeningProgress(
    draft.stage === "CONFIRM" ? "WORLD" : draft.stage,
  );
  const step =
    progress.preparationIndex === null
      ? null
      : preparationSteps[progress.preparationIndex];
  const base = createOnboardingPreviewModel(
    draft.stage === "CONFIRM" ? "WORLD" : draft.stage,
    draft.chapter,
  );
  const isSampleCharacter =
    draft.name.trim().toLowerCase() === "levi ackerman" &&
    draft.work.trim().toLowerCase() === "attack on titan";
  const summary = isSampleCharacter
    ? base.summary!.replace(
        "a quiet mountain city with early morning light",
        `${draft.setting}, with ${draft.visualDirection.toLowerCase()}`,
      )
    : `This is an illustrative layout draft for ${draft.name}${draft.work ? ` from ${draft.work}` : ""}. Connected onboarding will research the confirmed adaptation before proposing a source-grounded personality, voice and appearance. This preview does not make a model call or verify canon.\n\nSpeech patterns, signature phrases and canon references need reliable sources. Unverified quotations will be omitted. Reactions to success, setbacks and recovery remain proposed character speech for your review, grounded in recorded facts.\n\nYour world direction is ${draft.setting}. Its proposed feeling and look: ${draft.visualDirection}. You review the banners, portrait and each chapter’s scenes before explicit activation.`;
  const match = base.match
    ? {
        ...base.match,
        name: draft.name,
        sourceWork: draft.work,
        adaptation: draft.adaptation,
        images: isSampleCharacter ? base.match.images : [],
      }
    : null;
  const legacyModel = {
    ...base,
    status: draft.status,
    name: draft.name,
    work: draft.work,
    summary,
    setting: draft.setting,
    visualDirection: draft.visualDirection,
    banner: base.banner
      ? {
          ...base.banner,
          name: draft.name,
          sourceWork: draft.work,
          adaptation: draft.adaptation,
        }
      : undefined,
  };
  const legacyActions: GuidedActions = {
    lookup: async () => go("CONFIRM"),
    different: () => go("ENTRY"),
    start: async () => go("ASSEMBLING"),
    approve: async () => approve(),
    correct: async () => go("ASSEMBLING"),
    regenerate: async () =>
      go(
        draft.stage === "BANNER"
          ? "GENERATING_BANNER"
          : draft.stage === "PORTRAIT"
            ? "GENERATING_PORTRAIT"
            : "GENERATING_SCENES",
      ),
    pause: async () => patch({ status: "PAUSED" }),
    resume: async () => patch({ status: "RUNNING" }),
    back,
    leave: async () => leave(),
    crop: async () => true,
  };

  const reviewControls = (
    <details className="opening-layout-review-controls">
      <summary className="type-caption">
        Review states · layout sample only
      </summary>
      <div className="opening-review-options">
        {(
          [
            "ENTRY",
            "CONFIRM",
            "WORLD",
            "SUMMARY",
            "ASSEMBLING",
            "NEEDS_INPUT",
            "BANNER",
            "PORTRAIT",
            "SCENES",
            "READY",
            "ACTIVE",
          ] as GuidedStage[]
        ).map((stage) => (
          <Button
            variant="ghost"
            size="sm"
            key={stage}
            onClick={() => go(stage)}
          >
            {stage.toLowerCase().replaceAll("_", " ")}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            go("ASSEMBLING");
            patch({ status: "PAUSED" });
          }}
        >
          Paused preparation
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            go("ASSEMBLING");
            patch({ status: "FAILED" });
          }}
        >
          Preparation failure
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            patch(initialSnapshot);
            setCorrecting(false);
          }}
        >
          Reset preview
        </Button>
      </div>
      <p className="type-caption">
        Approved layout and step indicator. The connected onboarding combines
        these with real saved data and imagery. This page remains sample-only;
        the motion control pauses the background and summary together.
      </p>
    </details>
  );

  return (
    <>
      <SeasonRitualLayout
        split={step !== null}
        paused={paused}
        contentKey={`${draft.stage}:${correcting}`}
        header={
          <>
            <div className="opening-layout-brand">
              <BrandMark />
              <span className="type-system">A higher version of you</span>
            </div>
            <StepIndicator
              items={progress.phases}
              label="Season phases"
              variant="phase"
            />
            <div className="opening-layout-header-actions">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={paused}
                aria-controls="opening-layout-content"
                onClick={() => setPaused((current) => !current)}
              >
                {paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {paused ? "Resume motion" : "Pause motion"}
              </Button>
              <span
                className="opening-save-status type-caption"
                data-failed={saveFailed}
                data-save-state={saveState}
                role="status"
              >
                {saveFailed
                  ? "Save failed"
                  : saveState === "saving"
                    ? "Saving on this device…"
                    : saveState === "saved"
                      ? "Saved on this device"
                      : "Loading draft…"}
              </span>
            </div>
          </>
        }
        introduction={
          <>
            <span className="opening-step-numeral" aria-hidden="true">
              {String((progress.preparationIndex ?? 0) + 1).padStart(2, "0")}
            </span>
            <div className="opening-intro-copy">
              <p className="type-overline">
                Season {season.quarter} · {season.year}
              </p>
              <h1
                ref={title}
                tabIndex={-1}
                id="opening-step-title"
                className="type-season-entry-title"
              >
                {step?.title
                  .split(/(Season\??|character)/)
                  .map((part, index) =>
                    part === "Season" ||
                    part === "Season?" ||
                    part === "character" ? (
                      <em key={index}>{part}</em>
                    ) : (
                      part
                    ),
                  )}
              </h1>
              <p className="type-body-lg">{step?.description}</p>
            </div>
            <p className="opening-intro-signoff type-system">
              Same you.
              <br />A higher version.
            </p>
          </>
        }
        footer={
          <>
            {step && (
              <div className="opening-layout-footer-actions">
                {draft.stage !== "ENTRY" &&
                  !pending &&
                  draft.stage !== "ACTIVE" && (
                    <Button variant="ghost" size="sm" onClick={back}>
                      <ArrowLeft aria-hidden="true" />
                      Back
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={leave}
                  disabled={!hydrated}
                >
                  <Save aria-hidden="true" />
                  Save and leave
                </Button>
              </div>
            )}
            <p className="type-caption">
              Layout preview · sample data · no AI calls
            </p>
          </>
        }
      >
        {step ? (
          <>
            <StepIndicator
              items={progress.preparation}
              label="Character preparation"
            />
            <section
              className="opening-step-content"
              key={`${draft.stage}:${correcting}`}
              aria-labelledby="opening-step-title"
              data-stage={draft.stage}
            >
              {saveFailed && (
                <p className="opening-error type-body-sm" role="alert">
                  This browser could not save the preview. Keep this page open
                  and try Save and leave again.
                </p>
              )}
              {draft.status === "PAUSED" || draft.status === "FAILED" ? (
                <Card spacing="action">
                  <h2 className="type-section-title">
                    {draft.status === "PAUSED"
                      ? "Ready when you are."
                      : "Your draft is still here."}
                  </h2>
                  <p className="type-body">
                    {draft.status === "PAUSED"
                      ? "Resume preparation from this step."
                      : "The simulated preparation stopped. Your character and world direction are preserved."}
                  </p>
                  <Button onClick={() => patch({ status: "RUNNING" })}>
                    {draft.status === "PAUSED"
                      ? "Resume preparation"
                      : "Retry preparation"}
                  </Button>
                </Card>
              ) : pending ? (
                <div className="opening-preparation-working" aria-busy="true">
                  <LoadingIndicator
                    variant="eclipse"
                    area="direction"
                    label="Preparing the illustrative Season summary"
                  />
                  <h2 className="type-section-title">
                    Getting to know your character.
                  </h2>
                  <p className="type-body">
                    Gathering sources, shaping the voice and preparing your
                    summary.
                  </p>
                  <p className="type-caption">
                    Simulated preparation · no model is connected to this
                    preview.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => patch({ status: "PAUSED" })}
                  >
                    Pause preparation
                  </Button>
                </div>
              ) : draft.stage === "ENTRY" ? (
                <form
                  className="opening-preparation-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setLookupBusy(true);
                    lookupTimer.current = setTimeout(() => {
                      setLookupBusy(false);
                      go("CONFIRM");
                    }, 700);
                  }}
                >
                  <Input
                    variant="featured"
                    label="Character name"
                    value={draft.name}
                    onChange={(event) =>
                      patch({
                        name: event.target.value,
                        originalsReviewed: false,
                      })
                    }
                    disabled={lookupBusy || !hydrated}
                  />
                  <Input
                    variant="featured"
                    label="Source work · optional"
                    value={draft.work}
                    onChange={(event) =>
                      patch({
                        work: event.target.value,
                        originalsReviewed: false,
                      })
                    }
                    disabled={lookupBusy || !hydrated}
                  />
                  {lookupBusy && (
                    <LoadingIndicator
                      area="direction"
                      label="Showing the sample character confirmation"
                    />
                  )}
                  <div className="opening-primary-actions">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={
                        !hydrated || lookupBusy || draft.name.trim().length < 2
                      }
                    >
                      {lookupBusy
                        ? "Finding your character…"
                        : "Find my character"}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              ) : draft.stage === "CONFIRM" ? (
                <div className="opening-confirmation-content">
                  <CharacterConfirmation
                    match={match}
                    onConfirm={() => go("WORLD")}
                    onWrongCharacter={() => go("ENTRY")}
                    onDifferentVersion={() => setVersionsOpen(true)}
                  />
                  {versionsOpen && (
                    <Select
                      label="Character adaptation"
                      value={draft.adaptation}
                      options={[
                        { value: "TV anime", label: "TV anime · sample" },
                        { value: "Manga", label: "Manga · sample" },
                      ]}
                      onValueChange={(adaptation) => {
                        patch({ adaptation, originalsReviewed: false });
                        setVersionsOpen(false);
                      }}
                    />
                  )}
                </div>
              ) : draft.stage === "WORLD" ? (
                <form
                  className="opening-preparation-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    go("ASSEMBLING");
                  }}
                >
                  <Input
                    variant="featured"
                    label="Where should this Season take place?"
                    value={draft.setting}
                    onChange={(event) => patch({ setting: event.target.value })}
                  />
                  <Textarea
                    variant="featured"
                    label="How should it feel and look?"
                    value={draft.visualDirection}
                    onChange={(event) =>
                      patch({ visualDirection: event.target.value })
                    }
                  />
                  <details className="opening-source-details">
                    <summary className="type-body-sm">
                      Character references · illustrative sample
                    </summary>
                    <p className="type-caption">
                      This layout uses sample artwork. Connected onboarding
                      requires authentic, likeness-reviewed originals before
                      generation.
                    </p>
                    {isSampleCharacter && (
                      <Image
                        src={base.originals[0].href}
                        alt="Levi sample artwork for layout review; not an authentic original"
                        width={120}
                        height={120}
                      />
                    )}
                  </details>
                  <SelectionLabel>
                    <Checkbox
                      checked={draft.originalsReviewed}
                      onChange={(event) =>
                        patch({ originalsReviewed: event.target.checked })
                      }
                    />
                    <SelectionCopy>
                      I reviewed the sample references for this layout preview.
                    </SelectionCopy>
                  </SelectionLabel>
                  <div className="opening-primary-actions">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={
                        !draft.originalsReviewed ||
                        draft.setting.trim().length < 3 ||
                        draft.visualDirection.trim().length < 3
                      }
                    >
                      <Sparkles aria-hidden="true" />
                      Prepare my Season
                    </Button>
                  </div>
                </form>
              ) : draft.stage === "NEEDS_INPUT" || correcting ? (
                <form
                  className="opening-preparation-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    go("ASSEMBLING");
                  }}
                >
                  <Textarea
                    variant="featured"
                    label={
                      correcting
                        ? "What should we change?"
                        : "One more detail: which version should guide the character?"
                    }
                    value={draft.correction}
                    onChange={(event) =>
                      patch({ correction: event.target.value })
                    }
                  />
                  <div className="opening-primary-actions">
                    <Button
                      type="submit"
                      disabled={draft.correction.trim().length < 3}
                    >
                      Update my Season
                    </Button>
                    {correcting && (
                      <Button
                        variant="secondary"
                        onClick={() => setCorrecting(false)}
                      >
                        Keep this draft
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="opening-summary-content">
                  {draft.correction && (
                    <p className="type-caption">
                      Requested change in this preview: {draft.correction}
                    </p>
                  )}
                  <AiTextFrame
                    paused={paused}
                    heading="AI-prepared Season summary"
                    description={[draft.name, draft.work, draft.adaptation]
                      .filter(Boolean)
                      .join(" · ")}
                  >
                    <AiGeneratedText
                      text={summary.replaceAll("[catalogue]", "[1]")}
                      paused={paused}
                    />
                    {isSampleCharacter && (
                      <p className="type-caption">
                        Preview source:{" "}
                        <a
                          href="https://anilist.co/character/45627/Levi/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          [1] Character catalogue
                        </a>
                      </p>
                    )}
                  </AiTextFrame>
                  <details className="opening-source-details">
                    <summary className="type-body-sm">
                      Explore character details and sources
                    </summary>
                    <p className="type-body-sm">
                      This sample demonstrates the review layout. Connected
                      onboarding retains the complete sourced profile and its
                      reviewed revision.
                    </p>
                  </details>
                  <p className="type-caption">
                    Artwork begins after approval. Estimated first-pass
                    reservation: €7.65, within the €15 cap.
                  </p>
                  <div className="opening-primary-actions">
                    <Button onClick={approve}>
                      Approve and create artwork
                      <ArrowRight aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCorrecting(true)}
                    >
                      Request changes
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="opening-existing-imagery">
            <SeasonOnboardingView
              model={legacyModel}
              actions={legacyActions}
              demo
            />
          </div>
        )}
        {step && reviewControls}
      </SeasonRitualLayout>
      {!step && reviewControls}
    </>
  );
}
