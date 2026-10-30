import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { IMAGE_TEMPLATE_DEFINITIONS } from "../constants/image-direction.constants";
import { requireImageDirectionOwner } from "./image-direction-owner.service";
import {
  IMAGE_PROMPT_VARIABLES,
  imageTemplateAuthoringSchema,
  savedTemplateAuthoring,
  variablesInPrompt,
} from "../schemas/image-template-authoring.schema";

const keySchema = z.enum(
  IMAGE_TEMPLATE_DEFINITIONS.map((item) => item.key) as [string, ...string[]],
);
const saveSchema = z.object({
  key: keySchema,
  text: z.string().trim().min(40).max(12000),
  authoring: imageTemplateAuthoringSchema,
  expectedVersion: z.number().int().min(0),
});
const publishSchema = saveSchema.pick({ key: true, expectedVersion: true });
const templateVariables = new Set<string>(
  IMAGE_PROMPT_VARIABLES.map((variable) => variable.key),
);

export async function ensureImageDirectionTemplates(userId: string) {
  await prisma.imageDirectionTemplateVersion.createMany({
    data: IMAGE_TEMPLATE_DEFINITIONS.map((item) => ({
      userId,
      key: item.key,
      version: 1,
      text: item.text,
      publishedAt: new Date(),
    })),
    skipDuplicates: true,
  });
}

export async function getPublishedImageTemplates(userId: string) {
  await ensureImageDirectionTemplates(userId);
  const rows = await prisma.imageDirectionTemplateVersion.findMany({
    where: { userId, publishedAt: { not: null } },
    orderBy: { version: "desc" },
  });
  return IMAGE_TEMPLATE_DEFINITIONS.map((definition) => {
    const row = rows.find((item) => item.key === definition.key);
    if (!row) throw new Error(`No published image template: ${definition.key}`);
    return row;
  });
}

export async function saveImageTemplateDraft(userId: string, input: unknown) {
  await requireImageDirectionOwner(userId);
  const data = saveSchema.parse(input);
  const usedVariables = variablesInPrompt(
    [data.text, data.authoring.intent, ...data.authoring.rules].join("\n"),
  );
  const unknownVariables = usedVariables.filter(
    (name) => !templateVariables.has(name),
  );
  if (unknownVariables.length)
    throw new DirectionError(
      `Unknown template variable: ${unknownVariables[0]}.`,
    );
  const missingVariables = usedVariables.filter(
    (name) => !data.authoring.variables.includes(name),
  );
  if (missingVariables.length)
    throw new DirectionError(
      `Save {{${missingVariables[0]}}} in this template's variables first.`,
    );
  const sceneVariables = data.authoring.variables.filter((name) =>
    IMAGE_PROMPT_VARIABLES.some(
      (variable) => variable.key === name && "sceneOnly" in variable,
    ),
  );
  if (!data.key.startsWith("scene-") && sceneVariables.length)
    throw new DirectionError(
      `{{${sceneVariables[0]}}} is available only for scenery templates.`,
    );
  await ensureImageDirectionTemplates(userId);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`image-template:${userId}:${data.key}`},0))::text`;
    const latest = await tx.imageDirectionTemplateVersion.findFirst({
      where: { userId, key: data.key },
      orderBy: { version: "desc" },
    });
    if ((latest?.version ?? 0) !== data.expectedVersion)
      throw new DirectionError(
        "This template changed in another tab. Reopen the latest version before saving.",
        undefined,
        409,
      );
    if (
      latest &&
      latest.text === data.text &&
      JSON.stringify(savedTemplateAuthoring(latest.authoring)) ===
        JSON.stringify(data.authoring) &&
      !latest.publishedAt
    )
      return latest;
    return tx.imageDirectionTemplateVersion.create({
      data: {
        userId,
        key: data.key,
        version: (latest?.version ?? 0) + 1,
        text: data.text,
        authoring: jsonValue(data.authoring),
      },
    });
  });
}

export async function publishImageTemplate(userId: string, input: unknown) {
  await requireImageDirectionOwner(userId);
  const data = publishSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`image-template:${userId}:${data.key}`},0))::text`;
    const latest = await tx.imageDirectionTemplateVersion.findFirst({
      where: { userId, key: data.key },
      orderBy: { version: "desc" },
    });
    if (
      !latest ||
      latest.version !== data.expectedVersion ||
      latest.publishedAt
    )
      throw new DirectionError(
        "Publish the latest saved draft.",
        undefined,
        409,
      );
    return tx.imageDirectionTemplateVersion.update({
      where: { id: latest.id },
      data: { publishedAt: new Date() },
    });
  });
}
