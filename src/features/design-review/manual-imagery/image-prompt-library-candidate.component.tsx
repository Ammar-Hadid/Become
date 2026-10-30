"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Eye, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { Select } from "@/components/ui/forms/select.component";
import { ImageDirectionTemplateEditor } from "@/features/settings/image-direction/components/image-direction-template-editor.component";
import { variablesInPrompt } from "@/features/seasons/living/image-direction/schemas/image-template-authoring.schema";
import { ArtworkPreviewShell } from "./artwork-preview-shell.component";
import { FormatButtons } from "./manual-imagery-candidate.component";
import {
  defaultRecipeLibrary,
  recipeKey,
  recipePreviewSchema,
  type RecipeGroup,
  type RecipePreview,
} from "./image-recipe-preview.util";
import {
  PACE_OPTIONS,
  type Format,
  type Pace,
} from "./manual-imagery-preview.util";
import "@/features/settings/image-direction/styles/image-direction-settings.css";

const storageKey = "become-image-recipe-library-preview-v1";
export function ImagePromptLibraryCandidate() {
  const [library, setLibrary] = useState<RecipePreview>(() => ({
    templates: defaultRecipeLibrary(),
    history: {},
  }));
  const [group, setGroup] = useState<RecipeGroup>("banners");
  const [format, setFormat] = useState<Format>("DESKTOP");
  const [chapter, setChapter] = useState(1);
  const [pace, setPace] = useState<Pace>("NEUTRAL");
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Loading local recipes…");
  const [preview, setPreview] = useState(false);
  const selectedKey = recipeKey(group, format, chapter, pace);
  const template = library.templates[selectedKey];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = recipePreviewSchema.parse(JSON.parse(raw));
          setLibrary({
            ...parsed,
            templates: { ...defaultRecipeLibrary(), ...parsed.templates },
          });
        }
        setStatus(raw ? "Saved on this device" : "Unsaved sample recipes");
      } catch {
        setError(
          "Could not restore local recipes. The defaults are available.",
        );
        setStatus("Restore failed");
      }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function persist(next: RecipePreview, success: string) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setLibrary(next);
      setStatus("Saved on this device");
      setMessage(success);
      setError("");
      return true;
    } catch {
      setError("Save failed. Keep your edits open and try again.");
      setStatus("Save failed");
      return false;
    }
  }
  function navigate(action: () => void) {
    if (dirty) {
      setError("Save or discard your edits before choosing another recipe.");
      return;
    }
    action();
    setMessage("");
    setError("");
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
  return (
    <ArtworkPreviewShell library status={status}>
      <main className="recipe-library-workspace">
        <header className="imagery-introduction">
          <div>
            <p className="type-overline">Settings · owner workspace</p>
            <h1 className="type-season-entry-title">Image Prompts</h1>
            <p className="type-body-lg imagery-muted">
              The rules behind your Season’s imagery. Shape the style once, then
              refine each composition.
            </p>
          </div>
          <Button
            variant="ghost"
            disabled={!loaded || dirty}
            onClick={() => setPreview(true)}
          >
            <Eye aria-hidden="true" />
            Preview with a Season
          </Button>
        </header>
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
        <div className="recipe-library-grid">
          <aside
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
                  disabled={!loaded}
                  aria-pressed={group === key}
                  onClick={() => navigate(() => setGroup(key))}
                >
                  {label}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </nav>
            <details>
              <summary className="type-caption">Advanced</summary>
              <Button
                variant={group === "reference" ? "secondary" : "ghost"}
                size="sm"
                disabled={!loaded}
                onClick={() => navigate(() => setGroup("reference"))}
              >
                <SlidersHorizontal aria-hidden="true" />
                Reference sheet
              </Button>
            </details>
            <p className="type-caption imagery-muted">
              44 banner and scene recipes, plus portrait. Only the selected
              recipe is open.
            </p>
          </aside>
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
                  onValueChange={(value) =>
                    navigate(() => setChapter(Number(value)))
                  }
                  disabled={!loaded}
                />
              )}
              {(group === "chapters" || group === "banners") && (
                <FormatButtons
                  format={format}
                  disabled={!loaded}
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
                        disabled={!loaded}
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
              <h2 className="type-section-title">{template.label}</h2>
              <span className="type-caption imagery-muted">
                {formatSpec}
                {group !== "style" ? " · target 2K" : ""}
              </span>
            </div>
            <ImageDirectionTemplateEditor
              key={`${selectedKey}:${template.draft?.version ?? template.published?.version}`}
              template={template}
              busy={!loaded}
              onDirtyChange={setDirty}
              onSaveDraft={async (content, expectedVersion) => {
                const latest = template.draft ?? template.published;
                if ((latest?.version ?? 0) !== expectedVersion) {
                  setError("This recipe changed. Reopen its latest version.");
                  return false;
                }
                const used = variablesInPrompt(
                  [
                    content.text,
                    content.authoring.intent,
                    ...content.authoring.rules,
                  ].join("\n"),
                );
                if (
                  used.some(
                    (variable) =>
                      !content.authoring.variables.includes(variable),
                  )
                ) {
                  setError(
                    "Add the prompt's placeholders to its saved variables before saving.",
                  );
                  return false;
                }
                const parsed = recipePreviewSchema.safeParse({
                  ...library,
                  templates: {
                    ...library.templates,
                    [selectedKey]: {
                      ...template,
                      draft: { ...content, version: expectedVersion + 1 },
                    },
                  },
                  history: {
                    ...library.history,
                    [selectedKey]: latest
                      ? [...(library.history[selectedKey] ?? []), latest]
                      : [],
                  },
                });
                if (!parsed.success) {
                  setError(
                    "Recipe content is too large or invalid. Review the current fields.",
                  );
                  return false;
                }
                const success = persist(
                  parsed.data,
                  "Draft saved locally. Publish when you’re ready to use it for future prompt writing.",
                );
                if (success) setDirty(false);
                return success;
              }}
              onPublish={async (expectedVersion) => {
                if (
                  !template.draft ||
                  template.draft.version !== expectedVersion
                ) {
                  setError("Publish the latest saved draft.");
                  return false;
                }
                const success = persist(
                  {
                    ...library,
                    templates: {
                      ...library.templates,
                      [selectedKey]: {
                        ...template,
                        published: template.draft,
                        draft: null,
                      },
                    },
                  },
                  "Published in this preview. Existing imagery is unchanged.",
                );
                if (success) setDirty(false);
                return success;
              }}
            />
          </section>
          <aside className="recipe-library-brief">
            <Card material="solid" spacing="action">
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
              <p className="type-body-sm imagery-muted">
                AI writes the creative direction inside these rules. Become
                supplies validated format requirements and ordered image
                references.
              </p>
              <p className="type-caption">
                Publishing affects future prompt writing. Already saved prompts
                keep their own versions.
              </p>
            </Card>
          </aside>
        </div>
      </main>
      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title="Preview with a Season"
        description="Sample context only. Real Seasons and AI-written drafts will be connected after this layout is approved."
      >
        <p className="type-widget-title">
          Levi Ackerman · Attack on Titan · TV anime
        </p>
        <p className="type-body-sm imagery-muted">
          A quiet mountain city · calm, cinematic, early morning light
        </p>
        <dl className="recipe-preview-context">
          <div>
            <dt>Selected recipe</dt>
            <dd>{template.label}</dd>
          </div>
          <div>
            <dt>Published direction · v{template.published?.version ?? "—"}</dt>
            <dd className="type-body-sm">
              {template.published?.text ?? "No published recipe."}
            </dd>
          </div>
          <div>
            <dt>Output requirements</dt>
            <dd>
              {formatSpec}
              {group !== "style" ? " · target 2K" : ""}
            </dd>
          </div>
        </dl>
        <p className="type-caption">
          No text-model or image-provider call is made by this preview.
        </p>
      </Dialog>
    </ArtworkPreviewShell>
  );
}
