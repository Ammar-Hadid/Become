import { describe, expect, it } from "vitest";
import {
  quoteMoney,
  quoteLabel,
} from "@/features/entrepreneurship/offers/utils/offer.util";
describe("quoted money", () => {
  it("distinguishes unknown and free prices using exact minor units", () => {
    expect(quoteMoney("", "EUR").priceMinor).toBeNull();
    expect(quoteMoney("0", "EUR").priceMinor).toBe(0n);
    expect(quoteMoney("19.99", "EUR").priceMinor).toBe(1999n);
    expect(() => quoteMoney("-1", "EUR")).toThrow();
  });
  it("describes a recurring quote without projecting income", () => {
    expect(
      quoteLabel({
        priceMinor: 50000n,
        currency: "EUR",
        priceBasis: "RECURRING",
        intervalUnit: "YEAR",
        intervalCount: 1,
        unitLabel: null,
      }),
    ).toBe("EUR 500.00 every 1 year");
  });
});
