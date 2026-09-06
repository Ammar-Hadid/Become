import { describe, expect, it } from "vitest";
import { normalizeCounterpartyName } from "@/features/finance/counterparties/utils/counterparty.util";

describe("normalizeCounterpartyName", () => {
  it.each(["Dirk", "dirk", "DIRK", "  Dirk  "])(
    "gives equivalent exact names one canonical key: %s",
    (name) => {
      expect(normalizeCounterpartyName(name)).toBe("dirk");
    },
  );

  it("does not guess that differently spelled names are the same entity", () => {
    expect(normalizeCounterpartyName("Dirk")).not.toBe(
      normalizeCounterpartyName("Dirck"),
    );
  });
});
