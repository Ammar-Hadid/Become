"use client";
import { FormatButtons } from "@/features/seasons/living/imagery/components/format-buttons.component";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Pause,
  Play,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { usePromptClipboard } from "@/features/seasons/living/image-direction/hooks/use-prompt-clipboard.hook";
import { createOnboardingPreviewModel } from "../season-onboarding/season-onboarding-candidate.component";
import {
  SeasonOnboardingView,
  type GuidedActions,
} from "@/features/seasons/living/onboarding/components/season-onboarding-view.component";
import { ArtworkPreviewShell } from "./artwork-preview-shell.component";
import {
  ArtworkUploadCandidate,
  readPreviewUpload,
} from "./artwork-upload-candidate.component";
import {
  chapterKeys,
  initialImageryPreview,
  missingSceneLabels,
  PACE_OPTIONS,
  readImageryPreview,
  SAMPLE_ART,
  sampleAsset,
  samplePrompt,
  saveImageryPreview,
  sceneKey,
  type Format,
  type ImageryPreview,
  type Method,
  type Pace,
  type PreviewAsset,
  type PreviewAttempt,
} from "./manual-imagery-preview.util";

type PromptSelection = {
  kind: "banner" | "portrait" | "scene";
  format: Format;
  chapter?: number;
  pace?: Pace;
};
const newAttempt = (method: Method): PreviewAttempt => ({
  method,
  chapter: 1,
  assets: {},
  approved: [],
  prompts: {},
});
const titles = {
  banner: "Bring your character into view.",
  portrait: "Give your character a familiar face.",
  method: "How will you create your Season scenes?",
  scenes: "Build your world, one chapter at a time.",
  review: "Take a closer look.",
  ready: "Your complete artwork pack is ready.",
  complete: "Preview onboarding complete.",
};

export function ManualImageryCandidate() {
  const [draft, setDraft] = useState<ImageryPreview>(initialImageryPreview);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading local preview…");
  const [error, setError] = useState("");
  const [task, setTask] = useState("");
  const [prompt, setPrompt] = useState<PromptSelection | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptPaused, setPromptPaused] = useState(false);
  const [promptReplay, setPromptReplay] = useState(0);
  const promptId = useId();
  const promptReturnFocus = useRef<HTMLElement | null>(null);
  const promptPresence = usePresence(promptOpen, "surface");
  const [switchTo, setSwitchTo] = useState<Method | null>(null);
  const [failPrompt, setFailPrompt] = useState(false);
  const [failUpload, setFailUpload] = useState(false);
  const [promptRuns, setPromptRuns] = useState(0);
  const locked = useRef(false);
  const disposed = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = !loaded || Boolean(task);
  const attempt = draft.method ? draft.attempts[draft.method] : undefined;

  useEffect(() => {
    disposed.current = false;
    void readImageryPreview()
      .then((saved) => {
        if (disposed.current) return;
        if (saved) setDraft(saved);
        setSaveStatus(
          saved ? "Saved on this device" : "Unsaved sample preview",
        );
      })
      .catch((cause: unknown) => {
        if (!disposed.current) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not restore the preview.",
          );
          setSaveStatus("Restore failed");
        }
      })
      .finally(() => {
        if (!disposed.current) setLoaded(true);
      });
    return () => {
      disposed.current = true;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [draft.stage]);

  async function commit(next: ImageryPreview) {
    setSaveStatus("Saving locally…");
    try {
      await saveImageryPreview(next);
      if (disposed.current) return false;
      setDraft(next);
      setSaveStatus("Saved on this device");
      setError("");
      return true;
    } catch (cause) {
      if (!disposed.current) {
        setSaveStatus("Save failed");
        setError(
          cause instanceof Error ? cause.message : "Save failed. Try again.",
        );
      }
      return false;
    }
  }
  async function change(next: ImageryPreview) {
    if (locked.current) return;
    locked.current = true;
    setTask("Saving your preview");
    try {
      await commit(next);
    } finally {
      locked.current = false;
      if (!disposed.current) setTask("");
    }
  }
  function activePrompt(selection: PromptSelection | null) {
    if (!selection) return "";
    return selection.kind === "scene" && attempt
      ? (attempt.prompts[
          sceneKey(selection.chapter!, selection.pace!, selection.format)
        ] ?? "")
      : (draft.prompts[`${selection.kind}:${selection.format}`] ?? "");
  }
  async function generatePrompt(
    selection: PromptSelection,
    regenerate = false,
    trigger?: HTMLElement,
  ) {
    if (locked.current) return;
    if (trigger) promptReturnFocus.current = trigger;
    setPrompt(selection);
    setPromptOpen(true);
    setPromptPaused(false);
    setPromptReplay((count) => count + 1);
    if (!regenerate && activePrompt(selection)) return;
    locked.current = true;
    setTask("Preparing sample image prompts");
    setError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (disposed.current) return;
      if (failPrompt) {
        setFailPrompt(false);
        throw new Error(
          "Sample prompt-writing failure. Saved prompts and artwork are preserved. Retry when ready.",
        );
      }
      let next = draft;
      if (selection.kind === "scene" && attempt && draft.method) {
        const prompts = { ...attempt.prompts };
        for (const { key } of PACE_OPTIONS)
          for (const format of ["DESKTOP", "MOBILE"] as const)
            prompts[sceneKey(selection.chapter!, key, format)] = samplePrompt(
              "scene",
              format,
              selection.chapter,
              key,
            );
        next = {
          ...draft,
          attempts: {
            ...draft.attempts,
            [draft.method]: { ...attempt, prompts },
          },
        };
      } else {
        const prompts = { ...draft.prompts };
        for (const format of selection.kind === "banner"
          ? (["DESKTOP", "MOBILE"] as const)
          : (["DESKTOP"] as const))
          prompts[`${selection.kind}:${format}`] = samplePrompt(
            selection.kind,
            format,
          );
        next = { ...draft, prompts };
      }
      if (await commit(next)) setPromptRuns((count) => count + 1);
    } catch (cause) {
      if (!disposed.current)
        setError(
          cause instanceof Error ? cause.message : "Prompt preparation failed.",
        );
    } finally {
      locked.current = false;
      if (!disposed.current) setTask("");
    }
  }
  async function receiveAsset(
    asset: PreviewAsset,
    format: Format,
    pace?: Pace,
  ) {
    if (locked.current)
      throw new Error("Wait for the current operation to finish.");
    locked.current = true;
    try {
      const next =
        draft.stage === "scenes" && attempt && draft.method && pace
          ? {
              ...draft,
              attempts: {
                ...draft.attempts,
                [draft.method]: {
                  ...attempt,
                  assets: {
                    ...attempt.assets,
                    [sceneKey(attempt.chapter, pace, format)]: asset,
                  },
                  approved: attempt.approved.filter(
                    (chapter) => chapter < attempt.chapter,
                  ),
                },
              },
            }
          : draft.stage === "portrait"
            ? { ...draft, portrait: asset }
            : { ...draft, banners: { ...draft.banners, [format]: asset } };
      if (!(await commit(next)))
        throw new Error("The image could not be saved locally. Try again.");
    } finally {
      locked.current = false;
    }
  }
  async function simulateAutomatic() {
    if (locked.current) return;
    locked.current = true;
    setTask("Preparing sample prompts and artwork");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      if (disposed.current) return;
      if (failPrompt) {
        setFailPrompt(false);
        throw new Error(
          "Sample prompt-writing failure. No artwork was created. Retry when ready.",
        );
      }
      let next: ImageryPreview;
      if (draft.stage === "scenes" && attempt && draft.method === "AI") {
        const assets = { ...attempt.assets },
          prompts = { ...attempt.prompts };
        for (const { key } of PACE_OPTIONS)
          for (const format of ["DESKTOP", "MOBILE"] as const) {
            const slot = sceneKey(attempt.chapter, key, format);
            assets[slot] = sampleAsset(format);
            prompts[slot] = samplePrompt("scene", format, attempt.chapter, key);
          }
        next = {
          ...draft,
          stage: "review",
          reviewTarget: "scenes",
          attempts: { ...draft.attempts, AI: { ...attempt, assets, prompts } },
        };
      } else if (draft.stage === "portrait")
        next = {
          ...draft,
          stage: "review",
          reviewTarget: "portrait",
          portrait: sampleAsset("PORTRAIT"),
          prompts: {
            ...draft.prompts,
            "portrait:DESKTOP": samplePrompt("portrait", "DESKTOP"),
          },
        };
      else
        next = {
          ...draft,
          stage: "review",
          reviewTarget: "banner",
          banners: {
            DESKTOP: sampleAsset("DESKTOP"),
            MOBILE: sampleAsset("MOBILE"),
          },
          prompts: {
            ...draft.prompts,
            "banner:DESKTOP": samplePrompt("banner", "DESKTOP"),
            "banner:MOBILE": samplePrompt("banner", "MOBILE"),
          },
        };
      await commit(next);
    } catch (cause) {
      if (!disposed.current)
        setError(
          cause instanceof Error ? cause.message : "Sample generation failed.",
        );
    } finally {
      locked.current = false;
      if (!disposed.current) setTask("");
    }
  }
  async function chooseMethod(method: Method, keep = true) {
    const attempts = { ...draft.attempts };
    if (!keep && draft.method) delete attempts[draft.method];
    attempts[method] ??= newAttempt(method);
    setSwitchTo(null);
    await change({
      ...draft,
      method,
      attempts,
      stage: "scenes",
      manual: method === "MANUAL",
    });
  }
  async function approveReview() {
    if (draft.reviewTarget === "banner")
      await change({ ...draft, stage: "portrait", manual: false });
    else if (draft.reviewTarget === "portrait")
      await change({ ...draft, stage: "method" });
    else if (attempt && draft.method) {
      if (missingSceneLabels(attempt).length) {
        setError("Upload all six compositions before approving this chapter.");
        return;
      }
      const approved = [...new Set([...attempt.approved, attempt.chapter])];
      await change({
        ...draft,
        stage: approved.length === 7 ? "ready" : "scenes",
        attempts: {
          ...draft.attempts,
          [draft.method]: {
            ...attempt,
            approved,
            chapter: Math.min(7, attempt.chapter + 1),
          },
        },
      });
    }
  }
  function reviewBack() {
    void change({ ...draft, stage: draft.reviewTarget });
  }
  const model = createOnboardingPreviewModel(
    draft.reviewTarget === "banner"
      ? "BANNER"
      : draft.reviewTarget === "portrait"
        ? "PORTRAIT"
        : "SCENES",
    attempt?.chapter ?? 1,
  );
  model.busy = busy;
  model.banner = {
    ...model.banner!,
    desktopSrc: draft.banners.DESKTOP?.href,
    phoneSrc: draft.banners.MOBILE?.href,
    avatarSrc: draft.portrait?.href,
    crop: draft.crop,
  };
  model.scenes = attempt
    ? PACE_OPTIONS.flatMap(({ key }) =>
        (["DESKTOP", "MOBILE"] as const).flatMap((format) => {
          const slot = sceneKey(attempt.chapter, key, format),
            asset = attempt.assets[slot];
          return asset
            ? [{ id: slot, state: key, format, href: asset.href }]
            : [];
        }),
      )
    : [];
  const actions: GuidedActions = {
    lookup: async () => {},
    different: () => {},
    start: async () => {},
    correct: async () => {},
    approve: approveReview,
    regenerate: async () => {
      reviewBack();
    },
    pause: async () => {},
    resume: async () => {},
    back: reviewBack,
    leave: async () => {
      await change(draft);
    },
    crop: async (crop, file) => {
      try {
        const portrait = file
          ? await readPreviewUpload(file, "square")
          : draft.portrait;
        return await commit({ ...draft, crop, portrait });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The portrait could not be saved.",
        );
        return false;
      }
    },
  };
  const completeChapter = Boolean(
    attempt && !missingSceneLabels(attempt).length,
  );
  const promptText = activePrompt(prompt);
  const clipboard = usePromptClipboard(
    promptText,
    `${promptReplay}:${promptOpen}`,
  );
  return (
    <ArtworkPreviewShell
      status={saveStatus}
      footer={
        <div className="imagery-row">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void change(draft)}
          >
            <Save aria-hidden="true" />
            Save preview
          </Button>
          <span className="type-caption">
            Images stay in this browser until you reset or discard them.
          </span>
        </div>
      }
    >
      {draft.stage !== "review" && (
        <main className="manual-imagery-workspace">
          <header className="imagery-introduction">
            <div>
              <p className="type-overline">Season artwork · {model.name}</p>
              <h1
                className="type-season-entry-title"
                ref={heading}
                tabIndex={-1}
              >
                {titles[draft.stage]}
              </h1>
              <p className="type-body-lg imagery-muted">
                {draft.stage === "banner"
                  ? "Choose how to create your banners. You’ll review the desktop and mobile compositions before continuing."
                  : draft.stage === "portrait"
                    ? "A separate portrait, recognizable at a glance. You’ll adjust and approve its crop next."
                    : draft.stage === "method"
                      ? "One creation method for all seven chapters. You can change your mind and keep your progress."
                      : draft.stage === "complete"
                        ? "Unused kept attempts were removed from this local preview. Your actual Season has not changed."
                        : draft.stage === "ready"
                          ? "Both banners, your portrait and all 42 scene compositions passed the sample review."
                          : "Three pace states. Two formats. A focused review before the next chapter."}
              </p>
            </div>
            {(draft.stage === "banner" || draft.stage === "portrait") && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void change({ ...draft, manual: !draft.manual })}
              >
                {draft.manual ? (
                  <Sparkles aria-hidden="true" />
                ) : (
                  <Upload aria-hidden="true" />
                )}
                {draft.manual ? "Use AI instead" : "or upload manually"}
              </Button>
            )}
          </header>
          {error && (
            <p className="imagery-error type-body" role="alert">
              {error}
            </p>
          )}
          {task && (
            <div className="imagery-task" aria-live="polite">
              <LoadingIndicator area="direction" label={task} />
              <p className="type-body-sm">{task} · preview only</p>
            </div>
          )}
          {draft.stage === "banner" || draft.stage === "portrait" ? (
            draft.manual ? (
              <>
                {draft.stage === "banner" && (
                  <FormatButtons
                    format={draft.format}
                    disabled={busy}
                    onSelect={(format) => void change({ ...draft, format })}
                  />
                )}
                <div className="imagery-single-upload">
                  <ArtworkUploadCandidate
                    label={
                      draft.stage === "portrait"
                        ? "Profile portrait"
                        : `${draft.format === "DESKTOP" ? "Desktop" : "Mobile"} banner`
                    }
                    specification={
                      draft.stage === "portrait"
                        ? "Square portrait · target 2K"
                        : `${draft.format === "DESKTOP" ? "21:9 desktop" : "9:16 mobile"} · target 2K`
                    }
                    asset={
                      draft.stage === "portrait"
                        ? draft.portrait
                        : draft.banners[draft.format]
                    }
                    orientation={
                      draft.stage === "portrait"
                        ? "square"
                        : draft.format === "DESKTOP"
                          ? "wide"
                          : "portrait"
                    }
                    disabled={busy}
                    failUpload={failUpload}
                    promptBusy={Boolean(task)}
                    promptReady={Boolean(
                      draft.prompts[
                        `${draft.stage}:${draft.stage === "portrait" ? "DESKTOP" : draft.format}`
                      ],
                    )}
                    onPrompt={(trigger) =>
                      void generatePrompt(
                        {
                          kind:
                            draft.stage === "portrait" ? "portrait" : "banner",
                          format:
                            draft.stage === "portrait"
                              ? "DESKTOP"
                              : draft.format,
                        },
                        false,
                        trigger,
                      )
                    }
                    onUpload={(asset) => receiveAsset(asset, draft.format)}
                  />
                </div>
                <p className="type-body-sm imagery-muted">
                  {draft.stage === "portrait"
                    ? draft.portrait
                      ? "Portrait uploaded. Ready for likeness and crop review."
                      : "Upload a separately composed portrait."
                    : `Missing: ${
                        (["DESKTOP", "MOBILE"] as const)
                          .filter((format) => !draft.banners[format])
                          .map(
                            (format) =>
                              `${format === "DESKTOP" ? "desktop" : "mobile"} banner`,
                          )
                          .join(" and ") ||
                        "none — both banners are ready for review"
                      }.`}
                </p>
                <Button
                  disabled={
                    busy ||
                    (draft.stage === "portrait"
                      ? !draft.portrait
                      : !draft.banners.DESKTOP || !draft.banners.MOBILE)
                  }
                  onClick={() =>
                    void change({
                      ...draft,
                      stage: "review",
                      reviewTarget:
                        draft.stage === "portrait" ? "portrait" : "banner",
                    })
                  }
                >
                  Review {draft.stage === "portrait" ? "portrait" : "banners"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Card
                material="glass"
                spacing="action"
                className="imagery-automatic"
              >
                <Sparkles aria-hidden="true" />
                <h2 className="type-section-title">
                  Let Become prepare the{" "}
                  {draft.stage === "banner" ? "banners" : "portrait"}.
                </h2>
                <p className="type-body imagery-muted">
                  AI writes the prompts from your approved character and world,
                  then creates the artwork for your review.
                </p>
                <p className="type-caption">
                  This candidate demonstrates the sequence with sample prompts
                  and artwork.
                </p>
                <Button
                  disabled={busy}
                  onClick={() => void simulateAutomatic()}
                >
                  {draft.stage === "banner"
                    ? "Create sample banners"
                    : "Create sample portrait"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </Card>
            )
          ) : draft.stage === "method" ? (
            <div className="imagery-methods">
              {(["AI", "MANUAL"] as const).map((method) => (
                <Card
                  key={method}
                  material={method === "AI" ? "glass" : "solid"}
                  spacing="action"
                >
                  <span className="imagery-method-icon">
                    {method === "AI" ? (
                      <Sparkles aria-hidden="true" />
                    ) : (
                      <Upload aria-hidden="true" />
                    )}
                  </span>
                  <h2 className="type-section-title">
                    {method === "AI"
                      ? "Let AI create them"
                      : "Upload them myself"}
                  </h2>
                  <p className="type-body imagery-muted">
                    {method === "AI"
                      ? "Become writes the prompts and creates each chapter. You review the result before the next one begins."
                      : "Get ready-to-copy prompts, create the images in ChatGPT, then upload and review one chapter at a time."}
                  </p>
                  <Button
                    variant={method === "AI" ? "primary" : "secondary"}
                    disabled={busy}
                    onClick={() => void chooseMethod(method)}
                  >
                    {method === "AI"
                      ? "Let AI create them"
                      : "Upload them myself"}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              ))}
            </div>
          ) : draft.stage === "scenes" && attempt ? (
            <>
              <div className="imagery-row imagery-between">
                <div>
                  <h2 className="type-section-title">
                    Chapter {attempt.chapter} of 7
                  </h2>
                  <p className="type-caption">
                    {draft.method === "MANUAL"
                      ? "Manual creation"
                      : "AI creation"}{" "}
                    · {attempt.approved.length} chapters reviewed
                    {draft.attempts[draft.method === "AI" ? "MANUAL" : "AI"]
                      ? " · other attempt kept"
                      : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    setSwitchTo(draft.method === "AI" ? "MANUAL" : "AI")
                  }
                >
                  Change creation method
                </Button>
              </div>
              <nav className="imagery-chapters" aria-label="Season chapters">
                {Array.from({ length: 7 }, (_, index) => index + 1).map(
                  (chapter) => (
                    <Button
                      key={chapter}
                      size="sm"
                      variant={
                        chapter === attempt.chapter ? "primary" : "ghost"
                      }
                      aria-current={
                        chapter === attempt.chapter ? "step" : undefined
                      }
                      disabled={
                        busy ||
                        chapter > Math.min(7, attempt.approved.length + 1)
                      }
                      onClick={() =>
                        void change({
                          ...draft,
                          attempts: {
                            ...draft.attempts,
                            [draft.method!]: { ...attempt, chapter },
                          },
                        })
                      }
                    >
                      {attempt.approved.includes(chapter) && (
                        <Check aria-hidden="true" />
                      )}
                      Chapter {chapter}
                    </Button>
                  ),
                )}
              </nav>
              {draft.method === "MANUAL" ? (
                <>
                  <div className="imagery-row imagery-between">
                    <p className="type-body-sm imagery-muted">
                      {
                        chapterKeys(attempt.chapter).filter(
                          (key) => attempt.assets[key],
                        ).length
                      }{" "}
                      of 6 images uploaded
                    </p>
                    <FormatButtons
                      format={draft.format}
                      disabled={busy}
                      onSelect={(format) => void change({ ...draft, format })}
                    />
                  </div>
                  <div className="imagery-upload-grid">
                    {PACE_OPTIONS.map(({ key, label, tone }) => (
                      <div key={key} data-pace={tone}>
                        <ArtworkUploadCandidate
                          label={label}
                          specification={`${draft.format === "DESKTOP" ? "16:9 desktop" : "9:16 mobile"} · target 2K`}
                          asset={
                            attempt.assets[
                              sceneKey(attempt.chapter, key, draft.format)
                            ]
                          }
                          orientation={
                            draft.format === "DESKTOP" ? "wide" : "portrait"
                          }
                          disabled={busy}
                          failUpload={failUpload}
                          promptBusy={Boolean(task)}
                          promptReady={Boolean(
                            attempt.prompts[
                              sceneKey(attempt.chapter, key, draft.format)
                            ],
                          )}
                          onPrompt={(trigger) =>
                            void generatePrompt(
                              {
                                kind: "scene",
                                format: draft.format,
                                chapter: attempt.chapter,
                                pace: key,
                              },
                              false,
                              trigger,
                            )
                          }
                          onUpload={(asset) =>
                            receiveAsset(asset, draft.format, key)
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="type-body-sm imagery-muted">
                    {completeChapter
                      ? "All six compositions are uploaded. Review each format and pace state next."
                      : `Still needed: ${missingSceneLabels(attempt).join("; ")}.`}
                  </p>
                </>
              ) : (
                <Card
                  material="glass"
                  spacing="action"
                  className="imagery-automatic"
                >
                  <Sparkles aria-hidden="true" />
                  <h3 className="type-section-title">
                    Chapter {attempt.chapter}, composed for your Season.
                  </h3>
                  <p className="type-body imagery-muted">
                    Six prompts and six compositions. Your approved character
                    and preceding chapter guide continuity.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() => void simulateAutomatic()}
                  >
                    Create sample chapter
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              )}
              {draft.method === "MANUAL" && (
                <Button
                  disabled={busy || !completeChapter}
                  onClick={() =>
                    void change({
                      ...draft,
                      stage: "review",
                      reviewTarget: "scenes",
                    })
                  }
                >
                  Review Chapter {attempt.chapter}
                  <ArrowRight aria-hidden="true" />
                </Button>
              )}
            </>
          ) : draft.stage === "ready" ? (
            <>
              <p className="type-body">
                The final pack uses{" "}
                {draft.method === "MANUAL" ? "manually uploaded" : "AI-created"}{" "}
                scenes. Unused kept attempts are deleted only after successful
                activation.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  void change({
                    ...draft,
                    stage: "complete",
                    attempts: draft.method
                      ? { [draft.method]: draft.attempts[draft.method] }
                      : {},
                  })
                }
              >
                Complete sample onboarding
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void change(initialImageryPreview())}
            >
              Start another preview
            </Button>
          )}
        </main>
      )}
      {draft.stage === "review" && (
        <div className="manual-art-review">
          {error && (
            <p className="imagery-error" role="alert">
              {error}
            </p>
          )}
          <SeasonOnboardingView model={model} actions={actions} demo />
        </div>
      )}
      <details className="imagery-preview-states">
        <summary className="type-caption">Preview states · sample only</summary>
        <div className="imagery-row">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setFailPrompt(true)}
          >
            Fail next prompt
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setFailUpload((value) => !value)}
            aria-pressed={failUpload}
          >
            {failUpload ? "Restore uploads" : "Fail uploads"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void change({
                ...initialImageryPreview(),
                stage: "method",
                banners: {
                  DESKTOP: sampleAsset("DESKTOP"),
                  MOBILE: sampleAsset("MOBILE"),
                },
                portrait: sampleAsset("PORTRAIT"),
              })
            }
          >
            Jump to scene method
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              const manual = newAttempt("MANUAL");
              manual.chapter = 5;
              manual.approved = [1, 2, 3, 4];
              for (let chapter = 1; chapter <= 4; chapter++)
                for (const { key } of PACE_OPTIONS)
                  for (const format of ["DESKTOP", "MOBILE"] as const)
                    manual.assets[sceneKey(chapter, key, format)] =
                      sampleAsset(format);
              void change({
                ...draft,
                stage: "scenes",
                method: "MANUAL",
                attempts: { MANUAL: manual },
                manual: true,
              });
            }}
          >
            Manual progress through Chapter 4
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !attempt}
            onClick={() => {
              if (!attempt || !draft.method) return;
              const assets = { ...attempt.assets };
              for (const { key } of PACE_OPTIONS)
                for (const format of ["DESKTOP", "MOBILE"] as const)
                  assets[sceneKey(attempt.chapter, key, format)] =
                    sampleAsset(format);
              void change({
                ...draft,
                attempts: {
                  ...draft.attempts,
                  [draft.method]: { ...attempt, assets },
                },
              });
            }}
          >
            Fill chapter with sample images
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void change(initialImageryPreview())}
          >
            Reset preview
          </Button>
        </div>
        <p className="type-caption">
          Sample prompt-writing batches this visit: {promptRuns}
          {failPrompt ? " · next prompt will fail" : ""}. Test controls can
          replace local preview work.
        </p>
      </details>
      {promptPresence.isPresent && (
        <Drawer
          open={promptOpen}
          presenceState={promptPresence.presenceState}
          exiting={promptPresence.isExiting}
          onPresenceAnimationEnd={promptPresence.onPresenceAnimationEnd}
          onClose={() => setPromptOpen(false)}
          returnFocusRef={promptReturnFocus}
          className="imagery-prompt-drawer"
          titleId={`${promptId}-title`}
          descriptionId={`${promptId}-description`}
          header={
            <>
              <div className="imagery-prompt-heading">
                <h2 id={`${promptId}-title`} className="type-widget-title">
                  Your image prompt
                </h2>
                <p
                  id={`${promptId}-description`}
                  className="type-body-sm imagery-muted"
                >
                  Hand-authored preview sample. The connected flow will use an
                  AI-written, versioned prompt from your approved Season.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close prompt drawer"
                onClick={() => setPromptOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </>
          }
        >
          {error && (
            <p className="imagery-error type-body-sm" role="alert">
              {error}
            </p>
          )}
          {promptText ? (
            <>
              <div className="imagery-prompt-motion">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={promptPaused}
                  aria-controls={`${promptId}-text`}
                  onClick={() => setPromptPaused((value) => !value)}
                >
                  {promptPaused ? (
                    <Play aria-hidden="true" />
                  ) : (
                    <Pause aria-hidden="true" />
                  )}
                  {promptPaused ? "Resume motion" : "Pause motion"}
                </Button>
              </div>
              <div className="imagery-prompt-text">
                <AiGeneratedText
                  key={promptReplay}
                  id={`${promptId}-text`}
                  text={promptText}
                  paused={!promptOpen || promptPaused}
                />
              </div>
              <div className="imagery-row imagery-prompt-actions">
                <Button
                  feedback={{
                    state: clipboard.state,
                    label: "Copy prompt",
                    pendingLabel: "Copying…",
                    successLabel: "Copied",
                    icon: <Copy aria-hidden="true" />,
                  }}
                  aria-disabled={clipboard.state === "pending" || undefined}
                  onClick={() => void clipboard.copy()}
                />
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => prompt && void generatePrompt(prompt, true)}
                >
                  <Sparkles aria-hidden="true" />
                  Regenerate sample prompt
                </Button>
              </div>
              <p
                className={`type-caption${clipboard.failed ? "imagery-error" : ""}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {clipboard.message}
              </p>
            </>
          ) : (
            <>
              <p className="type-body">
                {task || "Prompt preparation failed. Saved work is preserved."}
              </p>
              {task ? (
                <LoadingIndicator
                  area="direction"
                  label="Preparing sample prompts"
                />
              ) : (
                <Button onClick={() => prompt && void generatePrompt(prompt)}>
                  Retry prompt
                </Button>
              )}
            </>
          )}
          <div className="imagery-reference-note">
            <p className="type-body-sm">
              Attach your reviewed originals first, then the approved Season
              artwork shown with the prompt.
            </p>
            <p className="type-caption">
              This preview has no authentic originals. These downloads are
              illustrative artwork only.
            </p>
            <div className="imagery-row">
              <a href={SAMPLE_ART.portrait} download="sample-portrait.webp">
                <Download aria-hidden="true" />
                Sample portrait
              </a>
              {prompt?.kind === "scene" && (
                <a
                  href={
                    prompt.format === "MOBILE"
                      ? SAMPLE_ART.mobile
                      : SAMPLE_ART.desktop
                  }
                  download="sample-banner.webp"
                >
                  <Download aria-hidden="true" />
                  Sample banner
                </a>
              )}
            </div>
          </div>
        </Drawer>
      )}
      <Dialog
        open={Boolean(switchTo)}
        className="imagery-method-switch-dialog"
        onOpenChange={(open) => {
          if (!open) setSwitchTo(null);
        }}
        title={`Switch to ${switchTo === "AI" ? "AI creation" : "manual uploads"}?`}
        description={`Your current ${draft.method === "AI" ? "AI" : "manual"} attempt has ${attempt?.approved.length ?? 0} reviewed chapters. Choose what happens to that progress.`}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => switchTo && void chooseMethod(switchTo, true)}
            >
              Keep progress until onboarding finishes
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => switchTo && void chooseMethod(switchTo, false)}
            >
              Delete progress now
            </Button>
          </>
        }
      >
        <p className="type-body">
          Kept images and reviews can be restored when you switch back. The
          selected attempt alone becomes your final scene pack.
        </p>
        {switchTo && draft.attempts[switchTo] && (
          <p className="type-body-sm">
            Your kept {switchTo === "AI" ? "AI" : "manual"} attempt will resume
            at Chapter {draft.attempts[switchTo]!.chapter}.
          </p>
        )}
      </Dialog>
    </ArtworkPreviewShell>
  );
}

export { FormatButtons } from "@/features/seasons/living/imagery/components/format-buttons.component";
