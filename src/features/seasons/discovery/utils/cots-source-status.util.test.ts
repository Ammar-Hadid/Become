import { describe, expect, it } from "vitest";
import {
  COTS_DISCOVERY_ISSUE_MESSAGE,
  cotsIdentitySuggestionStatusMessage,
} from "./cots-source-status.util";

describe("COTS source status copy", () => {
  it("uses one non-technical message for unavailable suggestion services", () => {
    for (const status of ["THROTTLED", "SETUP_REQUIRED", "UNAVAILABLE"])
      expect(cotsIdentitySuggestionStatusMessage(status)).toBe(
        COTS_DISCOVERY_ISSUE_MESSAGE,
      );

    expect(COTS_DISCOVERY_ISSUE_MESSAGE).not.toMatch(
      /provider|service|setup|installation|api|token|key/i,
    );
  });

  it("keeps a genuine no-match result distinct from a service issue", () => {
    expect(cotsIdentitySuggestionStatusMessage("EXHAUSTED")).toBe(
      "No exact match found. You can still use the name as written.",
    );
  });
});
