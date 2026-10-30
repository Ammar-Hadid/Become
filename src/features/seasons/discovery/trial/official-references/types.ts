import { z } from "zod";
export const referenceSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  label: z.string(),
  url: z.url(),
  sourceUrl: z.url(),
  group: z.enum(["Official character art", "From the show"]),
  width: z.number(),
  height: z.number(),
});
export type TrialReference = z.infer<typeof referenceSchema>;
export const workSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  medium: z.string(),
  year: z.number().nullable(),
  cover: z.string().nullable(),
});
export type TrialWork = z.infer<typeof workSchema>;
export const characterSchema = z.object({
  characterId: z.number().int(),
  workId: z.number().int(),
  name: z.string(),
  nativeName: z.string(),
  works: z.array(workSchema),
  references: z.array(referenceSchema),
  warnings: z.array(z.string()),
  gate: z.enum(["PASS", "INCOMPLETE"]),
  milliseconds: z.number(),
});
export type TrialCharacter = z.infer<typeof characterSchema>;
export const reportSchema = z.object({
  createdAt: z.string(),
  milliseconds: z.number(),
  requests: z.number(),
  cacheHits: z.number(),
  characters: z.array(characterSchema),
  gate: z.enum(["PASS", "INCOMPLETE"]),
});
export type OfficialTrialReport = z.infer<typeof reportSchema>;
