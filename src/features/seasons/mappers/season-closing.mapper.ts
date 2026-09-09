import { z } from "zod";
import { seasonDraftSchema } from "@/features/seasons/schemas/season.schema";
import type { SeasonClosingCard } from "@/features/seasons/types/season.types";
const provenance = z.object({
  origin: z.enum(["MANUAL", "DISCOVERY"]),
  sourceUrl: z.string().nullable(),
  sourceTitle: z.string().nullable(),
  credit: z.string().nullable(),
  provider: z.string().nullable(),
  externalId: z.string().nullable(),
  selectedAt: z.string(),
  attributionVerified: z.boolean(),
});
const outcome = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ACTIVE", "PAUSED", "CONCLUDED"]),
  outcome: z
    .enum([
      "ACHIEVED",
      "PARTIAL",
      "STOPPED",
      "SUPPORTED",
      "NOT_SUPPORTED",
      "INCONCLUSIVE",
    ])
    .nullable(),
  evaluation: z.object({ progressSummary: z.string() }),
});
const closing = z.object({
  capturedAt: z.string(),
  title: z.string(),
  intention: z.string(),
  note: z.string(),
  character: seasonDraftSchema.shape.character,
  media: z.array(
    z.object({
      id: z.string(),
      href: z.string().regex(/^\/api\/direction\/media\/[a-zA-Z0-9-]+$/),
      alt: z.string(),
      decorative: z.boolean(),
      width: z.number(),
      height: z.number(),
      focalX: z.number(),
      focalY: z.number(),
      poster: z.boolean(),
      provenance,
    }),
  ),
  quotes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      attribution: z.string(),
      kind: z.enum(["EXACT", "PARAPHRASE", "UNKNOWN"]),
      featured: z.boolean(),
      provenance,
    }),
  ),
  goals: z.array(outcome.extend({ role: z.enum(["PRIMARY", "SUPPORTING"]) })),
  experiments: z.array(outcome).default([]),
});
export function seasonClosingCard(value: unknown): SeasonClosingCard | null {
  const parsed = closing.safeParse(value);
  if (!parsed.success) return null;
  const { goals, experiments, ...card } = parsed.data,
    primary = goals.find((g) => g.role === "PRIMARY");
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    PAUSED: "Paused",
    CONCLUDED: "Concluded",
    ACHIEVED: "Achieved",
    PARTIAL: "Partially achieved",
    STOPPED: "Stopped",
    SUPPORTED: "Hypothesis supported",
    NOT_SUPPORTED: "Not supported",
    INCONCLUSIVE: "Inconclusive",
  };
  return {
    ...card,
    primaryGoal: primary ? { id: primary.id, title: primary.title } : null,
    outcomes: [
      ...goals.map((g) => ({
        id: g.id,
        title: g.title,
        kind: "GOAL" as const,
        role: g.role,
        stateLabel: labels[g.outcome ?? g.status],
        progressSummary: g.evaluation.progressSummary,
      })),
      ...experiments.map((e) => ({
        id: e.id,
        title: e.title,
        kind: "EXPERIMENT" as const,
        role: null,
        stateLabel: labels[e.outcome ?? e.status],
        progressSummary: e.evaluation.progressSummary,
      })),
    ],
  };
}
