import { z } from "zod";
export const synthesisSourceSchema = z.object({
  key: z.string().min(1).max(200),
  type: z.enum([
    "OBSERVATION",
    "CONVERSATION",
    "MESSAGE",
    "OUTREACH",
    "PROBLEM",
    "ASSESSMENT",
    "EXPLORATION_DECISION",
    "DECISION",
    "OFFER",
    "OFFER_EVENT",
    "EXPERIMENT",
    "RECEIPT",
  ]),
  id: z.string().min(1).max(100),
  revisionId: z.string().min(1).max(100),
  label: z.string().max(240),
  excerpt: z.string().max(5000),
  href: z.string().startsWith("/"),
  occurredAt: z.string(),
  fingerprint: z.string(),
});
export const synthesisSourceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  origin: z.enum(["USER", "NEXO"]).optional(),
  sources: z.array(synthesisSourceSchema).max(100),
});
export const synthesisFindingSchema = z.object({
  claimId: z.string().max(100).nullable(),
  kind: z.enum([
    "FACT",
    "INTERPRETATION",
    "HYPOTHESIS",
    "QUESTION",
    "DECISION",
    "CONTRADICTION",
  ]),
  lane: z.enum(["B2C", "B2B", "CROSS_MARKET"]),
  statement: z.string().trim().min(1).max(2000),
  sourceKeys: z.array(z.string().max(200)).max(12),
});
export const synthesisOutputSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(4000),
  findings: z.array(synthesisFindingSchema).max(30),
  nextQuestions: z.array(z.string().trim().min(1).max(1000)).max(8),
  limitations: z.string().max(2000),
});
export const synthesisContextSchema = z.object({
  schemaVersion: z.literal(1),
  exploration: z.object({
    id: z.string(),
    name: z.string(),
    scope: z.string().nullable(),
  }),
  materialFingerprint: z.string(),
  baseUnderstandingFingerprint: z.string(),
  contextFingerprint: z.string(),
  coverage: z.object({
    eligibleSources: z.number(),
    includedSources: z.number(),
    omittedSources: z.number(),
    eligibleUnderstanding: z.number().default(0),
    includedUnderstanding: z.number().default(0),
    omittedUnderstanding: z.number().default(0),
  }),
  metrics: z.record(z.string(), z.number()),
  sources: z.array(synthesisSourceSchema),
  understanding: z.array(
    z.object({
      id: z.string(),
      revisionId: z.string(),
      kind: z.string(),
      lane: z.string(),
      statement: z.string(),
    }),
  ),
});
export type SynthesisOutput = z.infer<typeof synthesisOutputSchema>;
export type SynthesisSource = z.infer<typeof synthesisSourceSchema>;
export type SynthesisContext = z.infer<typeof synthesisContextSchema>;
