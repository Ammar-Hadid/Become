import type {
  CommandResult,
  ExperimentDraft,
  ExperimentOutcome,
  GoalDraft,
  GoalOutcome,
} from "@/features/direction/types/direction.types";
import type { SeasonDraft } from "@/features/seasons/types/season.types";
import type { EvidenceReference } from "@/features/direction/evidence/services/evidence-reference.service";

export type DirectionClientResult = CommandResult & {
  delivery: "confirmed" | "uncertain";
  recoveredPrevious?: boolean;
};

export type DirectionCommand =
  | {
      type: "SAVE_SEASON";
      year: number;
      quarter: number;
      expectedVersion: number;
      operationKey: string;
      draft: SeasonDraft;
      complete?: boolean;
    }
  | {
      type: "SAVE_GOAL";
      id?: string;
      expectedVersion?: number;
      operationKey: string;
      draft: GoalDraft;
      reason?: string;
    }
  | {
      type: "ASSIGN_SEASON_GOALS";
      year: number;
      quarter: number;
      expectedVersion: number;
      operationKey: string;
      goals: {
        goalId: string;
        role: "PRIMARY" | "SUPPORTING";
        note: string;
      }[];
    }
  | {
      type: "SAVE_EXPERIMENT";
      id?: string;
      expectedVersion?: number;
      operationKey: string;
      draft: ExperimentDraft;
      reason?: string;
    }
  | {
      type: "DIRECTION_LIFECYCLE";
      kind: "GOAL" | "EXPERIMENT";
      id: string;
      expectedVersion: number;
      operationKey: string;
      action:
        "PAUSE" | "RESUME" | "CONCLUDE" | "REOPEN" | "ARCHIVE" | "RESTORE";
      reason: string;
      outcome?: GoalOutcome | ExperimentOutcome;
      result?: string;
      learning?: string;
      previewFingerprint?: string;
    }
  | {
      type: "ASSESS_CRITERION";
      criterionId: string;
      expectedVersion: number;
      operationKey: string;
      confirmed: boolean;
      rationale: string;
      assessedOn: string;
      sources: EvidenceReference[];
    }
  | {
      type: "SEASON_LIFECYCLE";
      year: number;
      quarter: number;
      expectedVersion: number;
      operationKey: string;
      action: "ACKNOWLEDGE" | "SNOOZE" | "CLOSE";
      milestone?: "MIDPOINT" | "FINAL_14" | "FINAL_7" | "FINAL_3" | "ENDED";
      snoozeDays?: 1 | 3 | 7;
      note?: string;
    }
  | {
      type: "SAVE_SEASON_MEDIA";
      year: number;
      quarter: number;
      expectedVersion: number;
      operationKey: string;
      mediaId: string;
      draft?: SeasonMediaDraft;
      retire?: boolean;
    }
  | {
      type: "SAVE_SEASON_QUOTE";
      year: number;
      quarter: number;
      expectedVersion: number;
      operationKey: string;
      quoteId?: string;
      draft?: SeasonQuoteDraft;
      retire?: boolean;
    };

export type ManualProvenanceDraft = {
  sourceUrl: string;
  sourceTitle: string;
  credit: string;
  attributionVerified: boolean;
};

export type SeasonMediaDraft = {
  alt: string;
  decorative: boolean;
  focalX: number;
  focalY: number;
  poster: boolean;
  provenance: ManualProvenanceDraft;
};

export type SeasonQuoteDraft = {
  text: string;
  attribution: string;
  kind: "EXACT" | "PARAPHRASE" | "UNKNOWN";
  featured: boolean;
  provenance: ManualProvenanceDraft;
};

function isCommandResult(value: unknown): value is CommandResult {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return error === null || typeof error === "string";
}

export async function sendDirectionCommand(
  command: DirectionCommand,
): Promise<DirectionClientResult> {
  try {
    const response = await fetch("/api/direction/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    const result = await response.json().catch(() => null);

    if (isCommandResult(result)) {
      return {
        ...result,
        delivery: response.status >= 500 ? "uncertain" : "confirmed",
      };
    }
    return {
      error: response.ok
        ? "Become could not read the saved season. Try again."
        : "Become could not save this change. Your entries are still here.",
      delivery: "uncertain",
    };
  } catch {
    return {
      error: "Become could not save this change. Your entries are still here.",
      delivery: "uncertain",
    };
  }
}
