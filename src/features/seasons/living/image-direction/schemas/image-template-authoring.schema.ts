import { z } from "zod";

export const IMAGE_PROMPT_VARIABLES = [
  {
    key: "character",
    label: "Character name",
    source: "Approved character profile",
  },
  {
    key: "sourceWork",
    label: "Source work",
    source: "Approved character profile",
  },
  {
    key: "adaptation",
    label: "Adaptation",
    source: "Approved character profile",
  },
  { key: "setting", label: "Season setting", source: "Selected Season" },
  { key: "feeling", label: "Feeling", source: "Approved visual intent" },
  { key: "demeanor", label: "Demeanor", source: "Approved visual intent" },
  {
    key: "anchors",
    label: "Identity anchors",
    source: "Approved visual intent",
  },
  { key: "atmosphere", label: "Atmosphere", source: "Approved visual intent" },
  {
    key: "avoid",
    label: "Depictions to avoid",
    source: "Approved visual intent",
  },
  {
    key: "visualDirection",
    label: "Visual identity",
    source: "Approved character profile",
  },
  {
    key: "visualBoundaries",
    label: "Visual boundaries",
    source: "Approved character profile",
  },
  {
    key: "seasonArtDirection",
    label: "Season art direction",
    source: "Selected Season",
  },
  { key: "chapter", label: "Chapter", source: "Scene slot", sceneOnly: true },
  {
    key: "sceneState",
    label: "Progress state",
    source: "Scene slot",
    sceneOnly: true,
  },
] as const;

const variableKeys = IMAGE_PROMPT_VARIABLES.map((variable) => variable.key);
const variableSchema = z.enum(variableKeys as [string, ...string[]]);

export const imageTemplateAuthoringSchema = z.object({
  intent: z.string().trim().max(1000),
  variables: z
    .array(variableSchema)
    .max(IMAGE_PROMPT_VARIABLES.length)
    .refine(
      (variables) => new Set(variables).size === variables.length,
      "Each variable can be saved only once.",
    ),
  rules: z.array(z.string().trim().min(1).max(300)).max(12),
});

export type ImageTemplateAuthoring = z.infer<
  typeof imageTemplateAuthoringSchema
>;

export function savedTemplateAuthoring(
  value: unknown,
): ImageTemplateAuthoring | null {
  const parsed = imageTemplateAuthoringSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function variablesInPrompt(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]),
    ),
  ];
}
