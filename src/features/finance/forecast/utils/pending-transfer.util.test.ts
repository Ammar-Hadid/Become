import { describe, expect, it } from "vitest";
import { pendingOwnedTransfers } from "./pending-transfer.util";
import { projectFinanceForecast } from "./finance-forecast.util";
const identities = [
  { accountId: "cash", identities: ["cash-identity"] },
  { accountId: "card", identities: ["card-identity"] },
];
describe("pending owned transfer projection", () => {
  it("counts a cash-side pending card repayment once with its expected counterpart", () => {
    const pending = pendingOwnedTransfers(
      [
        {
          id: "payment",
          accountId: "cash",
          amountMinor: 20000n,
          direction: "DEBIT",
          activityOn: "2026-10-01",
          identity: "card-identity",
        },
      ],
      identities,
      "2026-10-01",
    );
    expect(pending.ownedObservationIds.has("payment")).toBe(true);
    const result = projectFinanceForecast({
      asOf: "2026-10-01",
      throughOn: "2026-10-31",
      accounts: [
        {
          id: "cash",
          name: "Cash",
          currency: "EUR",
          type: "CHECKING",
          balanceMinor: 100000n,
          includesPending: false,
          includeInLiquidSavings: false,
          qualifications: [],
        },
        {
          id: "card",
          name: "Card",
          currency: "EUR",
          type: "CREDIT_CARD",
          balanceMinor: -20000n,
          includesPending: false,
          includeInLiquidSavings: false,
          qualifications: [],
        },
      ],
      movements: [
        {
          id: "pending:payment",
          accountId: "cash",
          amountMinor: -20000n,
          on: "2026-10-01",
          label: "Pending repayment",
          kind: "PENDING",
        },
        ...pending.counterpartMovements,
      ],
      settlements: [
        {
          id: "scheduled",
          on: "2026-10-10",
          cardAccountId: "card",
          settlementAccountId: "cash",
          amountMinor: 20000n,
          label: "Statement repayment",
        },
      ],
      reserves: [
        { currency: "EUR", allocatedMinor: 0n, protectedReserveMinor: 0n },
      ],
    })[0];
    expect(result.projectedSpendableMinor).toBe(80000n);
    expect(
      result.movements.filter(
        (movement) => movement.kind === "CARD_SETTLEMENT",
      ),
    ).toEqual([]);
  });
  it("adds no counterpart when both pending sides already exist or identity is ambiguous", () => {
    const observed = [
      {
        id: "debit",
        accountId: "cash",
        amountMinor: 20000n,
        direction: "DEBIT" as const,
        activityOn: "2026-10-01",
        identity: "card-identity",
      },
      {
        id: "credit",
        accountId: "card",
        amountMinor: 20000n,
        direction: "CREDIT" as const,
        activityOn: "2026-10-01",
        identity: "cash-identity",
      },
    ];
    expect(
      pendingOwnedTransfers(observed, identities, "2026-10-01")
        .counterpartMovements,
    ).toEqual([]);
    expect(
      pendingOwnedTransfers(
        observed,
        [
          ...identities,
          {
            accountId: "other",
            identities: ["card-identity", "cash-identity"],
          },
        ],
        "2026-10-01",
      ).ownedObservationIds.size,
    ).toBe(0);
  });
});
