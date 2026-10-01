import { describe, expect, it } from "vitest";
import { projectFinanceForecast } from "./finance-forecast.util";
import type { ForecastAccount } from "@/features/finance/forecast/types/finance-forecast.types";
const account = (
  id: string,
  type: string,
  balanceMinor: bigint | null,
  extra: Partial<ForecastAccount> = {},
): ForecastAccount => ({
  id,
  type,
  name: id,
  currency: "EUR",
  balanceMinor,
  includeInLiquidSavings: false,
  includesPending: false,
  qualifications: [],
  ...extra,
});
const base = {
  asOf: "2026-10-01",
  throughOn: "2026-10-31",
  reserves: [
    { currency: "EUR", protectedReserveMinor: 0n, allocatedMinor: 0n },
  ],
  settlements: [],
  movements: [],
};
describe("deterministic finance forecast", () => {
  it("counts purchases on a credit card through one settlement, without treating credit limit as wealth", () => {
    const result = projectFinanceForecast({
      ...base,
      accounts: [
        account("cash", "CHECKING", 100000n),
        account("card", "CREDIT_CARD", -20000n),
      ],
      settlements: [
        {
          id: "settlement",
          on: "2026-10-10",
          cardAccountId: "card",
          settlementAccountId: "cash",
          amountMinor: null,
          label: "Card repayment",
        },
        {
          id: "next",
          on: "2026-10-30",
          cardAccountId: "card",
          settlementAccountId: "cash",
          amountMinor: null,
          label: "Next repayment",
        },
      ],
    })[0];
    expect(result.netWorthMinor).toBe(80000n);
    expect(result.projectedSpendableMinor).toBe(80000n);
    expect(result.movements).toHaveLength(1);
    expect(result.unallocatedAfterPlannedMinor).toBe(80000n);
  });
  it("subtracts authorizations once and excludes Savings without subtracting goals twice", () => {
    const result = projectFinanceForecast({
      ...base,
      accounts: [
        account("cash", "CHECKING", 10000n, { includesPending: true }),
        account("savings", "SAVINGS", 50000n, { includeInLiquidSavings: true }),
      ],
      reserves: [
        {
          currency: "EUR",
          protectedReserveMinor: 20000n,
          allocatedMinor: 20000n,
        },
      ],
      movements: [
        {
          id: "pending",
          on: "2026-10-01",
          label: "Pending purchase",
          kind: "PENDING",
          accountId: "cash",
          amountMinor: -1000n,
        },
      ],
    })[0];
    expect(result.projectedSpendableMinor).toBe(10000n);
    expect(result.unallocatedAfterPlannedMinor).toBe(10000n);
    expect(result.movements).toHaveLength(0);
  });
  it("does not treat a missing balance as zero and uses lowest projected cash before expected income", () => {
    expect(
      projectFinanceForecast({
        ...base,
        accounts: [account("cash", "CHECKING", null)],
      })[0].unallocatedAfterPlannedMinor,
    ).toBeNull();
    const result = projectFinanceForecast({
      ...base,
      accounts: [account("cash", "CHECKING", 10000n)],
      movements: [
        {
          id: "bill",
          on: "2026-10-02",
          label: "Bill",
          kind: "RECURRING_EXPENSE",
          accountId: "cash",
          amountMinor: -4000n,
        },
        {
          id: "pay",
          on: "2026-10-10",
          label: "Pay",
          kind: "EXPECTED_INCOME",
          accountId: "cash",
          amountMinor: 5000n,
        },
      ],
    })[0];
    expect(result.projectedSpendableMinor).toBe(11000n);
    expect(result.unallocatedAfterPlannedMinor).toBe(6000n);
  });
  it("does not project an already settled statement amount again", () => {
    const result = projectFinanceForecast({
      ...base,
      accounts: [
        account("cash", "CHECKING", 80000n),
        account("card", "CREDIT_CARD", 0n),
      ],
      settlements: [
        {
          id: "old-statement",
          on: "2026-10-10",
          cardAccountId: "card",
          settlementAccountId: "cash",
          amountMinor: 20000n,
          label: "Recorded statement repayment",
        },
      ],
    })[0];
    expect(result.projectedSpendableMinor).toBe(80000n);
    expect(result.movements).toEqual([]);
  });
  it("retains reserve protection when a planned payment consumes funds in excluded Savings", () => {
    const result = projectFinanceForecast({
      ...base,
      accounts: [
        account("cash", "CHECKING", 10000n),
        account("savings", "SAVINGS", 10000n, { includeInLiquidSavings: true }),
      ],
      reserves: [
        { currency: "EUR", allocatedMinor: 10000n, protectedReserveMinor: 0n },
      ],
      movements: [
        {
          id: "savings-bill",
          on: "2026-10-05",
          accountId: "savings",
          amountMinor: -10000n,
          kind: "RECURRING_EXPENSE",
          label: "Payment from Savings",
        },
      ],
    })[0];
    expect(result.projectedSpendableMinor).toBe(10000n);
    expect(result.unallocatedAfterPlannedMinor).toBe(0n);
  });
});
