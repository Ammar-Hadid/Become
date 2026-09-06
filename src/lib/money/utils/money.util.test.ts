import { describe, expect, it } from "vitest";
import { distributeMoney, formatMoney, parseMoney } from "./money.util";

describe("exact money", () => {
  it("parses zero, two and three decimals without floating point", () => {
    expect(parseMoney("199", "JPY")).toBe(199n);
    expect(parseMoney("19,99", "eur")).toBe(1999n);
    expect(parseMoney("0.001", "KWD")).toBe(1n);
    expect(parseMoney("-12.50", "EUR")).toBe(-1250n);
    expect(parseMoney("92233720368547758.07", "EUR")).toBe(
      9223372036854775807n,
    );
  });
  it.each(["1,250.00", "1e3", "NaN", "1.001", "", "92233720368547758.08"])(
    "rejects invalid EUR input %s",
    (value) => expect(() => parseMoney(value, "EUR")).toThrow(),
  );
  it("validates currency and precision", () => {
    expect(() => parseMoney("1", "ZZZ")).toThrow();
    expect(() => parseMoney("1.1", "JPY")).toThrow();
    expect(formatMoney(9223372036854775807n, "EUR")).toBe(
      "EUR 92,233,720,368,547,758.07",
    );
    expect(formatMoney(-1n, "KWD")).toBe("−KWD 0.001");
  });
  it("splits by largest remainder with stable ties", () => {
    expect(distributeMoney(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
    expect(distributeMoney(101n, [1n, 2n])).toEqual([34n, 67n]);
    expect(() => distributeMoney(1n, [0n])).toThrow();
  });
});
