import type {
  SynthesisContext,
  SynthesisOutput,
} from "@/features/entrepreneurship/synthesis/schemas/synthesis.schema";
export type {
  SynthesisContext,
  SynthesisOutput,
  SynthesisSource,
} from "@/features/entrepreneurship/synthesis/schemas/synthesis.schema";
export type SynthesisWorkspace = {
  configured: boolean;
  credentialAvailable: boolean;
  refreshRecommended: boolean;
  unpublishedChanges: boolean;
  latest: {
    sourceStates: Record<string, "current" | "changed" | "unavailable">;
    editionId: string;
    number: number;
    publishedAt: string;
    output: SynthesisOutput;
    context: SynthesisContext;
  } | null;
  proposal: {
    id: string;
    status: string;
    createdAt: string;
    error: string | null;
    output: SynthesisOutput | null;
    context: SynthesisContext;
  } | null;
};
