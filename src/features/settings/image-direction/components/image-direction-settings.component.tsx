"use client";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, SlidersHorizontal } from "lucide-react";
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  Select,
  type SelectOption,
} from "@/components/ui/forms/select.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import type { ImagePromptPackageView } from "./image-direction-package-preview.component";
import {
  ImageDirectionTemplateEditor,
  type ImageDirectionTemplateView,
} from "./image-direction-template-editor.component";
import type { ImageTemplateAuthoring } from "@/features/seasons/living/image-direction/schemas/image-template-authoring.schema";
import { FormatButtons } from "@/features/seasons/living/imagery/components/format-buttons.component";
import { ImagePromptDrawer } from "@/features/seasons/living/imagery/components/image-prompt-drawer.component";
import {
  recipeKey,
  PACE_OPTIONS,
  type RecipeGroup,
  type Format,
  type Pace,
} from "@/features/seasons/living/imagery/utils/imagery-selection.util";
import "../styles/image-direction-settings.css";
import "@/features/seasons/living/imagery/styles/imagery-workspace.css";
type SeasonView = {
  year: number;
  quarter: number;
  label: string;
  previews: { key: string; chapter?: number; href: string }[];
};

export type ImageDirectionSettingsView = {
  templates: ImageDirectionTemplateView[];
  seasons: SeasonView[];
};

type MutationResult = {
  settings?: ImageDirectionSettingsView;
  package?: ImagePromptPackageView;
  error?: string | null;
};

type PreviewSource = "draft" | "published";

function seasonValue(season: SeasonView) {
  return `${season.year}:${season.quarter}`;
}

export function ImageDirectionSettings({
  initialSettings,
}: {
  initialSettings: ImageDirectionSettingsView;
}) {
  const router = useRouter();
  const { play } = useInterfaceSound();
  const [settings, setSettings] = useState(initialSettings);
  const [group, setGroup] = useState<RecipeGroup>("banners");
  const [format, setFormat] = useState<Format>("DESKTOP");
  const [pace, setPace] = useState<Pace>("NEUTRAL");
  const [preview, setPreview] = useState(false);
  const promptTrigger = useRef<HTMLElement | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(
    initialSettings.seasons[0] ? seasonValue(initialSettings.seasons[0]) : "",
  );
  const [source, setSource] = useState<PreviewSource>("published");
  const [chapter, setChapter] = useState("1");
  const selectedKey = recipeKey(group, format, Number(chapter), pace);
  const [imageFailed, setImageFailed] = useState(false);
  const [imagePackage, setImagePackage] =
    useState<ImagePromptPackageView | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTemplate =
    settings.templates.find((template) => template.key === selectedKey) ??
    settings.templates[0] ??
    null;
  const season = settings.seasons.find(
    (item) => seasonValue(item) === selectedSeason,
  );
  const selectedSource =
    source === "draft" && selectedTemplate?.draft ? "draft" : "published";
  const imageryKey = selectedTemplate?.key;
  const isScene = Boolean(imageryKey?.startsWith("scene-"));
  const imageHref =
    season?.previews.find(
      (preview) =>
        preview.key === imageryKey &&
        (!isScene || preview.chapter === Number(chapter)),
    )?.href ?? null;
  const seasonOptions = useMemo<SelectOption[]>(
    () =>
      settings.seasons.map((item) => ({
        value: seasonValue(item),
        label: item.label,
      })),
    [settings.seasons],
  );
  const sourceOptions: SelectOption<PreviewSource>[] = [
    ...(selectedTemplate?.published
      ? [
          {
            value: "published" as const,
            label: `Published v${selectedTemplate.published.version}`,
          },
        ]
      : []),
    ...(selectedTemplate?.draft
      ? [
          {
            value: "draft" as const,
            label: `Saved draft v${selectedTemplate.draft.version}`,
          },
        ]
      : []),
  ];

  async function mutate(
    payload: Record<string, unknown> & { action: string },
    successMessage: string,
  ) {
    setBusyAction(payload.action);
    setError("");
    setMessage("");
    const timeoutSignal = AbortSignal.timeout(15_000);
    try {
      const response = await fetch("/api/settings/image-direction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: timeoutSignal,
      });
      const result = (await response.json()) as MutationResult;
      if (!response.ok)
        throw new Error(result.error ?? "Could not update Image Direction.");
      if (result.settings) setSettings(result.settings);
      setImagePackage(result.package ?? null);
      setMessage(successMessage);
      play("saveConfirmed");
      return true;
    } catch (cause) {
      setError(
        timeoutSignal.aborted
          ? "Could not confirm the request. Your edits are preserved; reload saved versions before retrying."
          : cause instanceof Error
          ? cause.message
          : "Could not update Image Direction.",
      );
      play("actionBlocked");
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function inspect() {
    if (!selectedTemplate || !season) return;
    const inspected = await mutate(
      {
        action: "inspect",
        key: selectedTemplate.key,
        year: season.year,
        quarter: season.quarter,
        chapter: isScene ? Number(chapter) : undefined,
        useDraft: selectedSource === "draft",
      },
      `Assembled ${selectedSource} prompt for ${season.label}. No image was generated.`,
    );
    if (inspected) setPreview(true);
  }

  function navigate(change: () => void) {
    if (editorDirty) {
      setError("Save or discard your edits before choosing another recipe.");
      return;
    }
    change();
    setError("");
    setMessage("");
    setImagePackage(null);
  }
  const formatSpec =
    group === "style"
      ? "Every image type"
      : group === "portrait"
        ? "1:1 · safe circular crop"
        : group === "reference"
          ? "16:9 · optional reference sheet"
          : format === "MOBILE"
            ? "9:16 · separate mobile composition"
            : group === "banners"
              ? "21:9 · desktop banner"
              : "16:9 · desktop scenery";
  if (!selectedTemplate)
    return (
      <EmptyState
        pattern="editorial-canvas"
        area="direction"
        title="No recipe library"
        description="Image recipes are not available yet."
      />
    );
  return (
    <>
      <section
        className="recipe-library-workspace"
        aria-label="Image Prompts workspace"
      >
        <WorkspaceHeader
          eyebrow="Settings"
          title="Image Prompts"
          description="Shape the shared style, then refine each image recipe. Publishing applies to future generation."
          actions={
            <Button
              variant="ghost"
              disabled={Boolean(busyAction) || editorDirty || !season}
              onClick={(event) => {
                promptTrigger.current = event.currentTarget;
                void inspect();
              }}
            >
              <Eye aria-hidden="true" />
              Preview with a Season
            </Button>
          }
        />
        {error && (
          <p className="imagery-error type-body-sm" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="type-body-sm" role="status">
            {message}
          </p>
        )}
        <WorkspacePanel
          title="Preview with your Season"
          description="Inspect the exact prompt and reference package without a model call or image cost."
          spacing="dense"
          className="image-direction-season-context"
        >
          <div className="imagery-row">
            <Select
              label="Choose a Season to inspect"
              value={selectedSeason}
              options={seasonOptions}
              disabled={Boolean(busyAction)}
              onValueChange={(value) => {
                setSelectedSeason(value);
                setImagePackage(null);
                setImageFailed(false);
              }}
            />
            {sourceOptions.length > 1 && (
              <Select
                label="Choose a template version"
                value={selectedSource}
                options={sourceOptions}
                onValueChange={setSource}
              />
            )}
          </div>
          {!season && (
            <p className="type-body-sm imagery-muted">
              Save a Season to preview its actual character and imagery context.
              You can still edit recipes now.
            </p>
          )}
        </WorkspacePanel>
        <div className="recipe-library-grid">
          <Card
            as="section"
            spacing="dense"
            className="recipe-library-navigation"
            aria-label="Image recipe navigation"
          >
            <p className="type-overline">Your recipe library</p>
            <nav aria-label="Recipe categories">
              {(
                [
                  { key: "style", label: "Shared style" },
                  { key: "banners", label: "Banners" },
                  { key: "portrait", label: "Portrait" },
                  { key: "chapters", label: "Chapters" },
                ] as const
              ).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={group === key ? "primary" : "ghost"}
                  disabled={Boolean(busyAction)}
                  aria-pressed={group === key}
                  onClick={() => navigate(() => setGroup(key))}
                >
                  {label}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </nav>
            <WorkspaceDisclosure title="Reference sheet">
              <Button
                variant={group === "reference" ? "secondary" : "ghost"}
                size="sm"
                disabled={Boolean(busyAction)}
                onClick={() => navigate(() => setGroup("reference"))}
              >
                <SlidersHorizontal aria-hidden="true" />
                Reference sheet
              </Button>
            </WorkspaceDisclosure>
            <p className="type-caption imagery-muted">
              44 banner and scene recipes, plus portrait. Only the selected
              recipe is open.
            </p>
          </Card>
          <section
            className="recipe-library-editor"
            aria-label="Selected recipe"
          >
            <div className="recipe-library-selectors">
              {group === "chapters" && (
                <Select
                  label="Choose chapter"
                  value={String(chapter)}
                  options={Array.from({ length: 7 }, (_, index) => ({
                    value: String(index + 1),
                    label: `Chapter ${index + 1}`,
                  }))}
                  onValueChange={(value) => navigate(() => setChapter(value))}
                  disabled={Boolean(busyAction)}
                />
              )}
              {(group === "chapters" || group === "banners") && (
                <FormatButtons
                  format={format}
                  disabled={Boolean(busyAction)}
                  onSelect={(value) => navigate(() => setFormat(value))}
                />
              )}
              {group === "chapters" && (
                <div
                  className="imagery-row"
                  role="group"
                  aria-label="Recipe pace state"
                >
                  {PACE_OPTIONS.map(({ key, label, tone }) => (
                    <span key={key} data-pace={tone}>
                      <Button
                        size="sm"
                        variant={pace === key ? "primary" : "secondary"}
                        disabled={Boolean(busyAction)}
                        aria-pressed={pace === key}
                        onClick={() => navigate(() => setPace(key))}
                      >
                        {label}
                      </Button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="imagery-row imagery-between">
              <h2 className="type-section-title">{selectedTemplate.label}</h2>
              <span className="type-caption imagery-muted">
                {formatSpec}
                {group !== "style" ? " · target 2K" : ""}
              </span>
            </div>
            <ImageDirectionTemplateEditor
              key={selectedKey}
              template={selectedTemplate}
              busy={Boolean(busyAction)}
              onDirtyChange={setEditorDirty}
              onSaveDraft={async (
                content: { text: string; authoring: ImageTemplateAuthoring },
                expectedVersion,
              ) => {
                const saved = await mutate(
                  {
                    action: "save-draft",
                    key: selectedTemplate.key,
                    ...content,
                    expectedVersion,
                  },
                  "Draft saved. Inspect it with a real Season before publishing.",
                );
                if (saved) setSource("draft");
                return saved;
              }}
              onPublish={async (expectedVersion) => {
                const published = await mutate(
                  {
                    action: "publish",
                    key: selectedTemplate.key,
                    expectedVersion,
                  },
                  "Template published for future image generations. Existing approved images remain unchanged.",
                );
                if (published) setSource("published");
                return published;
              }}
            />
          </section>
          <aside className="recipe-library-brief">
            <Card material="glass" spacing="dense">
              <p className="type-overline">From rules to imagery</p>
              <h2 className="type-widget-title">What the AI receives</h2>
              <ol className="recipe-library-inputs">
                <li>
                  <strong>Shared style</strong>
                  <span>Your consistent visual language.</span>
                </li>
                <li>
                  <strong>This recipe</strong>
                  <span>Purpose, composition and chapter direction.</span>
                </li>
                <li>
                  <strong>Your approved Season</strong>
                  <span>Character, voice, world and visual boundaries.</span>
                </li>
              </ol>

              <p className="type-caption">
                Approved imagery stays visible until you review and approve its
                replacement in the Season.
              </p>
            </Card>
            {imageHref && !imageFailed && (
              <div className="image-direction-art-frame">
                <Image
                  src={imageHref}
                  alt={`Saved ${selectedTemplate.label}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 25vw"
                  unoptimized
                  onError={() => setImageFailed(true)}
                />
              </div>
            )}
            <Button
              variant="ghost"
              disabled={!season || Boolean(busyAction)}
              onClick={() => {
                if (season)
                  router.push(
                    `/direction/seasons/${season.year}/${season.quarter}/opening`,
                  );
              }}
            >
              Open Season <ArrowRight aria-hidden="true" />
            </Button>
          </aside>
        </div>
      </section>
      <ImagePromptDrawer
        open={preview}
        onClose={() => setPreview(false)}
        imagePackage={imagePackage}
        busy={Boolean(busyAction)}
        error={error}
        onRegenerate={() => void inspect()}
        returnFocusRef={promptTrigger}
      />
    </>
  );
}
