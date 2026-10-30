"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  ImageIcon,
  Layers3,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Badge } from "@/components/ui/badges/badge.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { FieldLabel } from "@/components/ui/forms/field.component";
import {
  Checkbox,
  SelectionCopy,
  SelectionLabel,
} from "@/components/ui/forms/selection.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { ResizableViewport } from "@/components/ui/viewport-preview/components/resizable-viewport.component";
import {
  PHONE_ARTWORK_VIEWPORT,
  type ViewportSize,
} from "@/components/ui/viewport-preview/config/resizable-viewport.config";
import { LivingReferencePrompt } from "@/features/seasons/living/components/living-reference-prompt.component";
import { LivingCharacterBannerEditor } from "@/features/seasons/living/components/living-character-banner-editor.component";
import { CharacterStepRail } from "@/components/ui/character-step-rail/character-step-rail.component";
import { CharacterAvatarEditor } from "@/components/ui/character-avatar/character-avatar-editor.component";
import { CharacterBanner } from "@/components/ui/character-banner/character-banner.component";
import { CharacterWorkspacePreview } from "@/features/seasons/living/character-workspace/components/character-workspace.component";
import {
  LIVING_LEVI_BANNER_EXAMPLE,
  isLeviBannerExampleSubject,
} from "@/features/seasons/living/constants/living-character-banner-example.constants";
import type { getLivingSeasonPack } from "@/features/seasons/living/queries/living-season.query";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import type { VisualIntent } from "@/features/seasons/living/image-direction/schemas/visual-intent.schema";
import { desktopArtworkFocusStyle } from "@/features/seasons/living/utils/living-artwork-focus.util";
import "../styles/living-season-editor.css";

type PackView = NonNullable<Awaited<ReturnType<typeof getLivingSeasonPack>>>;
const states = ["ON_TRACK", "NEUTRAL", "FAR_BEHIND"] as const;
export type EditorStage =
  "character" | "world" | "reference" | "banner" | "scenes" | "activation";
const editorStages = [
  {
    id: "character",
    label: "Character",
    detail: "Identity and source-grounded voice",
  },
  { id: "world", label: "World & mood", detail: "Setting and visual intent" },
  {
    id: "reference",
    label: "References",
    detail: "Originals and identity sheet",
  },
  {
    id: "banner",
    label: "Banner & portrait",
    detail: "Character artwork and copy",
  },
  { id: "scenes", label: "Scenes", detail: "42 evolving compositions" },
  {
    id: "activation",
    label: "Review & activate",
    detail: "Human review before activation",
  },
] as const;
const emptyVisualIntent: VisualIntent = {
  feeling: "",
  demeanor: "",
  anchors: "",
  atmosphere: "",
  avoid: "",
};
const stateLabels = {
  ON_TRACK: "On track",
  NEUTRAL: "Neutral",
  FAR_BEHIND: "Far behind",
} as const;
const stateDescriptions = {
  ON_TRACK: "Momentum is visible in the world and in the character.",
  NEUTRAL: "Progress is uncertain; the scene holds unfinished work.",
  FAR_BEHIND:
    "The cost of delay appears without changing the character's nature.",
} as const;

function startingProfile(pack: PackView): LivingCharacterProfile {
  return (
    pack.profile ?? {
      characterName: pack.identity?.displayName ?? "",
      sourceWork: pack.identity?.sourceWork ?? "",
      adaptation: pack.identity?.adaptation ?? "",
      outputLanguage: "en",
      sources: [{ id: "source-1", title: "", notes: "" }],
      speechPatterns: [{ description: "", sourceIds: ["source-1"] }],
      signaturePhrases: [],
      canonReferences: [],
      responseToSuccess: "",
      responseToSetback: "",
      responseToRecovery: "",
      visualDirection: "",
      visualBoundaries: "",
    }
  );
}

function startingVisualIntent(pack: PackView): VisualIntent {
  if (!pack.visualIntent) return emptyVisualIntent;
  return {
    ...(pack.visualIntent.productionBrief
      ? { productionBrief: pack.visualIntent.productionBrief }
      : {}),
    ...(pack.visualIntent.ownerDirection !== undefined
      ? { ownerDirection: pack.visualIntent.ownerDirection }
      : {}),
    feeling: pack.visualIntent.feeling,
    demeanor: pack.visualIntent.demeanor,
    anchors: pack.visualIntent.anchors,
    atmosphere: pack.visualIntent.atmosphere,
    avoid: pack.visualIntent.avoid,
  };
}

type PromptPackage = NonNullable<PackView["referencePromptPackage"]>;

function promptPackageForClipboard(imagePackage: PromptPackage) {
  return JSON.stringify(imagePackage, null, 2);
}

export function LivingSeasonEditor({
  year,
  quarter,
  initialPack,
  initialStage,
  initialChapter,
  embeddedInOpening = false,
  showBannerExample = false,
  identityControls,
  onActivated,
}: {
  year: number;
  quarter: number;
  initialPack: PackView;
  initialStage?: EditorStage;
  initialChapter?: number;
  embeddedInOpening?: boolean;
  showBannerExample?: boolean;
  identityControls?: ReactNode;
  onActivated?: () => void;
}) {
  const { play } = useInterfaceSound();
  const [pack, setPack] = useState(initialPack);
  const [setting, setSetting] = useState(initialPack.setting);
  const [brief, setBrief] = useState(initialPack.visualBrief);
  const [profile, setProfile] = useState<LivingCharacterProfile>(() =>
    startingProfile(initialPack),
  );
  const [visualIntent, setVisualIntent] = useState<VisualIntent>(() =>
    startingVisualIntent(initialPack),
  );
  const [stage, setStage] = useState<EditorStage>(initialStage ?? "character");
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const stageNavRef = useRef<HTMLDivElement>(null);
  const referenceUploadInputRef = useRef<HTMLInputElement>(null);
  const [chapter, setChapter] = useState(initialChapter ?? 1);
  const [state, setState] = useState<(typeof states)[number]>("NEUTRAL");
  const [phoneSize, setPhoneSize] = useState<ViewportSize>(
    PHONE_ARTWORK_VIEWPORT.initialSize,
  );
  const [focalDraft, setFocalDraft] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [likenessChecks, setLikenessChecks] = useState<Record<string, boolean>>(
    {},
  );
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mobileChecks, setMobileChecks] = useState<Record<string, boolean>>({});

  function openStage(next: EditorStage, scrollToStage = false) {
    if (next !== stage) play("controlConfirmed");
    setStage(next);
    if (scrollToStage)
      stageNavRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  async function command(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/direction/seasons/living", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, year, quarter, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(result.error ?? "Could not save this change.");
      }
      setPack(result.pack);
      if (action === "draft-profile") setProfile(startingProfile(result.pack));
      setMessage(
        action === "activate"
          ? "Living Season is active."
          : action === "draft-visual-intent"
            ? "Visual intent drafted. Review every field before approval."
            : action === "save-visual-intent"
              ? "Visual intent saved as a new version."
              : action === "approve-visual-intent"
                ? "Visual intent approved for image packages."
                : "Saved.",
      );
      play("saveConfirmed");
      return result.pack as PackView;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this change.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyPromptPackage(imagePackage: PromptPackage) {
    setError("");
    try {
      await navigator.clipboard.writeText(
        promptPackageForClipboard(imagePackage),
      );
      setMessage("Prompt package copied with its receipt and references.");
      play("controlConfirmed");
    } catch {
      setError("Could not copy this prompt package. Try again.");
      play("actionBlocked");
    }
  }

  async function upload(slot: PackView["slots"][number], file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set(
        "input",
        JSON.stringify({
          year,
          quarter,
          slot: {
            chapter: slot.chapter,
            state: slot.state,
            format: slot.format,
          },
          promptReceipt: slot.promptPackage?.receipt,
        }),
      );
      const response = await fetch("/api/direction/seasons/living/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(result.error ?? "Could not upload artwork.");
      }
      setPack(result.pack);
      setMessage(`${slot.format.toLowerCase()} artwork uploaded for review.`);
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload artwork.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadReference(file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set(
        "input",
        JSON.stringify({
          year,
          quarter,
          kind: "reference",
          promptReceipt: pack.referencePromptPackage?.receipt,
        }),
      );
      const response = await fetch("/api/direction/seasons/living/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(
          result.error ?? "Could not upload the reference sheet.",
        );
      }
      setPack(result.pack);
      setMessage(
        "Reference sheet uploaded for review. Scene artwork must match it.",
      );
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not upload the reference sheet.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadSourceReference(file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set(
        "input",
        JSON.stringify({
          year,
          quarter,
          kind: "source-image",
          label:
            sourceLabel.trim() ||
            `${pack.identity?.displayName} authentic source image`,
          ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
        }),
      );
      const response = await fetch("/api/direction/seasons/living/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not upload this source image.");
      setPack(result.pack);
      setMessage("Source image added for identity review.");
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not upload this source image.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generate(
    slot: PackView["slots"][number],
    resolution: "1K" | "2K",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/direction/seasons/living/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          quarter,
          slot: {
            chapter: slot.chapter,
            state: slot.state,
            format: slot.format,
          },
          resolution,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(result.error ?? "Could not generate artwork.");
      }
      setPack(result.pack);
      setMessage(`${resolution} draft generated. Review it before approving.`);
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not generate artwork.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateReference() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/direction/seasons/living/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, quarter, kind: "reference" }),
      });
      const result = await response.json();
      if (!response.ok) {
        play("actionBlocked");
        throw new Error(
          result.error ?? "Could not generate the reference sheet.",
        );
      }
      setPack(result.pack);
      setMessage(
        "Reference sheet generated. Review the character and setting before approval.",
      );
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not generate the reference sheet.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadBanner(
    bannerKind: "desktop" | "phone" | "avatar",
    file: File,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set(
        "input",
        JSON.stringify({
          year,
          quarter,
          kind: "banner",
          bannerKind,
          promptReceipt: pack.bannerPromptPackages[bannerKind]?.receipt,
        }),
      );
      const response = await fetch("/api/direction/seasons/living/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not upload character artwork.");
      setPack(result.pack);
      setMessage(`${bannerKind} image uploaded for review.`);
      play("saveConfirmed");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not upload character artwork.",
      );
      play("actionBlocked");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function generateBanner(bannerKind: "desktop" | "phone" | "avatar") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/direction/seasons/living/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          quarter,
          kind: "banner",
          bannerKind,
          resolution: "2K",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Could not generate character artwork.",
        );
      setPack(result.pack);
      setMessage(`${bannerKind} image generated for review.`);
      play("saveConfirmed");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not generate character artwork.",
      );
      play("actionBlocked");
    } finally {
      setBusy(false);
    }
  }

  if (!pack.identity)
    return (
      <main className="living-editor living-editor-empty">
        <EmptyState
          pattern="editorial-canvas"
          area="direction"
          eyebrow={`Season ${quarter} / ${year}`}
          title="A world needs its character"
          description="Choose a Character of the Season first. Their identity guides every expression, scene and message in this pack."
          action={
            <Link
              className="become-button become-button--primary"
              href={`/direction/seasons/${year}/${quarter}`}
            >
              Choose character <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
      </main>
    );

  const currentSlots = pack.slots.filter(
    (slot) => slot.chapter === chapter && slot.state === state,
  );
  const heroArtwork =
    currentSlots.find((slot) => slot.format === "DESKTOP")?.previewHref ??
    pack.referenceHref;
  const chapterApproved = (chapterNumber: number) =>
    pack.slots.filter(
      (slot) => slot.chapter === chapterNumber && slot.latestApproved,
    ).length;
  const stateApproved = (selectedState: (typeof states)[number]) =>
    pack.slots.filter(
      (slot) =>
        slot.chapter === chapter &&
        slot.state === selectedState &&
        slot.latestApproved,
    ).length;
  const readyToActivate =
    pack.originalsApproved > 0 &&
    pack.approvedCount === 42 &&
    pack.profileApproved &&
    Boolean(pack.visualIntent?.approved) &&
    (pack.referenceMode === "ORIGINALS" || pack.referenceApproved) &&
    Boolean(pack.banner?.approved);
  const savedVisualIntent = startingVisualIntent(pack);
  const visualIntentDirty =
    JSON.stringify(visualIntent) !== JSON.stringify(savedVisualIntent);
  const visualIntentNeedsRefresh = Boolean(
    pack.visualIntent && !pack.visualIntent.current,
  );
  const visualIntentComplete = (
    ["feeling", "demeanor", "anchors", "atmosphere", "avoid"] as const
  ).every((key) => visualIntent[key].trim().length >= 8);
  const bannerExample =
    showBannerExample &&
    !pack.banner?.approved &&
    isLeviBannerExampleSubject(profile)
      ? LIVING_LEVI_BANNER_EXAMPLE
      : null;
  const bannerExampleShown = Boolean(
    bannerExample &&
    (!pack.banner?.desktopHref ||
      !pack.banner?.phoneHref ||
      !pack.banner?.avatarHref ||
      !pack.banner?.quote ||
      !pack.banner?.attribution ||
      !pack.banner?.rightLine),
  );
  const Container = embeddedInOpening ? "div" : "main";
  return (
    <Container
      className="living-editor space-overview"
      data-embedded={embeddedInOpening || undefined}
    >
      <header className="living-editor-hero">
        {heroArtwork && (
          <Image
            src={heroArtwork}
            alt=""
            fill
            unoptimized
            priority
            sizes="100vw"
            className="living-editor-hero-art"
          />
        )}
        <div className="living-editor-hero-content">
          <div className="living-editor-hero-topline">
            <span className="type-overline">
              Season {quarter} / {year} &nbsp;·&nbsp; Living Season Studio
            </span>
            <Badge variant="specimen-strip" area="direction">
              {pack.active ? "Active" : "Draft"}
            </Badge>
          </div>
          <div className="living-editor-hero-title">
            <IconFrame treatment="featured" area="direction">
              <Sparkles />
            </IconFrame>
            <div>
              <h1 className="type-page-title">
                Build {pack.identity.displayName}&apos;s world
              </h1>
              <p className="type-body">
                One character. Seven chapters. A world that responds to real
                progress.
              </p>
            </div>
          </div>
          <div className="living-editor-hero-bottom">
            <div>
              <strong className="type-metric-md">
                {pack.approvedCount}
                <span> / 42</span>
              </strong>
              <span className="type-label">compositions reviewed</span>
            </div>
            <ProgressIndicator
              value={pack.approvedCount}
              max={42}
              label={`${pack.approvedCount} of 42 artwork compositions approved`}
              variant="season-ticks"
              area="direction"
            />
          </div>
        </div>
      </header>
      <div ref={stageNavRef}>
        <CharacterStepRail
          steps={editorStages}
          selectedId={stage}
          onSelect={(next) => setStage(next)}
          ariaLabel="Season onboarding steps"
        />
      </div>
      {error && (
        <p className="living-editor-error type-body" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="living-editor-success type-body" role="status">
          {message}
        </p>
      )}

      {stage === "world" && (
        <Card
          spacing="action"
          className="living-editor-panel living-editor-world"
          aria-labelledby="living-setting-title"
        >
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">02 / World & mood</p>
              <h2 className="type-section-title" id="living-setting-title">
                The world behind the character
              </h2>
              <p className="type-body-sm">
                The place evolves with the Season. A change here starts a new
                draft and sends its artwork back for review.
              </p>
            </div>
            <IconFrame treatment="featured" area="direction">
              <Layers3 />
            </IconFrame>
          </div>
          <div className="living-editor-fields">
            <FieldLabel>
              Setting
              <Input
                value={setting}
                onChange={(event) => setSetting(event.target.value)}
                placeholder="A warm bakery, a city rooftop, a mountain valley…"
              />
            </FieldLabel>
            <FieldLabel>
              Visual direction
              <Textarea
                size="md"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Describe the atmosphere, visual style, and how this place evolves."
              />
            </FieldLabel>
          </div>
          <Button
            disabled={busy}
            onClick={() => command("setup", { setting, visualBrief: brief })}
          >
            Save setting
          </Button>
        </Card>
      )}

      {stage === "character" && (
        <div className="living-editor-character-stage">
          {identityControls}
          <Card spacing="dense">
            <div className="living-editor-actions">
              <Button
                disabled={busy}
                onClick={() =>
                  command(
                    "draft-profile",
                    pack.profile ? { sources: pack.profile.sources } : {},
                  )
                }
              >
                <WandSparkles aria-hidden="true" /> Draft character with AI
              </Button>
              <p className="type-body-sm">
                AI uses retrieved biography and your saved source notes. Missing
                evidence stays explicit; review the draft before approval.
              </p>
            </div>
          </Card>
          <CharacterWorkspacePreview
            key={pack.profileId ?? "new-profile"}
            initialProfile={profile}
            showBanner={false}
            year={year}
            quarter={quarter}
            version={pack.profileVersion ?? 0}
            approved={pack.profileApproved}
            active={pack.active}
            responseAvailable={pack.responseAvailable}
            busy={busy}
            profileId={pack.profileId}
            candidateArt={{
              desktopSrc: pack.banner?.desktopHref ?? bannerExample?.desktopSrc,
              phoneSrc: pack.banner?.phoneHref ?? bannerExample?.phoneSrc,
              avatarSrc: pack.banner?.avatarHref ?? bannerExample?.avatarSrc,
              alt: bannerExampleShown
                ? (bannerExample?.alt ??
                  `${profile.characterName} character banner`)
                : `${profile.characterName} character banner`,
              quote: pack.banner?.quote || bannerExample?.quote || "",
              attribution:
                pack.banner?.attribution || bannerExample?.attribution || "",
              rightLine:
                pack.banner?.rightLine || bannerExample?.rightLine || "",
              crop: pack.banner?.crop,
            }}
            onSaveProfile={async (nextProfile) => {
              const saved = await command("save-profile", {
                profile: nextProfile,
                expectedProfileVersion: pack.profileVersion ?? 0,
              });
              if (saved) setProfile(nextProfile);
              return Boolean(saved);
            }}
            onApproveProfile={async (profileId) =>
              Boolean(await command("approve-profile", { profileId }))
            }
          />
        </div>
      )}
      {stage === "banner" && (
        <div className="living-editor-character-stage">
          <CharacterBanner
            content={{
              name: pack.identity.displayName,
              sourceWork: pack.identity.sourceWork,
              adaptation: pack.identity.adaptation,
              desktopSrc: pack.banner?.desktopHref ?? bannerExample?.desktopSrc,
              phoneSrc: pack.banner?.phoneHref ?? bannerExample?.phoneSrc,
              quote: pack.banner?.quote,
              attribution: pack.banner?.attribution,
              rightLine: pack.banner?.rightLine,
            }}
          />
          {pack.banner?.avatarHref && (
            <Button
              variant="secondary"
              onClick={() => setAvatarEditorOpen(true)}
            >
              Adjust portrait placement
            </Button>
          )}
          {avatarEditorOpen && pack.banner?.avatarHref && (
            <CharacterAvatarEditor
              name={pack.identity.displayName}
              source={pack.banner.avatarHref}
              generatedSource={pack.banner.avatarHref}
              placement={pack.banner.crop}
              onClose={() => setAvatarEditorOpen(false)}
              onApply={async (_source, placement, file) => {
                if (file && !(await uploadBanner("avatar", file))) return false;
                return Boolean(await command("save-banner-crop", placement));
              }}
            />
          )}
          <LivingCharacterBannerEditor
            key={pack.banner?.revision ?? 0}
            banner={pack.banner}
            promptPackages={pack.bannerPromptPackages}
            busy={busy}
            profileApproved={pack.profileApproved}
            referenceApproved={
              (pack.referenceMode === "ORIGINALS" || pack.referenceApproved) &&
              Boolean(pack.visualIntent?.approved)
            }
            onSave={async (copy) =>
              Boolean(await command("save-banner-copy", copy))
            }
            onUpload={uploadBanner}
            onCopyPackage={copyPromptPackage}
            onGenerate={generateBanner}
            onApprove={async () => {
              await command("approve-banner", {
                characterLikenessConfirmed: true,
              });
            }}
          />
        </div>
      )}

      {stage === "world" && pack.profileApproved && (
        <Card
          spacing="action"
          className="living-editor-panel"
          aria-labelledby="living-intent-title"
        >
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">02 / Visual intent</p>
              <h2 className="type-section-title" id="living-intent-title">
                Decide how this character should feel
              </h2>
              <p className="type-body-sm">
                Keep expression, atmosphere, and visual anchors true to the
                reviewed character. This approved brief guides every reference,
                banner, portrait, and scene package.
              </p>
            </div>
            <Badge variant="specimen-strip" area="direction">
              {pack.visualIntent?.approved
                ? `Approved v${pack.visualIntent.version}`
                : visualIntentNeedsRefresh
                  ? `Refresh v${pack.visualIntent?.version}`
                  : pack.visualIntent
                    ? `Draft v${pack.visualIntent.version}`
                    : "Needed"}
            </Badge>
          </div>

          {pack.visualIntentMissing.length ? (
            <Card as="div" material="solid" spacing="dense">
              <p className="type-label">Source evidence needed</p>
              <ul className="living-editor-review-points type-body-sm">
                {pack.visualIntentMissing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="living-editor-fields">
            <FieldLabel>
              Feeling
              <Textarea
                size="md"
                maxLength={500}
                value={visualIntent.feeling}
                onChange={(event) =>
                  setVisualIntent((current) => ({
                    ...current,
                    feeling: event.target.value,
                  }))
                }
                placeholder="Describe the emotional quality the artwork should carry."
              />
            </FieldLabel>
            <FieldLabel>
              Demeanor
              <Textarea
                size="md"
                maxLength={500}
                value={visualIntent.demeanor}
                onChange={(event) =>
                  setVisualIntent((current) => ({
                    ...current,
                    demeanor: event.target.value,
                  }))
                }
                placeholder="Describe characteristic expression, posture, and presence."
              />
            </FieldLabel>
            <FieldLabel>
              Identity anchors
              <Textarea
                size="md"
                maxLength={800}
                value={visualIntent.anchors}
                onChange={(event) =>
                  setVisualIntent((current) => ({
                    ...current,
                    anchors: event.target.value,
                  }))
                }
                placeholder="Name recognizable features, objects, clothing, and recurring motifs."
              />
            </FieldLabel>
            <FieldLabel>
              Atmosphere
              <Textarea
                size="md"
                maxLength={500}
                value={visualIntent.atmosphere}
                onChange={(event) =>
                  setVisualIntent((current) => ({
                    ...current,
                    atmosphere: event.target.value,
                  }))
                }
                placeholder="Describe the light, texture, environment, and energy that fit."
              />
            </FieldLabel>
            <FieldLabel>
              Avoid
              <Textarea
                size="md"
                maxLength={800}
                value={visualIntent.avoid}
                onChange={(event) =>
                  setVisualIntent((current) => ({
                    ...current,
                    avoid: event.target.value,
                  }))
                }
                placeholder="Record caricatures, generic moods, and visual choices that would feel false."
              />
            </FieldLabel>
          </div>

          <div className="living-editor-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || pack.visualIntentMissing.length > 0}
              onClick={async () => {
                const saved = await command("draft-visual-intent");
                if (saved) setVisualIntent(startingVisualIntent(saved));
              }}
            >
              <WandSparkles aria-hidden="true" /> Draft from reviewed sources
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={
                busy ||
                (!visualIntentDirty && !visualIntentNeedsRefresh) ||
                !visualIntentComplete ||
                pack.visualIntentMissing.length > 0
              }
              onClick={async () => {
                const saved = await command("save-visual-intent", {
                  visualIntent,
                });
                if (saved) setVisualIntent(startingVisualIntent(saved));
              }}
            >
              Save visual intent
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                visualIntentDirty ||
                !pack.visualIntent ||
                !pack.visualIntent.current ||
                pack.visualIntent.approved ||
                pack.visualIntentMissing.length > 0
              }
              onClick={async () => {
                const saved = await command("approve-visual-intent");
                if (saved) setVisualIntent(startingVisualIntent(saved));
              }}
            >
              Approve visual intent <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <p className="type-caption">
            AI drafting requires the assigned C.O.T.S. visual-intent model and
            credential. Manual editing and saving remain available.
          </p>
        </Card>
      )}
      {stage === "world" && !pack.profileApproved && (
        <Card spacing="action" className="living-editor-gate">
          <EmptyState
            pattern="editorial-canvas"
            area="direction"
            size="compact"
            title="Approve the character first"
            description="Visual intent must be grounded in the latest reviewed character profile before it can be drafted or approved."
            action={
              <Button onClick={() => openStage("character", true)}>
                Review character <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
        </Card>
      )}

      {stage === "reference" && (
        <Card spacing="action" className="living-editor-panel">
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">03 / Authentic character images</p>
              <h2 className="type-section-title">
                Keep the real character in every image
              </h2>
              <p className="type-body-sm">
                Verify these images depict {pack.identity.displayName} from{" "}
                {pack.identity.sourceWork} · {pack.identity.adaptation}.
                Catalogue images can mix adaptations; choose up to two true
                originals. They remain attached to every image package.
              </p>
            </div>
            <Badge variant="specimen-strip" area="direction">
              {pack.originalsApproved} / 2 confirmed
            </Badge>
          </div>
          <div className="living-editor-fields">
            {pack.sourceImages.map((image) => (
              <Card key={image.id} spacing="dense" material="solid">
                <div className="living-editor-reference-preview">
                  <Image
                    src={image.href}
                    alt={image.label}
                    fill
                    unoptimized
                    sizes="(max-width: 900px) 90vw, 40vw"
                  />
                </div>
                <p className="type-label">{image.label}</p>
                {image.sourceUrl && (
                  <a
                    className="type-caption"
                    href={image.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source ↗
                  </a>
                )}
                <SelectionLabel>
                  <Checkbox
                    checked={Boolean(likenessChecks[image.id])}
                    onChange={(event) =>
                      setLikenessChecks((prior) => ({
                        ...prior,
                        [image.id]: event.target.checked,
                      }))
                    }
                  />
                  <SelectionCopy>
                    This depicts the confirmed character and adaptation.
                  </SelectionCopy>
                </SelectionLabel>
                <div className="living-editor-actions">
                  <Button
                    disabled={
                      busy ||
                      image.approved ||
                      !likenessChecks[image.id] ||
                      pack.originalsApproved >= 2
                    }
                    onClick={() =>
                      command("approve-source-image", {
                        imageId: image.id,
                        characterLikenessConfirmed: true,
                      })
                    }
                  >
                    {image.approved ? "Confirmed original" : "Confirm image"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      command("retire-source-image", { imageId: image.id })
                    }
                  >
                    Retire reference
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="living-editor-fields">
            <FieldLabel>
              Image label
              <Input
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                placeholder="Official character art or an authentic frame"
              />
            </FieldLabel>
            <FieldLabel>
              Source link — optional
              <Input
                value={sourceUrl}
                type="url"
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://…"
              />
            </FieldLabel>
            <FieldLabel>
              Upload an authentic image
              <Input
                type="file"
                disabled={busy}
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadSourceReference(file);
                  event.target.value = "";
                }}
              />
            </FieldLabel>
          </div>
        </Card>
      )}

      {stage === "reference" && pack.profileVersion && (
        <Card
          spacing="action"
          className="living-editor-panel"
          aria-labelledby="living-reference-title"
        >
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">03 / Visual anchor</p>
              <h2 className="type-section-title" id="living-reference-title">
                One identity across every scene
              </h2>
              <p className="type-body-sm">
                Review the character, expressions and setting together. The 42
                compositions inherit this visual anchor.
              </p>
            </div>
            <Badge variant="specimen-strip" area="direction">
              {pack.referenceApproved
                ? "Approved"
                : pack.referenceId
                  ? "Needs review"
                  : "Needed"}
            </Badge>
          </div>
          <div className="living-editor-reference-grid">
            <div className="living-editor-reference-preview">
              {pack.referenceHref ? (
                <Image
                  src={pack.referenceHref}
                  alt={`${pack.identity.displayName} visual reference sheet`}
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 900px"
                />
              ) : (
                <span className="type-body-sm">No reference sheet yet</span>
              )}
            </div>
            <Card
              as="div"
              material="solid"
              spacing="dense"
              className="living-editor-reference-workflow"
            >
              <p className="type-overline">Review before approval</p>
              <ul className="living-editor-review-points type-body-sm">
                <li>Same recognizable face, proportions and costume.</li>
                <li>
                  Expressions fit the character rather than one generic mood.
                </li>
                <li>
                  The setting can evolve in all three progress conditions.
                </li>
              </ul>
              {!pack.profileApproved && (
                <Card
                  as="div"
                  spacing="dense"
                  className="living-editor-reference-prerequisite"
                >
                  <p className="type-label">Profile approval pending</p>
                  <p className="type-body-sm">
                    You can upload a draft reference now. Approve the Character
                    profile before approving this sheet or using API generation.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openStage("character", true)}
                  >
                    Review character <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              )}
              {!pack.visualIntent?.approved && (
                <Card
                  as="div"
                  spacing="dense"
                  className="living-editor-reference-prerequisite"
                >
                  <p className="type-label">Visual intent approval pending</p>
                  <p className="type-body-sm">
                    Approve the grounded visual-intent brief before generating
                    or approving this Season&apos;s reference sheet.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openStage("world", true)}
                  >
                    Review visual intent <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              )}
              <SelectionLabel>
                <Checkbox
                  checked={Boolean(likenessChecks[pack.referenceId ?? ""])}
                  onChange={(event) =>
                    setLikenessChecks((prior) => ({
                      ...prior,
                      [pack.referenceId ?? ""]: event.target.checked,
                    }))
                  }
                />
                <SelectionCopy>
                  I compared this sheet with the original images: same
                  character, face, proportions, and adaptation.
                </SelectionCopy>
              </SelectionLabel>
              <div className="living-editor-action-stack">
                <Button
                  type="button"
                  variant={
                    !pack.profileApproved || !pack.referenceId
                      ? "primary"
                      : "secondary"
                  }
                  disabled={busy || !pack.referencePromptPackage}
                  onClick={() => referenceUploadInputRef.current?.click()}
                >
                  <ImageIcon aria-hidden="true" /> Upload reference sheet
                </Button>
                <input
                  ref={referenceUploadInputRef}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReference(file);
                    event.target.value = "";
                  }}
                />
                <p className="type-caption">
                  PNG, JPEG, WebP or AVIF. Choose a wide character reference
                  sheet.
                </p>
                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    !pack.profileApproved ||
                    !pack.visualIntent?.approved ||
                    !pack.originalsApproved
                  }
                  onClick={generateReference}
                >
                  <WandSparkles aria-hidden="true" /> Generate 2K reference
                </Button>
                <Button
                  variant={
                    pack.profileApproved &&
                    pack.visualIntent?.approved &&
                    pack.referenceId &&
                    !pack.referenceApproved
                      ? "primary"
                      : "secondary"
                  }
                  disabled={
                    busy ||
                    !pack.profileApproved ||
                    !pack.visualIntent?.approved ||
                    !pack.referenceId ||
                    pack.referenceApproved ||
                    !likenessChecks[pack.referenceId ?? ""]
                  }
                  onClick={() =>
                    command("approve-reference", {
                      referenceId: pack.referenceId,
                      characterLikenessConfirmed:
                        likenessChecks[pack.referenceId ?? ""],
                    })
                  }
                >
                  Approve reference <ArrowRight aria-hidden="true" />
                </Button>
              </div>
              <LivingReferencePrompt
                prompt={pack.referencePrompt}
                document={pack.referencePromptDocument}
                promptPackage={pack.referencePromptPackage}
                customized={pack.referencePromptCustomized}
                busy={busy}
                error={error}
                onSave={async (document) =>
                  Boolean(
                    await command("save-reference-prompt", {
                      document,
                      expectedBriefRevision: pack.briefRevision,
                    }),
                  )
                }
              />
            </Card>
          </div>
        </Card>
      )}
      {stage === "reference" && !pack.profileVersion && (
        <Card spacing="action" className="living-editor-gate">
          <EmptyState
            pattern="editorial-canvas"
            area="direction"
            size="compact"
            title="Character profile first"
            description="Save a source-grounded character profile before preparing its visual reference."
            action={
              <Button onClick={() => openStage("character", true)}>
                Open character profile <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
        </Card>
      )}

      {stage === "scenes" && pack.profileVersion && (
        <section
          className="living-editor-scenes"
          aria-labelledby="living-art-title"
        >
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">05 / Scene gallery</p>
              <h2 className="type-section-title" id="living-art-title">
                Review the world as it changes
              </h2>
              <p className="type-body-sm">
                Each chapter has three progress conditions. Review the desktop
                and phone composition together before moving on.
              </p>
            </div>
            <Badge variant="specimen-strip" area="direction">
              {pack.approvedCount} / 42 approved
            </Badge>
          </div>
          <Card as="div" spacing="dense" className="living-editor-scene-nav">
            <div className="living-editor-scene-nav-head">
              <span className="type-label">Chapter</span>
              <span className="type-caption">
                Seven moments across the Season
              </span>
            </div>
            <div
              className="living-editor-chapters"
              role="group"
              aria-label="Artwork chapter"
            >
              {Array.from({ length: 7 }, (_, i) => i + 1).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={chapter === item ? "primary" : "secondary"}
                  className="living-editor-chapter"
                  aria-pressed={chapter === item}
                  onClick={() => {
                    if (chapter !== item) play("controlConfirmed");
                    setChapter(item);
                  }}
                >
                  <span className="type-system">
                    {String(item).padStart(2, "0")}
                  </span>
                  <span className="type-caption">
                    {chapterApproved(item)}/6
                  </span>
                </Button>
              ))}
            </div>
            <div className="living-editor-scene-nav-head">
              <span className="type-label">Progress condition</span>
              <span className="type-caption">Chapter {chapter} / 7</span>
            </div>
            <div
              className="living-editor-states"
              role="group"
              aria-label="Season progress condition"
            >
              {states.map((item) => (
                <Button
                  key={item}
                  variant="secondary"
                  className="living-editor-state"
                  data-active={state === item}
                  data-scene-state={item.toLowerCase()}
                  aria-pressed={state === item}
                  onClick={() => {
                    if (state !== item) play("controlConfirmed");
                    setState(item);
                  }}
                >
                  <span className="type-label">{stateLabels[item]}</span>
                  <small className="type-caption">
                    {stateDescriptions[item]}
                  </small>
                  <strong className="type-system">
                    {stateApproved(item)}/2
                  </strong>
                </Button>
              ))}
            </div>
          </Card>
          <div className="living-editor-review-heading">
            <div>
              <p className="type-overline">
                Chapter {String(chapter).padStart(2, "0")} /{" "}
                {stateLabels[state]}
              </p>
              <h3 className="type-widget-title">
                A matched pair, two compositions
              </h3>
            </div>
            <span className="type-caption">
              {stateApproved(state)} of 2 ready
            </span>
          </div>
          <div className="living-editor-art-grid">
            {currentSlots.map((slot) => (
              <Card
                as="article"
                className="living-editor-art"
                key={slot.format}
              >
                <div className="living-editor-art-head">
                  <div>
                    <p className="type-overline">
                      {slot.format === "MOBILE"
                        ? "02 / Narrow composition"
                        : "01 / Wide composition"}
                    </p>
                    <h4 className="type-widget-title">
                      {slot.format === "MOBILE" ? "Phone" : "Desktop"}
                    </h4>
                  </div>
                  <Badge variant="specimen-strip" area="direction">
                    {slot.latestApproved
                      ? "Approved"
                      : slot.latestId
                        ? "Needs review"
                        : "No image"}
                  </Badge>
                </div>
                {slot.format === "MOBILE" ? (
                  <ResizableViewport
                    size={phoneSize}
                    onSizeChange={setPhoneSize}
                    className="living-editor-phone-viewport"
                  >
                    {slot.previewHref ? (
                      <Image
                        src={slot.previewHref}
                        alt={`${pack.identity?.displayName} chapter ${chapter} ${state.toLowerCase()} mobile artwork`}
                        fill
                        unoptimized
                        sizes={`${phoneSize.width}px`}
                      />
                    ) : (
                      <EmptyState
                        pattern="editorial-canvas"
                        area="direction"
                        size="compact"
                        title="No composition yet"
                        description="Generate or upload a finished scene for this state."
                      />
                    )}
                    {slot.previewHref && (
                      <span className="living-editor-preview-copy type-label">
                        Talk to your C.O.T.S <strong>ASK ME ANYTHING</strong>
                      </span>
                    )}
                  </ResizableViewport>
                ) : (
                  <div className="living-editor-preview living-editor-preview-desktop">
                    {slot.previewHref ? (
                      <Image
                        src={slot.previewHref}
                        alt={`${pack.identity?.displayName} chapter ${chapter} ${state.toLowerCase()} desktop artwork`}
                        fill
                        unoptimized
                        sizes="(max-width: 900px) 100vw, 45vw"
                        style={desktopArtworkFocusStyle(
                          focalDraft[slot.latestId ?? ""]?.x ?? slot.focalX,
                          focalDraft[slot.latestId ?? ""]?.y ?? slot.focalY,
                        )}
                      />
                    ) : (
                      <EmptyState
                        pattern="editorial-canvas"
                        area="direction"
                        size="compact"
                        title="No composition yet"
                        description="Generate or upload a finished scene for this state."
                      />
                    )}
                    {slot.previewHref && (
                      <span className="living-editor-preview-copy type-label">
                        Talk to your C.O.T.S <strong>ASK ME ANYTHING</strong>
                      </span>
                    )}
                  </div>
                )}
                <div className="living-editor-review-criteria type-body-sm">
                  <CircleDashed aria-hidden="true" />
                  <span>
                    {slot.format === "MOBILE"
                      ? "Keep the face and expression readable, with copy clear of the character."
                      : "Check the character, setting change and quiet area for interface copy."}
                  </span>
                </div>
                {slot.latestId && (
                  <SelectionLabel className="living-editor-check">
                    <Checkbox
                      checked={Boolean(likenessChecks[slot.latestId])}
                      onChange={(event) =>
                        setLikenessChecks((prior) => ({
                          ...prior,
                          [slot.latestId!]: event.target.checked,
                        }))
                      }
                    />
                    <SelectionCopy>
                      I compared this composition with the confirmed originals
                      and it preserves the character&apos;s likeness.
                    </SelectionCopy>
                  </SelectionLabel>
                )}
                {slot.format === "MOBILE" && slot.latestId && (
                  <SelectionLabel className="living-editor-check">
                    <Checkbox
                      checked={Boolean(mobileChecks[slot.latestId])}
                      onChange={(event) =>
                        setMobileChecks((prior) => ({
                          ...prior,
                          [slot.latestId!]: event.target.checked,
                        }))
                      }
                    />
                    <SelectionCopy help="Required before approving a phone composition.">
                      I checked that the character&apos;s face and expression
                      stay visible at 320, 375 and 430 px.
                    </SelectionCopy>
                  </SelectionLabel>
                )}
                <Button
                  className="living-editor-approve"
                  disabled={
                    busy ||
                    !slot.latestId ||
                    slot.latestApproved ||
                    !likenessChecks[slot.latestId] ||
                    (slot.format === "MOBILE" && !mobileChecks[slot.latestId])
                  }
                  onClick={() =>
                    command("approve-artwork", {
                      artworkId: slot.latestId,
                      characterLikenessConfirmed:
                        likenessChecks[slot.latestId!],
                      mobileCharacterVisible:
                        slot.format === "MOBILE"
                          ? mobileChecks[slot.latestId!]
                          : undefined,
                    })
                  }
                >
                  {slot.latestApproved ? (
                    <>
                      <CircleCheck aria-hidden="true" /> Composition approved
                    </>
                  ) : (
                    <>
                      Approve {slot.format === "MOBILE" ? "phone" : "desktop"}{" "}
                      composition <ArrowRight aria-hidden="true" />
                    </>
                  )}
                </Button>
                <details className="living-editor-disclosure living-editor-art-tools">
                  <summary>
                    <span>
                      <strong className="type-label">
                        Replace or adjust this image
                      </strong>
                      <small className="type-caption">
                        Prompt, upload, generation and focus
                      </small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </summary>
                  <div className="living-editor-disclosure-body">
                    {slot.format === "DESKTOP" && slot.latestId && (
                      <div className="living-editor-focal">
                        <FieldLabel>
                          Horizontal focus
                          <Input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={focalDraft[slot.latestId]?.x ?? slot.focalX}
                            onChange={(event) =>
                              setFocalDraft((prior) => ({
                                ...prior,
                                [slot.latestId!]: {
                                  x: Number(event.target.value),
                                  y: prior[slot.latestId!]?.y ?? slot.focalY,
                                },
                              }))
                            }
                          />
                        </FieldLabel>
                        <FieldLabel>
                          Vertical focus
                          <Input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={focalDraft[slot.latestId]?.y ?? slot.focalY}
                            onChange={(event) =>
                              setFocalDraft((prior) => ({
                                ...prior,
                                [slot.latestId!]: {
                                  x: prior[slot.latestId!]?.x ?? slot.focalX,
                                  y: Number(event.target.value),
                                },
                              }))
                            }
                          />
                        </FieldLabel>
                        <Button
                          variant="secondary"
                          disabled={busy || !focalDraft[slot.latestId]}
                          onClick={() =>
                            command("update-focal", {
                              artworkId: slot.latestId,
                              focalX: focalDraft[slot.latestId!].x,
                              focalY: focalDraft[slot.latestId!].y,
                            })
                          }
                        >
                          Save focus
                        </Button>
                      </div>
                    )}
                    <FieldLabel>
                      Image prompt
                      <Textarea
                        readOnly
                        size="lg"
                        value={
                          slot.prompt ??
                          "Save the profile and setting to generate this prompt."
                        }
                      />
                    </FieldLabel>
                    <div className="living-editor-actions">
                      <Button
                        variant="secondary"
                        disabled={!slot.promptPackage}
                        onClick={() =>
                          slot.promptPackage &&
                          copyPromptPackage(slot.promptPackage)
                        }
                      >
                        Copy package
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={
                          busy ||
                          (pack.referenceMode !== "ORIGINALS" &&
                            !pack.referenceApproved) ||
                          !pack.visualIntent?.approved
                        }
                        onClick={() => generate(slot, "1K")}
                      >
                        Generate 1K draft
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={
                          busy ||
                          (pack.referenceMode !== "ORIGINALS" &&
                            !pack.referenceApproved) ||
                          !pack.visualIntent?.approved
                        }
                        onClick={() => generate(slot, "2K")}
                      >
                        Generate 2K draft
                      </Button>
                    </div>
                    <FieldLabel>
                      Upload replacement
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        disabled={
                          busy ||
                          (pack.referenceMode !== "ORIGINALS" &&
                            !pack.referenceApproved) ||
                          !pack.visualIntent?.approved
                        }
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void upload(slot, file);
                          event.target.value = "";
                        }}
                      />
                    </FieldLabel>
                  </div>
                </details>
              </Card>
            ))}
          </div>
          <p className="living-editor-budget type-caption">
            API image budget reserved: €
            {(pack.imageReservedEurCents / 100).toFixed(2)} / €
            {(pack.imageBudgetEurCents / 100).toFixed(2)}. Manual ChatGPT
            uploads do not use this budget.
          </p>
        </section>
      )}
      {stage === "scenes" && !pack.profileVersion && (
        <Card spacing="action" className="living-editor-gate">
          <EmptyState
            pattern="editorial-canvas"
            area="direction"
            size="compact"
            title="Build the character first"
            description="Save the character profile to unlock scene prompts and artwork review."
            action={
              <Button onClick={() => openStage("character", true)}>
                Open character profile <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
        </Card>
      )}
      {stage === "activation" && (
        <Card
          spacing="action"
          className="living-editor-panel living-editor-launch"
          aria-labelledby="living-activation-title"
        >
          <div className="living-editor-section-head">
            <div>
              <p className="type-overline">06 / Final review</p>
              <h2 className="type-section-title" id="living-activation-title">
                Ready for the Season?
              </h2>
              <p className="type-body-sm">
                Activation uses only approved work. Until every composition
                passes review, the current dashboard scene stays in place.
              </p>
            </div>
            <IconFrame treatment="featured" area="direction">
              <ShieldCheck />
            </IconFrame>
          </div>
          <div
            className="living-editor-readiness"
            role="list"
            aria-label="Activation requirements"
          >
            {[
              {
                label: "Character profile",
                done: pack.profileApproved,
                target: "character" as const,
                detail: pack.profileApproved ? "Approved" : "Needs approval",
              },
              {
                label: "Visual intent",
                done: Boolean(pack.visualIntent?.approved),
                target: "world" as const,
                detail: pack.visualIntent?.approved
                  ? `Approved v${pack.visualIntent.version}`
                  : "Needs approval",
              },
              {
                label: "Original character images",
                done: pack.originalsApproved > 0,
                target: "reference" as const,
                detail: `${pack.originalsApproved} confirmed`,
              },
              {
                label: "Banner and portrait",
                done: Boolean(pack.banner?.approved),
                target: "banner" as const,
                detail: pack.banner?.approved ? "Approved" : "Needs approval",
              },
              {
                label: "Visual reference",
                done:
                  pack.referenceMode === "ORIGINALS" || pack.referenceApproved,
                target: "reference" as const,
                detail:
                  pack.referenceMode === "ORIGINALS"
                    ? "Optional · authentic originals"
                    : pack.referenceApproved
                      ? "Approved"
                      : "Needs approval",
              },
              {
                label: "Desktop and phone scenes",
                done: pack.approvedCount === 42,
                target: "scenes" as const,
                detail: `${pack.approvedCount} of 42 approved`,
              },
            ].map((item) => (
              <div
                className="living-editor-readiness-item"
                role="listitem"
                key={item.label}
              >
                <span className="living-editor-readiness-icon">
                  {item.done ? (
                    <CircleCheck aria-hidden="true" />
                  ) : (
                    <CircleDashed aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong className="type-label">{item.label}</strong>
                  <span className="type-caption">{item.detail}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openStage(item.target, true)}
                >
                  Review <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <div className="living-editor-matrix-head">
            <div>
              <p className="type-overline">The complete sequence</p>
              <h3 className="type-widget-title">21 states · 42 compositions</h3>
            </div>
            <span className="type-caption">
              Select any state to inspect its pair
            </span>
          </div>
          <div
            className="living-editor-matrix"
            role="group"
            aria-label="Artwork review matrix"
          >
            {Array.from({ length: 7 }, (_, i) => i + 1).map((item) => (
              <div className="living-editor-matrix-row" key={item}>
                <span className="type-label">
                  Chapter {String(item).padStart(2, "0")}
                </span>
                {states.map((condition) => {
                  const approved = pack.slots.filter(
                    (slot) =>
                      slot.chapter === item &&
                      slot.state === condition &&
                      slot.latestApproved,
                  ).length;
                  return (
                    <Button
                      key={condition}
                      variant="secondary"
                      size="sm"
                      className="living-editor-matrix-cell"
                      data-complete={approved === 2}
                      onClick={() => {
                        setChapter(item);
                        setState(condition);
                        openStage("scenes", true);
                      }}
                      aria-label={`Review chapter ${item}, ${stateLabels[condition]}: ${approved} of 2 approved`}
                    >
                      <span>{stateLabels[condition]}</span>
                      <strong className="type-system">{approved}/2</strong>
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="living-editor-activation-bar">
            <div>
              <p className="type-label">
                {pack.active
                  ? "This pack is active"
                  : readyToActivate
                    ? "All review gates are complete"
                    : "Review is still in progress"}
              </p>
              <p className="type-caption">
                {pack.active
                  ? "The dashboard uses this approved Season pack."
                  : readyToActivate
                    ? "Activating will make this approved world visible on the dashboard."
                    : "Profile, visual intent, reference and every desktop/phone composition must be approved first."}
              </p>
            </div>
            <Button
              disabled={busy || pack.active || !readyToActivate}
              onClick={() => {
                setActivationOpen(true);
                play("layerOpened");
              }}
            >
              {pack.active ? "Already active" : "Activate Living Season"}{" "}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </Card>
      )}
      {!embeddedInOpening && (
        <footer className="living-editor-footer">
          <Link
            className="type-label"
            href={`/direction/seasons/${year}/${quarter}`}
          >
            <ArrowLeft aria-hidden="true" /> Back to Season
          </Link>
          <Link className="type-label" href="/">
            Return to dashboard <ArrowRight aria-hidden="true" />
          </Link>
        </footer>
      )}
      <Dialog
        open={activationOpen}
        onOpenChange={(open) => {
          setActivationOpen(open);
          if (!open) play("returned");
        }}
        eyebrow="Living Season / Activation"
        title="Bring this world into Become?"
        description="The approved profile, visual intent, reference and 42 compositions will become the active Season pack. The dashboard will select scenes from recorded progress."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActivationOpen(false);
                play("returned");
              }}
            >
              Keep reviewing
            </Button>
            <Button
              disabled={busy || !readyToActivate}
              onClick={async () => {
                const result = await command("activate");
                if (result) {
                  setActivationOpen(false);
                  onActivated?.();
                }
              }}
            >
              Activate approved pack
            </Button>
          </>
        }
      />
    </Container>
  );
}
