import { describe, expect, it } from "vitest";
import { detectRecurringSuggestions } from "./recurring-detection.util";
import type { RecurringObservation } from "@/features/finance/recurring/types/recurring-detection.types";
const row = (
  activityOn: string,
  overrides: Partial<RecurringObservation> = {},
): RecurringObservation => ({
  id: activityOn,
  accountId: "checking",
  currency: "EUR",
  type: "EXPENSE",
  amountMinor: 1200n,
  activityOn,
  counterpartyId: "merchant",
  counterpartyName: "Streaming",
  expenseCategoryId: null,
  ...overrides,
});
describe("recurring suggestions", () => {
  it("requires three observations and retains month-end anchors", () => {
    expect(
      detectRecurringSuggestions([row("2026-01-31"), row("2026-02-28")]),
    ).toEqual([]);
    expect(
      detectRecurringSuggestions([
        row("2026-01-31"),
        row("2026-02-28"),
        row("2026-03-31"),
      ])[0],
    ).toMatchObject({
      frequency: "MONTHLY",
      dayOfMonth: 31,
      nextDueOn: "2026-04-30",
    });
  });
  it("rejects same-day repeated purchases and inconsistent prices", () => {
    expect(
      detectRecurringSuggestions([
        row("2026-01-01"),
        row("2026-01-01", { id: "other" }),
        row("2026-02-01"),
      ]),
    ).toEqual([]);
    expect(
      detectRecurringSuggestions([
        row("2026-01-01"),
        row("2026-02-01"),
        row("2026-03-01", { amountMinor: 5000n }),
      ]),
    ).toEqual([]);
  });
  it("separates accounts, currencies and direction and detects repeating income", () => {
    const dates = ["2026-01-02", "2026-01-09", "2026-01-16"];
    expect(
      detectRecurringSuggestions(
        dates.map((date, index) => row(date, { accountId: String(index) })),
      ),
    ).toEqual([]);
    expect(
      detectRecurringSuggestions(
        dates.map((date) => row(date, { type: "INCOME" })),
      )[0],
    ).toMatchObject({
      type: "INCOME",
      frequency: "WEEKLY",
      nextDueOn: "2026-01-23",
    });
  });
});
