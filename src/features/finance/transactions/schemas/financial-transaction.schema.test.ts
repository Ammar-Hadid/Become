import { describe, expect, it } from "vitest";
import { transactionSchema } from "@/features/finance/transactions/schemas/financial-transaction.schema";

const transfer = {
  type: "TRANSFER",
  accountId: "source-account",
  destinationAccountId: "destination-account",
  amount: "100",
  currency: "EUR",
  occurredAt: "2026-02-01T12:00",
};

describe("transactionSchema", () => {
  it("accepts a transfer without a counterparty", () => {
    expect(transactionSchema.safeParse(transfer).success).toBe(true);
  });

  it.each([
    { counterpartyId: "counterparty-id" },
    { counterpartyName: "External bank" },
  ])("rejects a transfer counterparty from direct input", (counterparty) => {
    const result = transactionSchema.safeParse({
      ...transfer,
      ...counterparty,
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe(
        "A transfer cannot have a counterparty.",
      );
  });
});
