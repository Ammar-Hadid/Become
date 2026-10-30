import type {
  ThinkingCommand,
  ThinkingCommandResult,
} from "@/features/direction/thinking/types/thinking.types";
export async function sendThinkingCommand(
  command: ThinkingCommand,
): Promise<ThinkingCommandResult> {
  try {
    const response = await fetch("/api/direction/thinking/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as ThinkingCommandResult;
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
