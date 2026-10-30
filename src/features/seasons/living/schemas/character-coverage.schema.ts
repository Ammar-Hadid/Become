import { z } from "zod";

const evidence = z
  .object({
    description: z
      .string()
      .trim()
      .min(20)
      .max(1500)
      .describe(
        "Two to four concise complete sentences about this story phase, ideally under 800 characters. No Markdown links, inline citations, production direction or unfinished sentences; cite via sourceIds only.",
      ),
    sourceIds: z.array(z.string().trim().min(1)).max(12),
  })
  .strict();

/** Scope is explicit: visual adaptation and researched story endpoint may differ. */
export const characterCoverageSchema = z
  .object({
    scope: z
      .string()
      .trim()
      .min(10)
      .max(1000)
      .describe(
        "One sentence under 250 characters naming the researched continuity and any owner cutoff. This is a scope label, never a summary or production brief.",
      ),
    endpoint: z
      .string()
      .trim()
      .min(5)
      .max(600)
      .describe(
        "One concise sentence under 250 characters naming the final chapter/episode/arc or latest documented endpoint. No plot summary or links.",
      ),
    adaptationNotes: z
      .string()
      .trim()
      .min(10)
      .max(1200)
      .describe(
        "One or two concise sentences under 500 characters distinguishing original-source coverage from the selected adaptation. No artwork directions, owner theme, or plot summary.",
      ),
    early: evidence,
    middle: evidence,
    late: evidence,
    gaps: z.array(z.string().trim().min(1).max(500)).max(8),
  })
  .strict();

export function validateCharacterCoverage(
  coverage: z.infer<typeof characterCoverageSchema>,
  sourceIds: Set<string>,
) {
  for (const phase of [coverage.early, coverage.middle, coverage.late])
    if (
      (!coverage.gaps.length && !phase.sourceIds.length) ||
      phase.sourceIds.some((id) => !sourceIds.has(id))
    )
      throw new Error(
        "Story coverage cites missing evidence. Research the missing sources before approval.",
      );
}
