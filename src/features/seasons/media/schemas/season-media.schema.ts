import { z } from "zod";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import { operationKey } from "@/features/direction/schemas/direction.schema";
export const seasonMediaCommand = seasonIdentitySchema.extend({
  expectedVersion: z.number().int(),
  operationKey,
});
export const manualProvenanceSchema = z
  .object({
    sourceUrl: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (v) =>
          !v ||
          (() => {
            try {
              return ["http:", "https:"].includes(new URL(v).protocol);
            } catch {
              return false;
            }
          })(),
        "Use an http or https source URL.",
      )
      .default(""),
    sourceTitle: z.string().trim().max(300).default(""),
    credit: z.string().trim().max(500).default(""),
    attributionVerified: z.boolean().default(false),
  })
  .strict();
export const mediaMetadataSchema = z
  .object({
    alt: z.string().trim().max(1000),
    decorative: z.boolean(),
    focalX: z.number().min(0).max(1),
    focalY: z.number().min(0).max(1),
    poster: z.boolean(),
    provenance: manualProvenanceSchema,
  })
  .strict()
  .refine((v) => v.decorative || Boolean(v.alt), {
    message: "Describe this image or mark it decorative.",
    path: ["alt"],
  });
export const quoteDraftSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    attribution: z.string().trim().max(300),
    kind: z.enum(["EXACT", "PARAPHRASE", "UNKNOWN"]),
    featured: z.boolean(),
    provenance: manualProvenanceSchema,
  })
  .strict()
  .refine(
    (v) =>
      v.kind !== "EXACT" ||
      Boolean(
        v.attribution &&
        v.provenance.sourceUrl &&
        v.provenance.attributionVerified,
      ),
    {
      message:
        "Exact quotes need attribution, a source URL, and your verification; otherwise choose unknown or paraphrase.",
      path: ["kind"],
    },
  );
