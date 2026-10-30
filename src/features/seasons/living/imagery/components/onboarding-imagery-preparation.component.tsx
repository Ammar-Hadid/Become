"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pause,
  Play,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { AmbientLight } from "@/components/ui/ambient-light/ambient-light.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { ArtworkUpload } from "@/components/ui/artwork-upload/artwork-upload.component";
import { FormatButtons } from "./format-buttons.component";
import { ImagePromptDrawer } from "./image-prompt-drawer.component";
import { PACE_OPTIONS, type Format } from "../utils/imagery-selection.util";
import type { SeasonOnboardingView } from "../../onboarding/onboarding.service";
import type { ImagePromptPackageView } from "@/features/settings/image-direction/components/image-direction-package-preview.component";
import "../styles/imagery-workspace.css";

type Target = "BANNERS" | "PORTRAIT" | "CHAPTER";
export function OnboardingImageryPreparation({
  view,
  year,
  quarter,
  busy,
  error,
  onCommand,
  onRefresh,
  onLeave,
  onBack,
  embedded = false,
}: {
  view: SeasonOnboardingView;
  year: number;
  quarter: number;
  busy: boolean;
  error: string;
  onCommand: (
    action: string,
    fields?: Record<string, unknown>,
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  onLeave: () => void;
  onBack: () => void;
  embedded?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [format, setFormat] = useState<Format>("DESKTOP");
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const [promptBusy, setPromptBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [switchOpen, setSwitchOpen] = useState(false);
  const promptTrigger = useRef<HTMLElement | null>(null);
  const uploadOperations = useRef(new Map<File, string>());
  const promptPending = useRef(false);
  const uploadPending = useRef(false);
  const run = view.run!;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, [run.stage, run.chapter]);
  const pack = view.pack;
  const sceneMethod = pack.creation.method;
  const isChoice = run.stage === "SCENE_METHOD";
  const target: Target =
    run.stage === "BANNER_PREPARATION"
      ? "BANNERS"
      : run.stage === "PORTRAIT_PREPARATION"
        ? "PORTRAIT"
        : "CHAPTER";
  const manual =
    target === "BANNERS"
      ? run.bannerMethod === "MANUAL"
      : target === "PORTRAIT"
        ? run.portraitMethod === "MANUAL"
        : sceneMethod === "MANUAL";
  const slots = pack.slots.filter((slot) => slot.chapter === run.chapter);
  const banner = pack.banner?.current ? pack.banner : null;
  const allUploaded =
    target === "BANNERS"
      ? Boolean(banner?.desktopHref && banner.phoneHref)
      : target === "PORTRAIT"
        ? Boolean(banner?.avatarHref)
        : slots.every((slot) => slot.latestId);
  const packages: Record<string, ImagePromptPackageView | null> =
    target === "CHAPTER"
      ? Object.fromEntries(
          slots.map((slot) => [
            `${slot.state}:${slot.format}`,
            slot.promptPackage,
          ]),
        )
      : pack.bannerPromptPackages;
  const imagePackage = promptKey ? (packages[promptKey] ?? null) : null;
  const remaining =
    target === "CHAPTER"
      ? slots
          .filter((slot) => !slot.latestId)
          .map(
            (slot) =>
              `${PACE_OPTIONS.find((p) => p.key === slot.state)!.label} · ${slot.format === "MOBILE" ? "mobile" : "desktop"}`,
          )
      : target === "BANNERS"
        ? [
            !banner?.desktopHref && "Desktop banner",
            !banner?.phoneHref && "Mobile banner",
          ].filter(Boolean)
        : !banner?.avatarHref
          ? ["Profile portrait"]
          : [];
  async function writePrompt(
    key: string,
    trigger?: HTMLElement,
    regenerate = false,
  ) {
    if (promptPending.current) return;
    if (trigger) promptTrigger.current = trigger;
    setPromptKey(key);
    setPromptError("");
    if (packages[key] && !regenerate) return;
    promptPending.current = true;
    setPromptBusy(true);
    try {
      const response = await fetch("/api/direction/seasons/living/prompts", {
        method: "POST",
        signal: AbortSignal.timeout(390000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          quarter,
          group: target,
          chapter: target === "CHAPTER" ? run.chapter : undefined,
          operationKey: crypto.randomUUID(),
          regenerate,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Prompt writing failed.");
      await onRefresh();
    } catch (cause) {
      setPromptError(
        cause instanceof Error
          ? cause.message
          : "Prompt writing failed. Saved work is preserved.",
      );
    } finally {
      promptPending.current = false;
      setPromptBusy(false);
    }
  }
  async function upload(file: File, key: string, state?: string) {
    if (uploadPending.current)
      throw new Error("Wait for the current upload to finish.");
    uploadPending.current = true;
    setUploadBusy(true);
    try {
      const existing = uploadOperations.current.get(file);
      const operationKey = existing ?? crypto.randomUUID();
      uploadOperations.current.set(file, operationKey);
      const selected = packages[key];
      const input = {
        year,
        quarter,
        operationKey,
        expectedRevision: run.revision,
        ...(selected
          ? {
              promptReceipt: selected.receipt,
              promptBatchId: (
                selected as ImagePromptPackageView & {
                  authorship?: { batchId: string };
                }
              ).authorship?.batchId,
            }
          : {}),
        ...(target === "CHAPTER"
          ? {
              slot: { chapter: run.chapter, state, format },
              sceneAttemptId: pack.creation.activeAttemptId,
            }
          : { kind: "banner", bannerKind: key }),
      };
      const form = new FormData();
      form.set("input", JSON.stringify(input));
      form.set("file", file);
      const response = await fetch("/api/direction/seasons/living/upload", {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Upload failed.");
      await onRefresh();
    } finally {
      uploadPending.current = false;
      setUploadBusy(false);
    }
  }
  function asset(
    href: string | null | undefined,
    dimensions?: { width: number; height: number } | null,
  ) {
    return href
      ? {
          href,
          filename: "Saved artwork",
          width: dimensions?.width ?? 0,
          height: dimensions?.height ?? 0,
        }
      : undefined;
  }
  const Shell = embedded ? "div" : AmbientLight;
  return (
    <Shell
      {...(!embedded ? { paused } : {})}
      className={`artwork-preview-shell${embedded ? "artwork-preview-shell--embedded" : ""}`}
    >
      {!embedded && (
        <header className="artwork-preview-header">
          <BrandMark />
          <div className="imagery-row">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {paused ? "Resume motion" : "Pause motion"}
            </Button>
            <span className="type-caption" role="status">
              {uploadBusy ? "Uploading artwork…" : busy ? "Saving…" : "Saved"}
            </span>
          </div>
        </header>
      )}
      <div className="artwork-preview-content">
        <main className="manual-imagery-workspace">
          <header className="imagery-introduction">
            <div>
              <p className="type-overline">
                {year} · Season {quarter} · Imagery
              </p>
              <h1 ref={title} tabIndex={-1} className="type-season-entry-title">
                {isChoice
                  ? "How should we create your scenes?"
                  : target === "BANNERS"
                    ? "Bring your character into this Season."
                    : target === "PORTRAIT"
                      ? "Give your character a profile."
                      : `Chapter ${run.chapter} of 7.`}
              </h1>
              <p className="type-body-lg imagery-muted">
                {isChoice
                  ? "Choose one method for all seven chapters. You’ll review every composition before activation."
                  : manual
                    ? "Upload your artwork, or use an AI-written prompt to create it in ChatGPT. Nothing becomes active until you approve it."
                    : "Become will prepare saved AI-written prompts, then create artwork for your review."}
              </p>
            </div>
            {!isChoice && (
              <Button
                variant="ghost"
                disabled={busy || promptBusy || uploadBusy}
                onClick={() =>
                  target === "CHAPTER"
                    ? setSwitchOpen(true)
                    : void onCommand("set-artwork-method", {
                        target,
                        method: manual ? "AI" : "MANUAL",
                      })
                }
              >
                {target === "CHAPTER"
                  ? "Change creation method"
                  : manual
                    ? "Use AI instead"
                    : "or upload manually"}
              </Button>
            )}
          </header>
          {error && (
            <p className="imagery-error" role="alert">
              {error}
            </p>
          )}
          {isChoice ? (
            <div className="imagery-methods">
              <Card spacing="action">
                <Sparkles aria-hidden="true" />
                <h2 className="type-section-title">Let AI create them</h2>
                <p>
                  Seven connected chapters, with desktop and mobile compositions
                  for each pace state. Review one chapter at a time.
                </p>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void onCommand("select-scenes-method", { method: "AI" })
                  }
                >
                  Let AI create them <ArrowRight aria-hidden="true" />
                </Button>
              </Card>
              <Card spacing="action">
                <Upload aria-hidden="true" />
                <h2 className="type-section-title">Upload them myself</h2>
                <p>
                  Use saved AI-written prompts in ChatGPT, then upload six
                  separate compositions per chapter.
                </p>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void onCommand("select-scenes-method", { method: "MANUAL" })
                  }
                >
                  Upload them myself <ArrowRight aria-hidden="true" />
                </Button>
              </Card>
            </div>
          ) : manual ? (
            <>
              <div className="imagery-row imagery-between">
                <p className="type-caption">
                  {target === "CHAPTER"
                    ? `${6 - remaining.length} of 6 compositions uploaded`
                    : `${remaining.length ? "Waiting for artwork" : "Ready for review"}`}
                </p>
                {target !== "PORTRAIT" && (
                  <FormatButtons
                    format={format}
                    onSelect={setFormat}
                    disabled={busy || promptBusy || uploadBusy}
                  />
                )}
              </div>
              {target === "CHAPTER" ? (
                <div className="imagery-upload-grid">
                  {PACE_OPTIONS.map((pace) => {
                    const slot = slots.find(
                      (s) => s.state === pace.key && s.format === format,
                    )!;
                    const key = `${pace.key}:${format}`;
                    return (
                      <div key={key} data-pace={pace.tone}>
                        <ArtworkUpload
                          label={pace.label}
                          specification={`${format === "MOBILE" ? "9:16 mobile" : "16:9 desktop"} · target 2K`}
                          asset={asset(slot.previewHref, slot)}
                          disabled={busy || promptBusy || uploadBusy}
                          promptReady={Boolean(packages[key])}
                          promptBusy={promptBusy && promptKey === key}
                          onPrompt={(trigger) => void writePrompt(key, trigger)}
                          onUpload={(file) => upload(file, key, pace.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="imagery-single-upload">
                  {(() => {
                    const key =
                      target === "PORTRAIT"
                        ? "avatar"
                        : format === "MOBILE"
                          ? "phone"
                          : "desktop";
                    const href =
                      key === "avatar"
                        ? banner?.avatarHref
                        : key === "phone"
                          ? banner?.phoneHref
                          : banner?.desktopHref;
                    return (
                      <ArtworkUpload
                        key={key}
                        label={
                          target === "PORTRAIT"
                            ? "Profile portrait"
                            : `${format === "MOBILE" ? "Mobile" : "Desktop"} banner`
                        }
                        specification={`${key === "avatar" ? "1:1 · safe circular crop" : key === "phone" ? "9:16 mobile" : "21:9 desktop"} · target 2K`}
                        asset={asset(href, banner?.dimensions[key])}
                        disabled={busy || promptBusy || uploadBusy}
                        promptReady={Boolean(packages[key])}
                        promptBusy={promptBusy}
                        onPrompt={(trigger) => void writePrompt(key, trigger)}
                        onUpload={(file) => upload(file, key)}
                      />
                    );
                  })()}
                </div>
              )}
              <p className="type-caption" role="status">
                {remaining.length
                  ? `Still to upload: ${remaining.join(" · ")}.`
                  : "All compositions uploaded. Open review to check the likeness and composition."}
              </p>
              <Button
                disabled={busy || promptBusy || !allUploaded}
                onClick={() => void onCommand("review-artwork", { target })}
              >
                <Check aria-hidden="true" />
                {target === "CHAPTER"
                  ? "Review all six scenes"
                  : target === "BANNERS"
                    ? "Review banners"
                    : "Review profile"}
              </Button>
            </>
          ) : (
            <Card spacing="action" className="imagery-automatic">
              <Sparkles aria-hidden="true" />
              <h2 className="type-section-title">
                AI will create{" "}
                {target === "BANNERS"
                  ? "your two banners"
                  : target === "PORTRAIT"
                    ? "your profile portrait"
                    : `Chapter ${run.chapter}`}
                .
              </h2>
              <p className="type-body-sm imagery-muted">
                Prompts use your approved character, world and saved image
                recipes. Image generation stays within the €15 pack budget.
              </p>
              <Button
                disabled={busy || promptBusy || uploadBusy}
                onClick={() => void onCommand("generate-artwork", { target })}
              >
                Create{" "}
                {target === "BANNERS"
                  ? "banners"
                  : target === "PORTRAIT"
                    ? "profile portrait"
                    : "chapter scenes"}
                <ArrowRight aria-hidden="true" />
              </Button>
              {allUploaded && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onCommand("review-artwork", { target })}
                >
                  Review saved artwork
                </Button>
              )}
            </Card>
          )}
          <footer className="imagery-row imagery-between">
            <div className="imagery-row">
              <Button
                variant="ghost"
                disabled={busy || uploadBusy || promptBusy}
                onClick={onBack}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
              <Button
                variant="ghost"
                disabled={busy || uploadBusy}
                onClick={onLeave}
              >
                <Save aria-hidden="true" />
                Save and leave
              </Button>
            </div>
            <p className="type-caption imagery-muted">
              Artwork reserved · €
              {(pack.imageReservedEurCents / 100).toFixed(2)} / €15
            </p>
          </footer>
          <ImagePromptDrawer
            open={Boolean(promptKey)}
            onClose={() => setPromptKey(null)}
            imagePackage={imagePackage}
            busy={promptBusy}
            error={promptError}
            onRegenerate={() =>
              promptKey &&
              void writePrompt(promptKey, undefined, Boolean(imagePackage))
            }
            returnFocusRef={promptTrigger}
          />
          <Dialog
            open={switchOpen}
            onOpenChange={setSwitchOpen}
            className="imagery-method-switch-dialog"
            title={`Switch to ${sceneMethod === "MANUAL" ? "AI" : "manual"} creation?`}
            description={`Your current attempt has ${pack.approvedCount} reviewed compositions. Choose what happens to this progress.`}
            footer={
              <>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setSwitchOpen(false);
                    void onCommand("switch-scenes-method", {
                      method: sceneMethod === "MANUAL" ? "AI" : "MANUAL",
                      retention: "KEEP",
                    });
                  }}
                >
                  Keep progress until onboarding finishes
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    setSwitchOpen(false);
                    void onCommand("switch-scenes-method", {
                      method: sceneMethod === "MANUAL" ? "AI" : "MANUAL",
                      retention: "DELETE",
                    });
                  }}
                >
                  Delete progress now
                </Button>
              </>
            }
          >
            <p>
              Kept images and reviews can be restored when you switch back. The
              selected attempt alone becomes your final scene pack.
            </p>
          </Dialog>
        </main>
      </div>
    </Shell>
  );
}
