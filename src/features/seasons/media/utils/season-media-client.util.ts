import type {
  DirectionClientResult,
  ManualProvenanceDraft,
  SeasonMediaDraft,
} from "@/features/direction/commands/utils/direction-command-client.util";
import type { CommandResult } from "@/features/direction/types/direction.types";

export async function uploadSeasonMedia(input: {
  year: number;
  quarter: number;
  expectedVersion: number;
  operationKey: string;
  draft: SeasonMediaDraft;
  file: File;
}): Promise<DirectionClientResult> {
  try {
    const body = new FormData();
    body.set("file", input.file);
    body.set(
      "input",
      JSON.stringify({
        year: input.year,
        quarter: input.quarter,
        expectedVersion: input.expectedVersion,
        operationKey: input.operationKey,
        draft: input.draft,
      }),
    );
    const response = await fetch("/api/direction/media/upload", {
      method: "POST",
      body,
    });
    const result = await response.json().catch(() => null);
    const validResult =
      result &&
      typeof result === "object" &&
      "error" in result &&
      ((result as { error?: unknown }).error === null ||
        typeof (result as { error?: unknown }).error === "string")
        ? (result as CommandResult)
        : null;
    return validResult
      ? {
          ...validResult,
          delivery: response.status >= 500 ? "uncertain" : "confirmed",
        }
      : {
          error: response.ok
            ? "Become could not read the uploaded image."
            : "The image could not be uploaded. Your details are still here.",
          delivery: "uncertain",
        };
  } catch {
    return {
      error: "The image could not be uploaded. Your details are still here.",
      delivery: "uncertain",
    };
  }
}

export function manualProvenance(input?: {
  sourceUrl: string | null;
  sourceTitle: string | null;
  credit: string | null;
  attributionVerified: boolean;
}): ManualProvenanceDraft {
  return {
    sourceUrl: input?.sourceUrl ?? "",
    sourceTitle: input?.sourceTitle ?? "",
    credit: input?.credit ?? "",
    attributionVerified: input?.attributionVerified ?? false,
  };
}
