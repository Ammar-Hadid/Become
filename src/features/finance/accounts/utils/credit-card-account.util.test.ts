import { describe, expect, it } from "vitest";
import {
  eligibleSettlementAccounts,
  requiresSettlementAccount,
} from "@/features/finance/accounts/utils/credit-card-account.util";

describe("credit-card account repayment", () => {
  it("requires a settlement account only for linked-account repayment", () => {
    expect(requiresSettlementAccount("CREDIT_CARD", "LINKED_ACCOUNT")).toBe(
      true,
    );
    expect(requiresSettlementAccount("CREDIT_CARD", "MANUAL")).toBe(false);
    expect(requiresSettlementAccount("SAVINGS", "LINKED_ACCOUNT")).toBe(false);
  });

  it("offers only active same-currency accounts that can settle a card", () => {
    const accounts = [
      {
        id: "eur-current",
        name: "Daily account",
        currency: "EUR",
        type: "CHECKING",
        archivedAt: null,
      },
      {
        id: "usd-current",
        name: "Travel account",
        currency: "USD",
        type: "CHECKING",
        archivedAt: null,
      },
      {
        id: "eur-card",
        name: "Other card",
        currency: "EUR",
        type: "CREDIT_CARD",
        archivedAt: null,
      },
      {
        id: "archived",
        name: "Old current",
        currency: "EUR",
        type: "CHECKING",
        archivedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    expect(eligibleSettlementAccounts(accounts, "EUR")).toEqual([
      expect.objectContaining({ id: "eur-current" }),
    ]);
  });
});
