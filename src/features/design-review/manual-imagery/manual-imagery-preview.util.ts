import { z } from "zod";
import { DEFAULT_AVATAR_PLACEMENT } from "@/components/ui/character-avatar/character-avatar-editor.component";

export const PREVIEW_STORAGE_KEY = "become-manual-imagery-preview-v1";
export const PACE_OPTIONS = [
  { key: "FAR_BEHIND", label: "Behind pace", tone: "danger" },
  { key: "NEUTRAL", label: "In progress", tone: "primary" },
  { key: "ON_TRACK", label: "On track", tone: "success" },
] as const;
export type Pace = (typeof PACE_OPTIONS)[number]["key"];
export type Format = "DESKTOP" | "MOBILE";
export type Method = "MANUAL" | "AI";
export const SAMPLE_ART = {
  desktop: "/design-review/character-workspace-v3/levi-desktop-v2.webp",
  mobile: "/design-review/character-workspace-v3/levi-phone-v2.webp",
  portrait: "/design-review/character-workspace-v3/levi-avatar.webp",
};
const assetSchema = z.object({
  href: z
    .string()
    .refine(
      (value) =>
        value.startsWith("data:image/") ||
        Object.values(SAMPLE_ART).includes(value),
    ),
  filename: z.string().max(300),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type PreviewAsset = z.infer<typeof assetSchema>;
const attemptSchema = z.object({
  method: z.enum(["MANUAL", "AI"]),
  chapter: z.number().int().min(1).max(7),
  assets: z.record(z.string(), assetSchema),
  approved: z.array(z.number().int().min(1).max(7)),
  prompts: z.record(z.string(), z.string()),
});
export type PreviewAttempt = z.infer<typeof attemptSchema>;
export const imageryPreviewSchema = z.object({
  stage: z.enum([
    "banner",
    "portrait",
    "method",
    "scenes",
    "review",
    "ready",
    "complete",
  ]),
  reviewTarget: z.enum(["banner", "portrait", "scenes"]),
  manual: z.boolean(),
  format: z.enum(["DESKTOP", "MOBILE"]),
  banners: z.object({
    DESKTOP: assetSchema.optional(),
    MOBILE: assetSchema.optional(),
  }),
  portrait: assetSchema.optional(),
  crop: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    zoom: z.number().min(1).max(2),
  }),
  prompts: z.record(z.string(), z.string()),
  method: z.enum(["MANUAL", "AI"]).nullable(),
  attempts: z.object({
    MANUAL: attemptSchema.optional(),
    AI: attemptSchema.optional(),
  }),
});
export type ImageryPreview = z.infer<typeof imageryPreviewSchema>;
export function initialImageryPreview(): ImageryPreview {
  return {
    stage: "banner",
    reviewTarget: "banner",
    manual: false,
    format: "DESKTOP",
    banners: {},
    crop: DEFAULT_AVATAR_PLACEMENT,
    prompts: {},
    method: null,
    attempts: {},
  };
}
export function sceneKey(chapter: number, pace: Pace, format: Format) {
  return `${chapter}:${pace}:${format}`;
}
export function chapterKeys(chapter: number) {
  return PACE_OPTIONS.flatMap(({ key }) =>
    (["DESKTOP", "MOBILE"] as const).map((format) =>
      sceneKey(chapter, key, format),
    ),
  );
}
export function missingSceneLabels(attempt: PreviewAttempt) {
  return PACE_OPTIONS.flatMap(({ key, label }) =>
    (["DESKTOP", "MOBILE"] as const)
      .filter(
        (format) => !attempt.assets[sceneKey(attempt.chapter, key, format)],
      )
      .map(
        (format) => `${label} · ${format === "DESKTOP" ? "desktop" : "mobile"}`,
      ),
  );
}
export function sampleAsset(format: Format | "PORTRAIT"): PreviewAsset {
  return {
    href:
      format === "PORTRAIT"
        ? SAMPLE_ART.portrait
        : format === "MOBILE"
          ? SAMPLE_ART.mobile
          : SAMPLE_ART.desktop,
    filename: "Illustrative sample artwork",
    width: format === "PORTRAIT" ? 1024 : format === "MOBILE" ? 941 : 2172,
    height: format === "PORTRAIT" ? 1024 : format === "MOBILE" ? 1672 : 724,
  };
}
/** Hand-authored demonstration, never a connected AI result or a production prompt. */
export function samplePrompt(
  kind: "banner" | "portrait" | "scene",
  format: Format,
  chapter = 1,
  pace: Pace = "NEUTRAL",
) {
  const progression = [
    "Establish the quiet mountain city at dawn, with unfinished stone paths and a distant ridge",
    "Reveal a clearer route through the city, with familiar roofs and the same distant ridge",
    "Develop the courtyard and its planted terraces without changing the city's geography",
    "Open a wider view over the connected terraces and settled streets",
    "Show the city taking a more coherent shape through detailed pathways and gardens",
    "Bring the connected courtyards and terraces into a mature, recognizable world",
    "Resolve the visual journey through a fully established mountain city, retaining the first chapter's landmarks",
  ];
  const state =
    pace === "ON_TRACK"
      ? "Show believable care and visible development. Levi acknowledges it through a restrained, attentive expression."
      : pace === "FAR_BEHIND"
        ? "Show one unfinished, neglected pathway. Levi notices the gap with quiet concern; do not turn the scene into a battle or disaster."
        : "Show ongoing work, with some finished details and some unfinished. Levi observes calmly without implying success or failure.";
  const composition =
    kind === "portrait"
      ? "Create a separate square 1:1 profile portrait. Keep the face legible inside a small circular crop, with space for reframing."
      : kind === "banner" && format === "DESKTOP"
        ? "Create a 21:9 desktop banner. Place the face and upper body center-right, with detailed scenery and quiet space on the left for interface copy."
        : format === "MOBILE"
          ? "Create a separate 9:16 phone composition, never a desktop crop. Keep the face in the upper half and leave quiet space below it for interface copy."
          : "Create a 16:9 desktop scene. Keep the face legible, the setting detailed and the interface-copy region quiet.";
  return `Create one finished illustration of Levi Ackerman from Attack on Titan, TV anime adaptation. Preserve the approved face, hair, proportions and clothing from the attached identity references.\n\n${kind === "scene" ? `Chapter ${chapter} of 7. ${progression[chapter - 1]}. ${state}` : "Place him in a quiet mountain city with soft early morning light. Use a restrained expression and a purposeful, natural pose."}\n\n${composition}\n\nUse cinematic depth, expressive but controlled color and consistent lighting across character and scenery. Target 2K quality. No baked-in text, interface, badges, logos or speech bubbles. These are proposed illustrations, not evidence of the owner's actual progress.\n\nAttach character identity references first, then approved Season artwork for continuity. Reuse the recognizable landmarks and appearance in every chapter.`;
}

function openPreviewDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("become-artwork-candidates", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Local preview storage is unavailable."));
  });
}
export async function readImageryPreview(): Promise<ImageryPreview | null> {
  const db = await openPreviewDatabase();
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db
        .transaction("drafts", "readonly")
        .objectStore("drafts")
        .get(PREVIEW_STORAGE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Could not restore the local preview."));
    });
    if (raw === undefined) return null;
    const parsed = imageryPreviewSchema.safeParse(raw);
    if (!parsed.success)
      throw new Error(
        "The saved preview is incompatible. Reset the preview to start again.",
      );
    return parsed.data;
  } finally {
    db.close();
  }
}
export async function saveImageryPreview(value: ImageryPreview) {
  const db = await openPreviewDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("drafts", "readwrite");
      transaction
        .objectStore("drafts")
        .put(imageryPreviewSchema.parse(value), PREVIEW_STORAGE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(
          new Error(
            "Save failed. Your current preview is still here; try again.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
