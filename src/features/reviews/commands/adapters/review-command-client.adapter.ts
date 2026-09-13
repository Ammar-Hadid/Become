import type {
  ReviewCommand,
  TransitionCommand,
} from "@/features/reviews/contracts/schemas/review.schema";
import type { ReviewCommandResult } from "@/features/reviews/contracts/types/review.types";

export type ReviewClientResult = ReviewCommandResult & {
  delivery: "confirmed" | "uncertain";
  recoveredPrevious?: boolean;
};

export async function sendReviewCommand(
  command: ReviewCommand | TransitionCommand,
): Promise<ReviewClientResult> {
  try {
    const endpoint =
      command.type === "SAVE" ||
      command.type === "FINALIZE" ||
      command.type === "AMEND"
        ? "/api/reviews/commands"
        : "/api/reviews/transition";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(15_000),
    });
    const result: unknown = await response.json().catch(() => null);
    if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      (result.error === null || typeof result.error === "string")
    )
      return {
        ...(result as ReviewCommandResult),
        delivery: response.status >= 500 ? "uncertain" : "confirmed",
      };
    return {
      error:
        "The save could not be confirmed. Your entries remain on this page. Retry to check the same save.",
      delivery: "uncertain",
    };
  } catch {
    return {
      error:
        "The save could not be confirmed. Your entries remain on this page. Retry to check the same save.",
      delivery: "uncertain",
    };
  }
}
