import type {
  ContentCommand,
  ContentCommandResult,
} from "@/features/content/types/content.types";
export async function sendContentCommand(
  command: ContentCommand,
): Promise<ContentCommandResult> {
  try {
    const response = await fetch("/api/content/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as ContentCommandResult;
    if (typeof body.error !== "string" && body.error !== null)
      throw Error("Unrecognized response");
    return {
      ...body,
      delivery: response.status >= 500 ? "uncertain" : "confirmed",
    };
  } catch {
    return {
      error:
        "The save could not be confirmed. Keep your draft and retry the same submission.",
      delivery: "uncertain",
    };
  }
}
