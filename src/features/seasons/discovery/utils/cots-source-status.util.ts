export const COTS_DISCOVERY_ISSUE_MESSAGE =
  "Suggestions aren’t available right now. Try again in a moment, or continue with something of your own.";

export function cotsIdentitySuggestionStatusMessage(status?: string) {
  if (["THROTTLED", "SETUP_REQUIRED", "UNAVAILABLE"].includes(status ?? ""))
    return COTS_DISCOVERY_ISSUE_MESSAGE;
  return "No exact match found. You can still use the name as written.";
}
