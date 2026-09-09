import { describe, expect, it } from "vitest";
import { normalizeReusableEntityName } from "@/features/finance/entities/utils/reusable-entity.util";

describe("normalizeReusableEntityName", () => {
  it("normalizes compatibility characters, whitespace and case", () => {
    expect(normalizeReusableEntityName("  ＤＩＲＫ  ")).toBe("dirk");
  });

  it("does not merge distinct names", () => {
    expect(normalizeReusableEntityName("Dirk")).not.toBe(
      normalizeReusableEntityName("Dirck"),
    );
  });
});
