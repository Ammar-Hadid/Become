import { describe, expect, it } from "vitest";
import { currencySchema } from "./currency.schema";
import { currencySchema as financeCurrencySchema } from "@/features/finance/schemas/finance.schema";
import { quoteSchema } from "@/features/entrepreneurship/offers/schemas/offer.schema";
import { criterionSchema } from "@/features/direction/schemas/direction.schema";

describe("supported currency input", () => {
  it.each(["EUR", "USD", "GBP", "CAD", "JPY"])("accepts %s", (code) => {
    expect(currencySchema.parse(code)).toBe(code);
    expect(financeCurrencySchema.parse(code)).toBe(code);
  });
  it("normalizes existing supported codes", () => {
    expect(currencySchema.parse(" eur ")).toBe("EUR");
  });
  it.each(["AUD", "KWD", "ZZZ", "Canadian pound", "", "EURO"])(
    "rejects %s at every input boundary",
    (code) => {
      expect(currencySchema.safeParse(code).success).toBe(false);
      expect(financeCurrencySchema.safeParse(code).success).toBe(false);
      expect(quoteSchema.shape.currency.safeParse(code).success).toBe(false);
      if (code)
        expect(criterionSchema.shape.currency.safeParse(code).success).toBe(
          false,
        );
    },
  );
  it("preserves optional evidence currency", () => {
    expect(criterionSchema.shape.currency.safeParse(undefined).success).toBe(
      true,
    );
    expect(criterionSchema.shape.currency.safeParse("").success).toBe(true);
  });
});
