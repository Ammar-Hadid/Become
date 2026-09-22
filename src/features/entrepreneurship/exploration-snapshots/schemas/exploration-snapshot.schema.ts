import { z } from "zod";
import {
  EXPLORATION_CITATION_STANCES,
  EXPLORATION_CLAIM_KINDS,
  EXPLORATION_KNOWLEDGE_LANES,
} from "@/features/entrepreneurship/exploration-snapshots/constants/exploration-snapshot.constants";

const citationSchema = z.object({
  observationId: z.string().trim().min(1).max(100),
  observationRevisionId: z.string().trim().min(1).max(100),
  stance: z.enum(EXPLORATION_CITATION_STANCES),
  note: z.string().trim().max(2000).nullable().default(null),
});

export const explorationClaimSchema = z
  .object({
    nicheId: z.string().trim().min(1).max(100),
    lane: z.enum(EXPLORATION_KNOWLEDGE_LANES),
    kind: z.enum(EXPLORATION_CLAIM_KINDS),
    statement: z.string().trim().min(1).max(6000),
    citations: z.array(citationSchema).max(100).default([]),
  })
  .refine(
    (value) => value.citations.length > 0,
    "A finding needs at least one source observation.",
  );

export const explorationClaimCorrectionSchema =
  explorationClaimSchema.safeExtend({
    expectedVersion: z.number().int().positive(),
    correctionReason: z.string().trim().min(1).max(2000),
  });

export const explorationUncertaintySchema = z.object({
  nicheId: z.string().trim().min(1).max(100),
  lane: z.enum(EXPLORATION_KNOWLEDGE_LANES),
  statement: z.string().trim().min(1).max(6000),
});

export const explorationUncertaintyCorrectionSchema =
  explorationUncertaintySchema.extend({
    expectedVersion: z.number().int().positive(),
    correctionReason: z.string().trim().min(1).max(2000),
  });

export const publishExplorationSnapshotSchema = z
  .object({
    nicheId: z.string().trim().min(1).max(100),
    claimIds: z.array(z.string().trim().min(1).max(100)).max(200).default([]),
    uncertaintyIds: z
      .array(z.string().trim().min(1).max(100))
      .max(200)
      .default([]),
  })
  .refine(
    (value) => value.claimIds.length > 0 || value.uncertaintyIds.length > 0,
    "Publish at least one claim or uncertainty.",
  );
