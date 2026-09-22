import { nexoFingerprint } from "@/features/nexo/utils/nexo-json.util";
import { NexoError } from "@/features/nexo/types/nexo.types";
import { synthesisOutputSchema } from "@/features/entrepreneurship/synthesis/schemas/synthesis.schema";
import type {
  SynthesisContext,
  SynthesisOutput,
} from "@/features/entrepreneurship/synthesis/types/synthesis.types";

export function boundSynthesisContext(
  input: SynthesisContext,
): SynthesisContext {
  const context = structuredClone(input);
  // Reserve space for the final fingerprint and complete coverage metadata.
  const bytes = () => Buffer.byteLength(JSON.stringify(context), "utf8");
  // Existing understanding gets a bounded share so source excerpts remain usable.
  while (
    Buffer.byteLength(JSON.stringify(context.understanding), "utf8") > 16000
  )
    context.understanding.pop();
  while (bytes() > 64000 && context.sources.length) context.sources.pop();
  while (bytes() > 64000 && context.understanding.length)
    context.understanding.pop();
  if (bytes() > 64000)
    throw new NexoError(
      "The exploration context is too large. Shorten its scope before generating.",
    );
  context.coverage.includedSources = context.sources.length;
  context.coverage.omittedSources =
    context.coverage.eligibleSources - context.sources.length;
  context.coverage.includedUnderstanding = context.understanding.length;
  context.coverage.omittedUnderstanding = Math.max(
    0,
    context.coverage.eligibleUnderstanding - context.understanding.length,
  );
  context.contextFingerprint = nexoFingerprint({
    ...context,
    contextFingerprint: "",
  });
  return context;
}

export function validateSynthesisOutput(
  value: unknown,
  context: SynthesisContext,
): SynthesisOutput {
  const output = synthesisOutputSchema.parse(value);
  const allowed = new Set(context.sources.map((source) => source.key));
  const known = new Map(context.understanding.map((item) => [item.id, item]));
  const updated = new Set<string>();
  for (const finding of output.findings) {
    if (finding.sourceKeys.some((key) => !allowed.has(key)))
      throw new NexoError(
        "A proposed citation is not in the reviewed source context.",
      );
    if (new Set(finding.sourceKeys).size !== finding.sourceKeys.length)
      throw new NexoError("A finding repeats the same source.");
    if (
      !["HYPOTHESIS", "QUESTION"].includes(finding.kind) &&
      !finding.sourceKeys.length
    )
      throw new NexoError(
        "Findings and interpretations need a source. Keep uncited ideas as hypotheses or questions.",
      );
    if (finding.claimId) {
      const current = known.get(finding.claimId);
      if (!current || updated.has(finding.claimId))
        throw new NexoError(
          "A proposal refers to an unavailable or repeated understanding item.",
        );
      if (
        ["QUESTION", "HYPOTHESIS"].includes(current.kind) !==
        ["HYPOTHESIS", "QUESTION"].includes(finding.kind)
      )
        throw new NexoError(
          "Keep findings and open questions as separate records.",
        );
      updated.add(finding.claimId);
    }
  }
  return output;
}

export function synthesisFreshness(
  accepted: Pick<
    SynthesisContext,
    "materialFingerprint" | "baseUnderstandingFingerprint"
  >,
  current: Pick<
    SynthesisContext,
    "materialFingerprint" | "baseUnderstandingFingerprint"
  >,
) {
  return {
    refreshRecommended:
      accepted.materialFingerprint !== current.materialFingerprint,
    unpublishedChanges:
      accepted.baseUnderstandingFingerprint !==
      current.baseUnderstandingFingerprint,
  };
}
