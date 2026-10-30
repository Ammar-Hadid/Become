import { z } from "zod";

export const characterSourceImageSchema = z.object({
  href: z.url(),
  alt: z.string(),
  sourceUrl: z.url(),
  sourceLabel: z.string(),
});
export type CharacterSourceImage = z.infer<typeof characterSourceImageSchema>;
export const characterCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  nativeName: z.string(),
  aliases: z.array(z.string()),
  description: z.string(),
  sourceUrl: z.url(),
  imageUrl: z.url().nullable(),
  images: z.array(characterSourceImageSchema),
  works: z.array(
    z.object({
      id: z.number().int(),
      cover: z.url().nullable().optional(),
      year: z.number().int().nullable().optional(),
      catalogueId: z.number().int().nullable(),
      title: z.string(),
      adaptation: z.string(),
      sourceUrl: z.url(),
    }),
  ),
});
export type CharacterCandidate = z.infer<typeof characterCandidateSchema>;
export type CharacterLookupResult = {
  candidates: CharacterCandidate[];
  suggestedId: string | null;
  suggestedWorkId: number | null;
  aiUsed: boolean;
  notice: string | null;
};
