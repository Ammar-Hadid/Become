import { z } from "zod";
import {
  directionFailure,
  directionJson,
  directionResponse,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import { getImageDirectionSettings } from "@/features/seasons/living/image-direction/queries/image-direction.query";
import { requireImageDirectionOwner } from "@/features/seasons/living/image-direction/services/image-direction-owner.service";
import {
  saveImageTemplateDraft,
  publishImageTemplate,
} from "@/features/seasons/living/image-direction/services/image-direction-template.service";
import {
  resolveSeasonImagePackage,
  publicImagePromptPackage,
} from "@/features/seasons/living/image-direction/services/image-prompt-package.service";
import { IMAGE_TEMPLATE_DEFINITIONS } from "@/features/seasons/living/image-direction/constants/image-direction.constants";
import { imageTemplateAuthoringSchema } from "@/features/seasons/living/image-direction/schemas/image-template-authoring.schema";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["save-draft", "publish", "inspect"]),
  key: z.string(),
  text: z.string().optional(),
  authoring: imageTemplateAuthoringSchema.optional(),
  expectedVersion: z.number().int().min(0).optional(),
  year: z.number().int().optional(),
  quarter: z.number().int().optional(),
  useDraft: z.boolean().optional(),
  chapter: z.number().int().min(1).max(7).optional(),
});

function imageRequest(key: string, chapter?: number) {
  const specific = key.match(/^scene-chapter-(\d)-/);
  if (specific) {
    if (chapter !== undefined && chapter !== Number(specific[1]))
      throw new DirectionError("Choose the recipe's matching chapter.");
    chapter = Number(specific[1]);
  }
  chapter ??= 1;
  if (key.startsWith("scene-")) {
    const parts = key.split("-");
    const format: "MOBILE" | "DESKTOP" =
      parts.at(-1) === "mobile" ? "MOBILE" : "DESKTOP";
    const state: "FAR_BEHIND" | "ON_TRACK" | "NEUTRAL" = key.includes(
      "far-behind",
    )
      ? "FAR_BEHIND"
      : key.includes("on-track")
        ? "ON_TRACK"
        : "NEUTRAL";
    const sceneSlot = { chapter, state, format };
    return { variant: key as `scene-${string}`, slot: sceneSlot };
  }
  return {
    variant: (key === "visual-language" ? "banner-desktop" : key) as
      "reference-sheet" | "banner-desktop" | "banner-phone" | "portrait",
  };
}

export async function GET(request: Request) {
  try {
    const user = await directionUser(request);
    return directionResponse({
      error: null,
      settings: await getImageDirectionSettings(user.id),
    });
  } catch (error) {
    return directionFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    await requireImageDirectionOwner(user.id);
    const data = requestSchema.parse(await directionJson(request));
    if (!IMAGE_TEMPLATE_DEFINITIONS.some((item) => item.key === data.key))
      throw new DirectionError("Unknown image direction template.");
    if (data.action === "save-draft") {
      await saveImageTemplateDraft(user.id, {
        key: data.key,
        text: data.text,
        authoring: data.authoring,
        expectedVersion: data.expectedVersion,
      });
      return directionResponse({
        error: null,
        settings: await getImageDirectionSettings(user.id),
      });
    }
    if (data.action === "publish") {
      await publishImageTemplate(user.id, {
        key: data.key,
        expectedVersion: data.expectedVersion,
      });
      return directionResponse({
        error: null,
        settings: await getImageDirectionSettings(user.id),
      });
    }
    if (data.year == null || data.quarter == null)
      throw new DirectionError(
        "Choose a Season to inspect its assembled prompt.",
      );
    const settings = await getImageDirectionSettings(user.id);
    const template = settings.templates.find((item) => item.key === data.key);
    const draft = data.useDraft ? template?.draft : template?.published;
    const result = await resolveSeasonImagePackage(
      user.id,
      data.year,
      data.quarter,
      {
        ...imageRequest(data.key, data.chapter),
        allowTemplateOnly: true,
        draftTemplate: draft
          ? {
              key: data.key,
              version: draft.version,
              text: draft.text,
              authoring: draft.authoring,
            }
          : undefined,
      },
    );
    return directionResponse({
      error: null,
      settings,
      package: publicImagePromptPackage(result),
    });
  } catch (error) {
    return directionFailure(error);
  }
}
