"use client";

import Image from "next/image";
import { SeasonPreparationProgress } from "@/components/ui/season-preparation/season-preparation.component";
import { RecognizedCharacter } from "@/components/ui/recognized-character/recognized-character.component";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { SeasonRitualLayout } from "@/components/layout/season-ritual/season-ritual-layout.component";
import { StepIndicator } from "@/components/ui/step-indicator/step-indicator.component";
import {
  preparationSteps,
  resolveOpeningProgress,
} from "@/features/seasons/living/onboarding/utils/season-opening-progress.util";
import {
  SeasonActivationReview,
  type SeasonActivationRecap,
} from "@/features/seasons/living/onboarding/components/season-activation-review.component";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Monitor,
  Pause,
  Play,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { Button } from "@/components/ui/buttons/button.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { AiTextFrame } from "@/components/ui/ai-text-frame/ai-text-frame.component";
import { Card } from "@/components/ui/cards/card.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import {
  Checkbox,
  SelectionCopy,
  SelectionLabel,
} from "@/components/ui/forms/selection.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { type CharacterConfirmationMatch } from "@/components/ui/character-confirmation/character-confirmation.component";
import {
  CharacterBanner,
  type CharacterBannerContent,
} from "@/components/ui/character-banner/character-banner.component";
import {
  CharacterAvatarEditor,
  type AvatarPlacement,
} from "@/components/ui/character-avatar/character-avatar-editor.component";
import { ResizableViewport } from "@/components/ui/viewport-preview/components/resizable-viewport.component";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import type { OnboardingStage } from "@/features/seasons/living/onboarding/onboarding.schema";
import { ONBOARDING_MILESTONES } from "@/features/seasons/living/onboarding/onboarding-progress.util";
import { desktopArtworkFocusStyle } from "@/features/seasons/living/utils/living-artwork-focus.util";
import "@/features/seasons/opening/styles/season-opening-ritual.css";
import "../styles/season-onboarding.css";
import "@/features/seasons/living/onboarding/styles/season-preparation.css";

export type GuidedStage = OnboardingStage | "ENTRY";
export type GuidedModel = {
  preparationProgress?:
    import("../onboarding.schema").PreparationProgress | null;
  stage: GuidedStage;
  status: string;
  chapter: number;
  progress: number;
  busy?: boolean;
  error?: string | null;
  question?: string | null;
  name: string;
  work: string;
  setting: string;
  visualDirection: string;
  match?: CharacterConfirmationMatch | null;
  summary?: string;
  profile?: LivingCharacterProfile | null;
  banner?: CharacterBannerContent & {
    avatarSrc?: string | null;
    crop?: AvatarPlacement;
  };
  originals: {
    id: string;
    href: string;
    label: string;
    sourceUrl?: string | null;
  }[];
  scenes: {
    id: string;
    state: string;
    format: string;
    href: string;
    focalX?: number;
    focalY?: number;
  }[];
  pendingImageCount?: number;
  budgetReserved?: number;
  reviewOnly?: boolean;
};
export type GuidedActions = {
  lookup: (name: string, work: string) => Promise<void | boolean>;
  different: () => void;
  changeCharacter?: () => void;
  start: (setting: string, visualDirection: string) => Promise<void | boolean>;
  approve: () => Promise<void | boolean>;
  correct: (text: string) => Promise<void | boolean>;
  regenerate: (
    kind: "desktop" | "phone" | "avatar" | "scene",
    id?: string,
  ) => Promise<void | boolean>;
  pause: () => Promise<void | boolean>;
  resume: () => Promise<void | boolean>;
  back: () => void;
  leave: (fields: {
    name: string;
    work: string;
    setting: string;
    visualDirection: string;
  }) => Promise<void | boolean>;
  crop: (placement: AvatarPlacement, file?: File) => Promise<boolean>;
};

function CitedSummary({
  text,
  profile,
  paused,
}: {
  text: string;
  profile?: LivingCharacterProfile | null;
  paused: boolean;
}) {
  const citedText = text.replace(/\[([^\]]+)\]/g, (marker, id: string) => {
    const index =
      profile?.sources.findIndex((source) => source.id === id) ?? -1;
    return index >= 0 ? `[${index + 1}]` : marker;
  });
  const sources =
    profile?.sources.filter(
      (source) => source.url && text.includes(`[${source.id}]`),
    ) ?? [];
  return (
    <div className="guided-summary">
      <AiGeneratedText text={citedText} paused={paused} />
      {sources.length > 0 && (
        <p className="type-caption">
          Sources:{" "}
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url!}
              target="_blank"
              rel="noreferrer"
              aria-label={`Source ${profile!.sources.indexOf(source) + 1}: ${source.title}`}
            >
              [{profile!.sources.indexOf(source) + 1}]
            </a>
          ))}
        </p>
      )}
    </div>
  );
}

function PhoneArtwork({
  href,
  alt,
  banner,
}: {
  href: string;
  alt: string;
  banner?: CharacterBannerContent;
}) {
  const [size, setSize] = useState({ width: 375, height: 620 });
  return (
    <ResizableViewport
      size={size}
      onSizeChange={setSize}
      name={`${alt} phone preview`}
      screenClassName={banner ? "guided-phone-banner-frame" : undefined}
    >
      {banner ? (
        <div className="guided-phone-banner">
          <CharacterBanner
            content={{
              name: banner.name,
              sourceWork: banner.sourceWork,
              adaptation: banner.adaptation,
              desktopSrc: href,
              phoneSrc: href,
              alt,
            }}
          />
        </div>
      ) : (
        <Image
          src={href}
          alt={alt}
          width={768}
          height={1365}
          unoptimized
          className="guided-phone-image"
        />
      )}
    </ResizableViewport>
  );
}

function ArtworkFormatPane({
  active,
  format,
  children,
}: {
  active: boolean;
  format: "DESKTOP" | "MOBILE";
  children: ReactNode;
}) {
  const presence = usePresence(active, "surface");
  return (
    <div
      className="guided-scene-pane"
      data-format={format}
      data-presence={presence.presenceState}
      hidden={!presence.isPresent}
      inert={!active}
      aria-hidden={!active}
      onAnimationEnd={presence.onPresenceAnimationEnd}
    >
      {children}
    </div>
  );
}

function ArtworkFormatControls({
  format,
  previewId,
  onSelect,
}: {
  format: "DESKTOP" | "MOBILE";
  previewId: string;
  onSelect: (format: "DESKTOP" | "MOBILE") => void;
}) {
  return (
    <div
      className="guided-inline-actions guided-format-controls"
      role="group"
      aria-label="Preview format"
    >
      {(["DESKTOP", "MOBILE"] as const).map((next) => (
        <Button
          key={next}
          variant={format === next ? "primary" : "secondary"}
          aria-pressed={format === next}
          aria-controls={previewId}
          onClick={() => onSelect(next)}
        >
          {next === "DESKTOP" ? (
            <Monitor aria-hidden="true" />
          ) : (
            <Smartphone aria-hidden="true" />
          )}
          {next === "DESKTOP" ? "Desktop" : "Mobile"}
        </Button>
      ))}
    </div>
  );
}

function ArtworkReview({
  model,
  actions,
}: {
  model: GuidedModel;
  actions: GuidedActions;
}) {
  const [state, setState] = useState("ON_TRACK");
  const [format, setFormat] = useState<"DESKTOP" | "MOBILE">("DESKTOP");
  const [visited, setVisited] = useState(["ON_TRACK:DESKTOP"]);
  const previewId = useId();
  const [reviewed, setReviewed] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const isBanner = model.stage === "BANNER";
  const isPortrait = model.stage === "PORTRAIT";
  const pair = model.scenes.filter((s) => s.state === state);
  const desktop = pair.find((s) => s.format === "DESKTOP");
  const phone = pair.find((s) => s.format === "MOBILE");
  const labels: Record<string, string> = {
    ON_TRACK: "On track",
    NEUTRAL: "In progress",
    FAR_BEHIND: "Behind pace",
  };
  const remainingReviews = Object.entries(labels).flatMap(([pace, label]) => {
    const formats = (["DESKTOP", "MOBILE"] as const)
      .filter((candidate) => !visited.includes(`${pace}:${candidate}`))
      .map((candidate) => (candidate === "DESKTOP" ? "desktop" : "mobile"));
    return formats.length ? [`${label} (${formats.join(" and ")})`] : [];
  });
  return (
    <div className="guided-review">
      <header>
        <h2 className="type-section-title">
          {isBanner
            ? "Your character, brought into this Season."
            : isPortrait
              ? "Your profile picture."
              : model.chapter === 1
                ? "Let’s check the first chapter."
                : `Chapter ${model.chapter} of 7`}
        </h2>
        <p className="type-body-sm">
          {isBanner
            ? "Check the desktop and phone banners before creating your profile picture."
            : isPortrait
              ? "Check the likeness and adjust the crop before creating scenes."
              : "Review both compositions for each pace. Nothing becomes active until you approve it."}
        </p>
      </header>
      {isBanner && model.banner ? (
        <>
          <div className="guided-scene-controls">
            <ArtworkFormatControls
              format={format}
              previewId={previewId}
              onSelect={setFormat}
            />
          </div>
          <div
            id={previewId}
            className="guided-scene-viewport"
            role="region"
            aria-label="Banner composition preview"
          >
            <ArtworkFormatPane active={format === "DESKTOP"} format="DESKTOP">
              <div className="guided-banner-desktop">
                <CharacterBanner
                  content={{
                    ...model.banner,
                    phoneSrc: model.banner.desktopSrc,
                  }}
                />
                <Button
                  variant="ghost"
                  disabled={model.busy || model.reviewOnly}
                  onClick={() => void actions.regenerate("desktop")}
                >
                  Try another desktop banner
                </Button>
              </div>
            </ArtworkFormatPane>
            <ArtworkFormatPane active={format === "MOBILE"} format="MOBILE">
              <Card spacing="dense">
                <h3 className="type-label">Phone banner</h3>
                {model.banner.phoneSrc && (
                  <PhoneArtwork
                    href={model.banner.phoneSrc}
                    alt={`${model.name} phone banner`}
                    banner={model.banner}
                  />
                )}
                <Button
                  variant="ghost"
                  disabled={model.busy || model.reviewOnly}
                  onClick={() => void actions.regenerate("phone")}
                >
                  Try another phone banner
                </Button>
              </Card>
            </ArtworkFormatPane>
          </div>
        </>
      ) : isPortrait && model.banner ? (
        <>
          <Card spacing="dense" className="guided-portrait-review">
            <h3 className="type-label">Your portrait</h3>
            {model.banner.avatarSrc && (
              <Image
                src={model.banner.avatarSrc}
                alt={`${model.name} portrait`}
                width={512}
                height={512}
                unoptimized
                className="guided-portrait"
              />
            )}
            <p className="type-body-sm">
              A separate portrait, with a crop you can adjust.
            </p>
            <div className="guided-inline-actions">
              <Button
                variant="secondary"
                disabled={model.busy || model.reviewOnly}
                onClick={() => setAvatarOpen(true)}
              >
                Adjust portrait
              </Button>
              <Button
                variant="ghost"
                disabled={model.busy || model.reviewOnly}
                onClick={() => void actions.regenerate("avatar")}
              >
                Try another portrait
              </Button>
            </div>
          </Card>
          {avatarOpen && model.banner.avatarSrc && (
            <CharacterAvatarEditor
              name={model.name}
              source={model.banner.avatarSrc}
              generatedSource={model.banner.avatarSrc}
              placement={model.banner.crop ?? { x: 0.5, y: 0.5, zoom: 1.24 }}
              onClose={() => setAvatarOpen(false)}
              onApply={async (_source, placement, file) => {
                const success = await actions.crop(placement, file);
                if (success) setAvatarOpen(false);
                return success;
              }}
            />
          )}
        </>
      ) : (
        <>
          <div className="guided-scene-controls">
            <div
              className="guided-inline-actions"
              role="group"
              aria-label="Pace compositions"
            >
              {Object.entries(labels).map(([key, label]) => (
                <Button
                  key={key}
                  className="guided-pace-button"
                  data-pace={key}
                  variant={key === state ? "primary" : "secondary"}
                  aria-pressed={key === state}
                  onClick={() => {
                    setState(key);
                    setVisited((v) => [...new Set([...v, `${key}:${format}`])]);
                    setReviewed(false);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <ArtworkFormatControls
              format={format}
              previewId={previewId}
              onSelect={(next) => {
                setFormat(next);
                setVisited((v) => [...new Set([...v, `${state}:${next}`])]);
              }}
            />
          </div>
          <div
            id={previewId}
            className="guided-scene-viewport"
            role="region"
            aria-label="Scene composition preview"
          >
            <ArtworkFormatPane active={format === "DESKTOP"} format="DESKTOP">
              <Card spacing="dense">
                <h3 className="type-label">{labels[state]} · desktop</h3>
                {desktop && (
                  <div className="guided-desktop-scene-preview">
                    <Image
                      src={desktop.href}
                      alt={`Chapter ${model.chapter}, ${labels[state]}, desktop composition`}
                      fill
                      sizes="100vw"
                      unoptimized
                      className="guided-scene-image"
                      style={desktopArtworkFocusStyle(
                        desktop.focalX ?? 0.5,
                        desktop.focalY ?? 0.5,
                      )}
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  disabled={model.busy || !desktop}
                  onClick={() => void actions.regenerate("scene", desktop?.id)}
                >
                  Try another desktop scene
                </Button>
              </Card>
            </ArtworkFormatPane>
            <ArtworkFormatPane active={format === "MOBILE"} format="MOBILE">
              <Card spacing="dense">
                <h3 className="type-label">{labels[state]} · phone</h3>
                {phone && (
                  <PhoneArtwork
                    href={phone.href}
                    alt={`Chapter ${model.chapter}, ${labels[state]}`}
                  />
                )}
                <Button
                  variant="ghost"
                  disabled={model.busy || !phone}
                  onClick={() => void actions.regenerate("scene", phone?.id)}
                >
                  Try another phone scene
                </Button>
              </Card>
            </ArtworkFormatPane>
          </div>
          <div className="guided-review-status type-caption" role="status">
            <p>{visited.length} of 6 compositions viewed</p>
            <p>
              {remainingReviews.length
                ? `Still to view: ${remainingReviews.join(" · ")}.`
                : model.reviewOnly
                  ? "All compositions viewed."
                  : "All compositions viewed. Confirm the character likeness below to approve this chapter."}
            </p>
          </div>
        </>
      )}
      {!model.reviewOnly && (
        <SelectionLabel>
          <Checkbox
            checked={reviewed}
            disabled={!isBanner && !isPortrait && visited.length < 6}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          <SelectionCopy>
            {isPortrait
              ? "I checked the character likeness in this profile picture."
              : "I checked the character likeness and the phone compositions."}
          </SelectionCopy>
        </SelectionLabel>
      )}
      <Button
        disabled={(!model.reviewOnly && !reviewed) || model.busy}
        onClick={() => void actions.approve()}
      >
        <Check aria-hidden="true" />
        {model.reviewOnly
          ? "Return to current step"
          : isBanner
            ? "Approve banners and continue"
            : isPortrait
              ? "Approve profile and choose scene creation"
              : model.chapter === 7
                ? "Approve final chapter"
                : "Approve and create next chapter"}
      </Button>
    </div>
  );
}

export function SeasonOnboardingView({
  model,
  actions,
  demo = false,
  showMotionControls = demo,
  savedLabel = "Saved",
  leaveLabel = "Save and leave",
  draftKey,
  legacyDraftKey,
  season,
  recap,
  preparation,
  characterOptions,
  versionTrigger,
  imageryControls,
}: {
  model: GuidedModel;
  actions: GuidedActions;
  demo?: boolean;
  showMotionControls?: boolean;
  savedLabel?: string;
  leaveLabel?: string;
  draftKey?: string;
  legacyDraftKey?: string;
  season?: { year: number; quarter: number };
  recap?: SeasonActivationRecap;
  preparation?: ReactNode;
  characterOptions?: ReactNode;
  versionTrigger?: React.RefObject<HTMLButtonElement | null>;
  imageryControls?: ReactNode;
}) {
  const [name, setName] = useState(model.name);
  const [work, setWork] = useState(model.work);
  const [setting, setSetting] = useState(model.setting);
  const [visualDirection, setVisualDirection] = useState(model.visualDirection);
  const [correcting, setCorrecting] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const summaryId = useId();
  const [correction, setCorrection] = useState("");
  const [originalsConfirmed, setOriginalsConfirmed] = useState(false);
  const originalReviewKey = `${model.name}:${model.work}:${model.originals.map((image) => image.id).join(":")}`;
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOriginalsConfirmed(false));
    return () => cancelAnimationFrame(frame);
  }, [originalReviewKey]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCorrecting(false);
      setCorrection("");
    });
    return () => cancelAnimationFrame(frame);
  }, [model.stage]);
  const [localDraft, setLocalDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  useEffect(() => {
    if (!draftKey) return;
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem(draftKey) ??
            (legacyDraftKey ? localStorage.getItem(legacyDraftKey) : null) ??
            "null",
        );
        if (!saved || typeof saved !== "object") return;
        setLocalDraft(true);
        if (typeof saved.name === "string") setName(saved.name);
        if (typeof saved.work === "string") setWork(saved.work);
        if (typeof saved.setting === "string") setSetting(saved.setting);
        if (typeof saved.visualDirection === "string")
          setVisualDirection(saved.visualDirection);
      } catch {
        /* Saved server data remains the fallback. */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [draftKey, legacyDraftKey]);
  function persistFields(patch: Record<string, string>) {
    setLocalDraft(true);
    try {
      if (draftKey)
        localStorage.setItem(
          draftKey,
          JSON.stringify({ name, work, setting, visualDirection, ...patch }),
        );
      setDraftError("");
    } catch {
      setDraftError(
        "Could not save this draft on your device. Keep this page open and try again.",
      );
    }
  }
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const title = useRef<HTMLHeadingElement>(null);
  const pending = [
    "ASSEMBLING",
    "GENERATING_BANNER",
    "GENERATING_PORTRAIT",
    "GENERATING_SCENES",
  ].includes(model.stage);
  const stopped = ["PAUSED", "FAILED"].includes(model.status);
  const busy = !hydrated || Boolean(model.busy || (pending && !stopped));
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [model.stage]);
  const stageLabels: Record<GuidedStage, string> = {
    ENTRY: "Character",
    WORLD: "World & mood",
    ASSEMBLING: "Preparing your Season",
    NEEDS_INPUT: "One more detail",
    SUMMARY: "Your Season summary",
    BANNER_PREPARATION: "Prepare your banners",
    PORTRAIT_PREPARATION: "Prepare your portrait",
    SCENE_METHOD: "Scene creation method",
    SCENE_PREPARATION: "Prepare your chapter",
    GENERATING_BANNER: "Creating your character",
    BANNER: "Banners",
    GENERATING_PORTRAIT: "Creating your profile picture",
    PORTRAIT: "Profile picture",
    GENERATING_SCENES: "Creating scenes",
    SCENES: "Scene review",
    READY: "Ready to begin",
    ACTIVE: "Season activated",
  };
  const progress = resolveOpeningProgress(model.stage);
  const step =
    model.stage === "ASSEMBLING" || progress.preparationIndex === null
      ? null
      : preparationSteps[progress.preparationIndex];
  const Footer = season ? "div" : "footer";
  const content = (
    <>
      {((model.error && model.stage !== "ASSEMBLING") || draftError) &&
        model.stage !== "READY" && (
          <p className="guided-error type-body" role="alert">
            {model.error || draftError}
          </p>
        )}
      {characterOptions}
      {(model.stage === "WORLD" || model.stage === "SUMMARY") &&
        model.match && (
          <RecognizedCharacter
            name={model.match.name}
            sourceWork={model.match.sourceWork}
            adaptation={model.match.adaptation}
            reference={model.match.images[0]}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || model.reviewOnly}
                  onClick={actions.changeCharacter ?? actions.back}
                >
                  Change character
                </Button>
                <Button
                  ref={versionTrigger}
                  variant="ghost"
                  size="sm"
                  disabled={busy || model.reviewOnly}
                  onClick={actions.different}
                >
                  Change version
                </Button>
              </>
            }
          />
        )}
      {preparation ??
        (model.stage === "READY" && recap ? (
          <SeasonActivationReview
            recap={recap}
            paused={motionPaused}
            status={
              model.busy ? "activating" : model.error ? "failed" : "ready"
            }
            error={model.error}
            onActivate={() => void actions.approve()}
            titleRef={title}
          />
        ) : model.stage === "ASSEMBLING" ? (
          <SeasonPreparationProgress
            titleRef={title}
            name={model.name}
            sourceWork={model.work}
            portraitHref={model.originals[0]?.href}
            onLeave={() =>
              void actions.leave({
                name: model.name,
                work: model.work,
                setting: model.setting,
                visualDirection: model.visualDirection,
              })
            }
            status={model.status}
            progress={model.preparationProgress}
            error={model.error}
            busy={model.busy}
            paused={motionPaused}
            onPause={() => void actions.pause()}
            onResume={() => void actions.resume()}
          />
        ) : stopped ? (
          <Card spacing="action">
            <h2 className="type-section-title">
              {model.status === "PAUSED"
                ? "Ready when you are."
                : "Your work is saved."}
            </h2>
            <p className="type-body">
              {model.status === "PAUSED"
                ? "Resume to continue from the same step."
                : "Review the saved result before retrying unfinished work. A failed image call can still have been billed."}
            </p>
            <Button
              disabled={model.busy || model.reviewOnly}
              onClick={() =>
                void (model.status === "FAILED" &&
                model.stage.startsWith("GENERATING_")
                  ? actions.regenerate("desktop")
                  : actions.resume())
              }
            >
              {model.status === "FAILED"
                ? "Retry unfinished work"
                : "Resume Season"}
            </Button>
          </Card>
        ) : pending ? (
          <section className="guided-working" aria-busy="true">
            <LoadingIndicator
              variant="eclipse"
              area="direction"
              label={stageLabels[model.stage]}
            />
            <h2 className="type-section-title">
              {model.stage === "GENERATING_BANNER"
                ? "Bringing your character into this world."
                : model.stage === "GENERATING_PORTRAIT"
                  ? "Creating your profile picture."
                  : `Creating chapter ${model.chapter}.`}
            </h2>
            <p className="type-body">
              {`${model.pendingImageCount ?? 0} compositions remaining in this batch.`}
            </p>
            <p className="type-body-sm">
              You can leave and return. Everything completed stays saved.
            </p>
            <Button variant="secondary" onClick={() => void actions.pause()}>
              Pause
            </Button>
          </section>
        ) : model.stage === "ENTRY" ? (
          <form
            className="cots-character-entry guided-entry"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.lookup(name, work);
            }}
          >
            {!season && (
              <p className="type-season-entry-description">
                Name a character. We’ll take care of the details.
                <br />
                You stay in control of the result.
              </p>
            )}
            <div className="cots-character-entry-form">
              <Input
                variant="featured"
                label="Character name"
                value={name}
                placeholder="Levi Ackerman"
                onChange={(event) => {
                  setName(event.target.value);
                  persistFields({ name: event.target.value });
                }}
                disabled={busy}
              />
              <Input
                variant="featured"
                label="Source work · optional"
                value={work}
                placeholder="Attack on Titan"
                onChange={(event) => {
                  setWork(event.target.value);
                  persistFields({ work: event.target.value });
                }}
                disabled={busy}
              />
              <Button type="submit" disabled={busy || name.trim().length < 2}>
                <Sparkles aria-hidden="true" />
                {busy ? "Finding your character…" : "Find my character"}
              </Button>
            </div>
          </form>
        ) : model.stage === "WORLD" ? (
          <form
            className="cots-character-entry guided-entry guided-world-entry"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.start(setting, visualDirection);
            }}
          >
            {!season && (
              <p className="type-season-entry-description">
                Now, imagine the world around {model.name.split(" ")[0]}.<br />
                Two small details. AI takes it from here.
              </p>
            )}
            <div className="cots-character-entry-form">
              <Input
                variant="featured"
                label="Where should this Season take place?"
                value={setting}
                placeholder="A quiet city at the edge of the mountains"
                onChange={(event) => {
                  setSetting(event.target.value);
                  persistFields({ setting: event.target.value });
                }}
                disabled={busy}
              />
              <Textarea
                variant="featured"
                label="How should it feel and look?"
                value={visualDirection}
                placeholder="Calm, cinematic, early morning light"
                onChange={(event) => {
                  setVisualDirection(event.target.value);
                  persistFields({ visualDirection: event.target.value });
                }}
                disabled={busy}
              />
            </div>
            <Button
              type="submit"
              disabled={
                busy ||
                setting.trim().length < 3 ||
                visualDirection.trim().length < 3
              }
            >
              <Sparkles aria-hidden="true" />
              Continue
            </Button>
          </form>
        ) : model.stage === "NEEDS_INPUT" ||
          (model.stage === "SUMMARY" && correcting) ? (
          <form
            className="cots-character-entry guided-entry"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.correct(correction).then((success) => {
                if (success === false) return;
                setCorrecting(false);
                setCorrection("");
              });
            }}
          >
            <h2 className="type-section-title">
              {model.stage === "NEEDS_INPUT"
                ? model.question
                : "What would you like to change?"}
            </h2>
            <Textarea
              label={
                model.stage === "NEEDS_INPUT" ? "Your answer" : "Your direction"
              }
              id="guided-correction"
              value={correction}
              onChange={(event) => setCorrection(event.target.value)}
              rows={4}
              placeholder="Make the setback response gentler, while keeping the character’s direct voice."
              disabled={busy}
            />
            <div className="guided-inline-actions">
              <Button
                type="submit"
                disabled={busy || correction.trim().length < 3}
              >
                Update my Season
              </Button>
              {correcting && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setCorrecting(false)}
                >
                  Keep this summary
                </Button>
              )}
            </div>
          </form>
        ) : model.stage === "SUMMARY" ? (
          <section className="guided-summary-stage">
            {!season && (
              <div className="guided-summary-heading">
                <h2 id={`${summaryId}-title`} className="type-section-title">
                  Here’s the Season we’ll create.
                </h2>
                {showMotionControls && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={motionPaused}
                    aria-controls={summaryId}
                    onClick={() => setMotionPaused((paused) => !paused)}
                  >
                    {motionPaused ? (
                      <Play aria-hidden="true" />
                    ) : (
                      <Pause aria-hidden="true" />
                    )}
                    {motionPaused ? "Resume motion" : "Pause motion"}
                  </Button>
                )}
              </div>
            )}
            <AiTextFrame
              paused={motionPaused}
              id={summaryId}
              heading="AI-prepared Season summary"
              headingLevel={season ? 2 : 3}
              description={[
                model.name,
                model.work,
                model.profile?.adaptation ||
                  model.match?.adaptation ||
                  model.banner?.adaptation,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              <CitedSummary
                key={model.summary}
                text={model.summary ?? ""}
                profile={model.profile}
                paused={motionPaused}
              />
            </AiTextFrame>
            <details>
              <summary className="type-body-sm">
                Explore the character details and sources
              </summary>
              {model.profile && (
                <div className="guided-details type-body-sm">
                  <p>
                    <strong>Personality</strong>
                    <br />
                    {model.profile.personality?.description}
                  </p>
                  <p>
                    <strong>Speech patterns</strong>
                    <br />
                    {model.profile.speechPatterns
                      .map((s) => s.description)
                      .join(" · ")}
                  </p>
                  <p>
                    <strong>Signature phrases</strong>
                    <br />
                    {model.profile.signaturePhrases
                      .map((s) => s.description)
                      .join(" · ") || "No reliably verified signature phrases."}
                  </p>
                  <p>
                    <strong>Canon references</strong>
                    <br />
                    {model.profile.canonReferences
                      .map((s) => s.description)
                      .join(" · ") ||
                      "No additional verified canon references."}
                  </p>
                  <p>
                    <strong>Character-inspired reactions</strong>
                    <br />
                    Success: {model.profile.responseToSuccess}
                    <br />
                    Setback: {model.profile.responseToSetback}
                    <br />
                    Recovery: {model.profile.responseToRecovery}
                  </p>
                  <p>
                    <strong>Visual identity and boundaries</strong>
                    <br />
                    {model.profile.visualDirection}
                    <br />
                    {model.profile.visualBoundaries}
                  </p>
                  {model.profile.sources.map((s) => (
                    <p key={s.id}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                      <br />
                      {s.notes}
                    </p>
                  ))}
                </div>
              )}
            </details>
            {!model.reviewOnly && (
              <>
                {model.originals.length > 0 ? (
                  <details className="guided-originals">
                    <summary className="type-body-sm">
                      Character references · {model.originals.length} originals
                    </summary>
                    <div className="guided-original-list">
                      {model.originals.map((image) => (
                        <figure key={image.id}>
                          <Image
                            src={image.href}
                            alt={image.label}
                            width={180}
                            height={180}
                            unoptimized
                          />
                          {image.sourceUrl && (
                            <figcaption>
                              <a
                                href={image.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="type-caption"
                              >
                                Source
                              </a>
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </details>
                ) : (
                  <p className="type-body-sm">
                    No authentic reference is available for this selection. Go
                    back and choose another character or version.
                  </p>
                )}
                <SelectionLabel>
                  <Checkbox
                    checked={originalsConfirmed}
                    onChange={(event) =>
                      setOriginalsConfirmed(event.target.checked)
                    }
                  />
                  <SelectionCopy>
                    I reviewed the original images for this character and
                    adaptation.
                  </SelectionCopy>
                </SelectionLabel>
              </>
            )}
            <p className="type-caption">
              Artwork begins after approval. Estimated first-pass artwork
              reservation: €7.65, within the €15 cap.
            </p>
            <div className="guided-inline-actions">
              <Button
                disabled={
                  busy ||
                  (!model.reviewOnly &&
                    (!model.originals.length || !originalsConfirmed))
                }
                onClick={() => void actions.approve()}
              >
                {model.reviewOnly
                  ? "Return to current step"
                  : "Approve and continue"}{" "}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                disabled={busy || model.reviewOnly}
                onClick={() => setCorrecting(true)}
              >
                Request changes
              </Button>
            </div>
          </section>
        ) : model.stage === "BANNER" ||
          model.stage === "PORTRAIT" ||
          model.stage === "SCENES" ? (
          <ArtworkReview
            key={`${model.chapter}:${model.banner?.desktopSrc}:${model.banner?.avatarSrc}:${model.scenes.map((s) => s.id).join(":")}`}
            model={model}
            actions={actions}
          />
        ) : (
          <section className="guided-ready">
            <h2 className="type-section-title">
              {model.stage === "ACTIVE"
                ? "Your Season is ready to live."
                : "Everything is reviewed. Your Season is ready."}
            </h2>
            <p className="type-body">
              {model.stage === "ACTIVE"
                ? "Your character and evolving world will accompany this Season."
                : "Your character profile, banner, portrait and all 42 scenes are approved."}
            </p>
            {model.stage !== "ACTIVE" && (
              <Button disabled={busy} onClick={() => void actions.approve()}>
                Activate Season <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </section>
        ))}
    </>
  );
  const footer = (
    <Footer className="guided-footer">
      <div className="guided-inline-actions">
        {(!pending || stopped) &&
          model.stage !== "ENTRY" &&
          model.stage !== "ACTIVE" && (
            <Button variant="ghost" disabled={busy} onClick={actions.back}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          )}
        {model.stage !== "ASSEMBLING" && (
          <Button
            variant="ghost"
            disabled={Boolean(model.busy)}
            onClick={() =>
              void actions.leave({ name, work, setting, visualDirection })
            }
          >
            <Save aria-hidden="true" />
            {leaveLabel}
          </Button>
        )}
      </div>
      {model.budgetReserved !== undefined &&
        [
          "GENERATING_BANNER",
          "BANNER",
          "GENERATING_PORTRAIT",
          "PORTRAIT",
          "GENERATING_SCENES",
          "SCENES",
          "READY",
          "ACTIVE",
        ].includes(model.stage) && (
          <span className="type-caption">
            Artwork reserved · €{(model.budgetReserved / 100).toFixed(2)} / €15
          </span>
        )}
    </Footer>
  );
  if (!season)
    return (
      <main className="season-onboarding-candidate" data-stage={model.stage}>
        <header className="guided-topbar">
          <span className="type-overline">Become · A new Season</span>
          <span className="type-caption" role="status">
            {demo
              ? "Interactive preview · sample data · no AI calls"
              : savedLabel}
          </span>
        </header>
        <div className="guided-progress">
          <p className="type-caption">
            {stageLabels[model.stage]}
            {model.stage === "SCENES" || model.stage === "GENERATING_SCENES"
              ? ` · Chapter ${model.chapter} of 7`
              : ""}
          </p>
          <ProgressIndicator
            variant="plasma-core"
            area="direction"
            value={model.progress}
            max={ONBOARDING_MILESTONES}
            label={`${model.progress} of ${ONBOARDING_MILESTONES} Season milestones completed`}
          />
        </div>
        {model.stage !== "ASSEMBLING" && (
          <h1
            ref={title}
            tabIndex={-1}
            className={`${model.stage === "ENTRY" ? "type-season-entry-title" : "type-page-title"} guided-title`}
          >
            <span>Who will inspire</span> <span>this Season?</span>
          </h1>
        )}
        {content}
        {footer}
      </main>
    );
  return (
    <SeasonRitualLayout
      split={Boolean(step)}
      paused={motionPaused}
      contentKey={`${model.stage}:${correcting}`}
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
            {showMotionControls && (
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={motionPaused}
                aria-controls="opening-layout-content"
                onClick={() => setMotionPaused((value) => !value)}
              >
                {motionPaused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {motionPaused ? "Resume motion" : "Pause motion"}
              </Button>
            )}
            <span
              className="opening-save-status type-caption"
              role="status"
              data-save-state={
                model.busy
                  ? "saving"
                  : localDraft && ["ENTRY", "WORLD"].includes(model.stage)
                    ? "local"
                    : "saved"
              }
              data-failed={Boolean(draftError)}
            >
              {draftError
                ? "Draft not saved"
                : model.busy
                  ? "Saving…"
                  : localDraft && ["ENTRY", "WORLD"].includes(model.stage)
                    ? "Draft on this device"
                    : "Saved to your Season"}
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
        preparation || (model.stage === "ASSEMBLING" && !stopped)
          ? null
          : footer
      }
    >
      {step && (
        <StepIndicator
          items={progress.preparation}
          label="Character preparation"
        />
      )}
      <div
        className={
          step
            ? "opening-step-content connected-season-preparation"
            : "connected-season-imagery"
        }
        data-stage={model.stage}
      >
        {!step &&
          model.stage !== "READY" &&
          model.stage !== "ASSEMBLING" &&
          !preparation && (
            <h1
              ref={title}
              tabIndex={-1}
              className={`${model.stage === "ENTRY" ? "type-season-entry-title" : "type-page-title"} guided-title`}
            >
              <span>Who will inspire</span> <span>this Season?</span>
            </h1>
          )}
        {imageryControls}
        {content}
      </div>
    </SeasonRitualLayout>
  );
}
