import { z } from "zod";

const source = z
  .object({
    id: z.string().max(200),
    kind: z.enum([
      "CURATED_QUOTE",
      "CURATED_IMAGE",
      "SOURCE_WORK",
      "RESEARCH_SOURCE",
    ]),
    title: z.string().max(500),
    url: z
      .string()
      .url()
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "Source references must use HTTP or HTTPS.",
      )
      .nullable(),
    attribution: z.string().max(500),
    attributionStatus: z.enum([
      "VERIFIED",
      "UNVERIFIED",
      "PARAPHRASE",
      "UNKNOWN",
    ]),
    excerpt: z.string().max(1200),
    instructionStatus: z.literal("SOURCE_DATA"),
  })
  .strict();
const characteristic = z
  .object({
    description: z.string().min(1).max(1200),
    sourceIds: z.array(z.string().max(200)).min(1).max(12),
    qualification: z.string().max(600),
  })
  .strict();
/** Phase 8 supplies this researched profile. Phase 7 never infers one from names/quotes. */
export const groundedPersonaProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    profileId: z.string().min(1).max(200),
    version: z.number().int().positive(),
    identityFingerprint: z.string().min(1),
    sourceContextFingerprint: z.string().min(1),
    communicationTendencies: z.array(characteristic).max(12),
    temperament: z.array(characteristic).max(12),
    valuesAndPriorities: z.array(characteristic).max(12),
    challengingAndSupporting: z.array(characteristic).max(12),
    behavioralTendencies: z.array(characteristic).max(12),
    antiCaricatureBoundaries: z.array(characteristic).max(12),
    sources: z.array(source).min(1).max(40),
    preparedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((profile, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(profile)).byteLength >
      16 * 1024
    )
      ctx.addIssue({
        code: "custom",
        message:
          "The compact profile exceeds 16 KiB; use bounded source references and retrieve detail separately.",
      });
    const ids = new Set(profile.sources.map((s) => s.id));
    if (ids.size !== profile.sources.length)
      ctx.addIssue({
        code: "custom",
        message: "Profile sources must be unique.",
      });
    for (const key of [
      "communicationTendencies",
      "temperament",
      "valuesAndPriorities",
      "challengingAndSupporting",
      "behavioralTendencies",
      "antiCaricatureBoundaries",
    ] as const)
      for (const item of profile[key])
        if (item.sourceIds.some((id) => !ids.has(id)))
          ctx.addIssue({
            code: "custom",
            path: [key],
            message:
              "Every characteristic requires an included supporting source.",
          });
  });
export const personaInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    fingerprint: z.string(),
    sourceFingerprint: z.string(),
    identity: z
      .object({
        fingerprint: z.string().length(64),
        id: z.string().nullable(),
        revision: z.number().int(),
        name: z.string(),
        category: z.string().nullable(),
        work: z.string(),
        adaptation: z.string(),
        contextFingerprint: z.string(),
      })
      .nullable(),
    groundedProfile: groundedPersonaProfileSchema.nullable(),
    profileStatus: z.enum(["NO_COTS", "AWAITING_PHASE_8_PROFILE", "GROUNDED"]),
    constraints: z.object({
      admiredTraits: z.string(),
      rejectedTraits: z.string(),
      standards: z.array(
        z.object({
          trait: z.string(),
          behavior: z.string(),
          goalId: z.string().optional(),
          criterionId: z.string().optional(),
        }),
      ),
      seasonAnswers: z.record(z.string(), z.string()),
    }),
    approvedSources: z.array(source),
    omittedSourceCount: z.number().int().nonnegative(),
    interpretation: z.literal("GROUNDED_PROFILE_CONSTRAINED_BY_USER_CHOICES"),
    factualBoundary: z.literal(
      "PERSONALITY_NEVER_CHANGES_FACTS_QUALIFICATION_UNCERTAINTY_OR_SAFETY",
    ),
    warnings: z.array(z.string()),
    payloadBytes: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.groundedProfile) {
      if (
        input.profileStatus !== "GROUNDED" ||
        !input.identity ||
        input.groundedProfile.identityFingerprint !==
          input.identity.fingerprint ||
        input.groundedProfile.sourceContextFingerprint !==
          input.identity.contextFingerprint
      )
        ctx.addIssue({
          code: "custom",
          path: ["groundedProfile"],
          message:
            "Grounded characteristics must match this exact character identity and work/adaptation context.",
        });
    } else if (
      input.profileStatus !==
      (input.identity ? "AWAITING_PHASE_8_PROFILE" : "NO_COTS")
    )
      ctx.addIssue({
        code: "custom",
        path: ["profileStatus"],
        message:
          "The profile status must describe the supplied identity and profile.",
      });
  });
export type PersonaInput = z.infer<typeof personaInputSchema>;
export type GroundedPersonaProfile = z.infer<
  typeof groundedPersonaProfileSchema
>;
export const futureGeneratedOutputBindingSchema = z
  .object({
    schemaVersion: z.literal(1),
    reviewEditionId: z.string().min(1),
    reviewFingerprint: z.string().min(1),
    contextFingerprint: z.string().min(1),
    personaInputFingerprint: z.string().min(1),
    personaProfileId: z.string().min(1),
    personaProfileVersion: z.number().int().positive(),
    sourceIds: z.array(z.string()).max(100),
    generatedAt: z.iso.datetime(),
    model: z.object({
      provider: z.string(),
      name: z.string(),
      version: z.string().nullable(),
    }),
    attribution: z.literal("GENERATED_CHARACTER_INSPIRED_WRITING"),
    replay: z.literal("SAVED_OUTPUT_ONLY"),
  })
  .strict();
