import type {
  Evaluation,
  ExperimentDraft,
  GoalDraft,
  MetricCapability,
} from "@/features/direction/types/direction.types";

type PreviewRequest =
  | { kind: "GOAL"; id?: string; draft: GoalDraft }
  | { kind: "EXPERIMENT"; id?: string; draft: ExperimentDraft };

type PreviewResult = {
  evaluation: Evaluation | null;
  error: string | null;
  fieldErrors: Record<string, string>;
};

export async function previewDirection(
  input: PreviewRequest,
): Promise<PreviewResult> {
  try {
    const response = await fetch("/api/direction/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => null)) as {
      evaluation?: Evaluation;
      error?: string | null;
      fieldErrors?: Record<string, string>;
    } | null;
    return {
      evaluation: body?.evaluation ?? null,
      error:
        body?.error ??
        (body?.evaluation
          ? null
          : response.ok
            ? "The preview could not be read."
            : "The evidence preview could not be prepared."),
      fieldErrors: body?.fieldErrors ?? {},
    };
  } catch {
    return {
      evaluation: null,
      error: "The evidence preview could not be prepared.",
      fieldErrors: {},
    };
  }
}

export async function getMetricCatalog(): Promise<MetricCapability[]> {
  const response = await fetch("/api/direction/catalog");
  const body = (await response.json().catch(() => null)) as {
    items?: MetricCapability[];
    error?: string;
  } | null;
  if (!response.ok || !body?.items)
    throw new Error(body?.error ?? "Evidence definitions could not be loaded.");
  return body.items;
}
