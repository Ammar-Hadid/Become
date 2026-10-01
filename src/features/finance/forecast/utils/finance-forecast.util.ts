import type {
  ForecastAccount,
  ForecastCurrency,
  ForecastMovement,
  ForecastSettlement,
} from "@/features/finance/forecast/types/finance-forecast.types";
const spendable = (account: ForecastAccount) =>
  !["SAVINGS", "CREDIT_CARD", "INVESTMENT"].includes(account.type);
const positive = (value: bigint) => (value > 0n ? value : 0n);
const sum = (accounts: ForecastAccount[]) =>
  accounts.some((account) => account.balanceMinor === null)
    ? null
    : accounts.reduce((total, account) => total + account.balanceMinor!, 0n);

export function projectFinanceForecast(input: {
  asOf: string;
  throughOn: string;
  accounts: ForecastAccount[];
  movements: ForecastMovement[];
  settlements: ForecastSettlement[];
  reserves: {
    currency: string;
    protectedReserveMinor: bigint | null;
    allocatedMinor: bigint;
  }[];
}): ForecastCurrency[] {
  const currencies = new Set([
    ...input.accounts.map((account) => account.currency),
    ...input.reserves.map((reserve) => reserve.currency),
  ]);
  return [...currencies].sort().map((currency) => {
    const accounts = input.accounts.filter(
      (account) => account.currency === currency,
    );
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const cash = accounts.filter(spendable);
    const balances = new Map(
      accounts.map((account) => [account.id, account.balanceMinor]),
    );
    const qualifications = new Set(
      accounts.flatMap((account) => account.qualifications),
    );
    const netWorthMinor = sum(accounts);
    const openingSpendableMinor = sum(cash);
    const reserve = input.reserves.find(
      (reserve) => reserve.currency === currency,
    );
    // Goal/reserve funds held in excluded liquid Savings already stay out of cash
    // capacity. Only the portion held in spendable accounts is subtracted here.
    const excludedLiquid = accounts.filter(
      (account) =>
        !spendable(account) &&
        account.type !== "CREDIT_CARD" &&
        account.includeInLiquidSavings,
    );
    const protectedCashAt = () => {
      const excluded = excludedLiquid.map((account) =>
        balances.get(account.id),
      );
      if (
        reserve?.protectedReserveMinor == null ||
        excluded.some((balance) => balance == null)
      )
        return null;
      const balance = excluded.reduce<bigint>(
        (total, value) => total + value!,
        0n,
      );
      return positive(
        reserve.protectedReserveMinor +
          reserve.allocatedMinor -
          positive(balance),
      );
    };
    if (protectedCashAt() === null)
      qualifications.add(
        "Protected reserve coverage is unavailable; unallocated capacity cannot be established.",
      );
    let cashBalance = openingSpendableMinor;
    let minimumUnallocated =
      cashBalance === null || protectedCashAt() === null
        ? null
        : cashBalance - protectedCashAt()!;
    const points: ForecastCurrency["points"] = [
      { on: input.asOf, balanceMinor: cashBalance },
    ];
    const movements: ForecastMovement[] = [];
    const events = [
      ...input.movements
        .filter(
          (movement) =>
            byId.has(movement.accountId) &&
            movement.on >= input.asOf &&
            movement.on <= input.throughOn,
        )
        .map((movement) => ({
          on: movement.on,
          id: movement.id,
          movement,
          settlement: null,
        })),
      ...input.settlements
        .filter(
          (settlement) =>
            byId.has(settlement.cardAccountId) &&
            settlement.on >= input.asOf &&
            settlement.on <= input.throughOn,
        )
        .map((settlement) => ({
          on: settlement.on,
          id: settlement.id,
          movement: null,
          settlement,
        })),
    ].toSorted(
      (a, b) =>
        a.on.localeCompare(b.on) ||
        (a.settlement ? 1 : 0) - (b.settlement ? 1 : 0) ||
        a.id.localeCompare(b.id),
    );
    for (const event of events) {
      if (event.movement) {
        const movement = event.movement;
        const account = byId.get(movement.accountId)!;
        // Expected/available bank balances can already include authorizations.
        if (movement.kind === "PENDING" && account.includesPending) continue;
        const balance = balances.get(account.id);
        balances.set(
          account.id,
          balance == null ? null : balance + movement.amountMinor,
        );
        if (spendable(account))
          cashBalance =
            cashBalance === null ? null : cashBalance + movement.amountMinor;
        movements.push(movement);
      } else {
        const settlement = event.settlement!;
        const target = byId.get(settlement.settlementAccountId);
        if (!target || target.type === "CREDIT_CARD") {
          qualifications.add(
            `${settlement.label}: settlement account is unavailable.`,
          );
          continue;
        }
        const cardBalance = balances.get(settlement.cardAccountId);
        const debt = cardBalance == null ? null : positive(-cardBalance);
        const amount =
          settlement.amountMinor === null
            ? debt
            : debt === null
              ? settlement.amountMinor
              : settlement.amountMinor < debt
                ? settlement.amountMinor
                : debt;
        if (amount === null) {
          qualifications.add(
            `${settlement.label}: repayment amount is unknown.`,
          );
          cashBalance = null;
          continue;
        }
        if (amount === 0n) continue;
        const targetBalance = balances.get(target.id);
        balances.set(
          target.id,
          targetBalance == null ? null : targetBalance - amount,
        );
        balances.set(
          settlement.cardAccountId,
          cardBalance == null ? null : cardBalance + amount,
        );
        if (spendable(target))
          cashBalance = cashBalance === null ? null : cashBalance - amount;
        movements.push({
          id: settlement.id,
          on: settlement.on,
          label: settlement.label,
          kind: "CARD_SETTLEMENT",
          accountId: target.id,
          amountMinor: -amount,
        });
      }
      const protectedCash = protectedCashAt();
      const unallocated =
        cashBalance === null || protectedCash === null
          ? null
          : cashBalance - protectedCash;
      minimumUnallocated =
        minimumUnallocated === null || unallocated === null
          ? null
          : unallocated < minimumUnallocated
            ? unallocated
            : minimumUnallocated;
      if (points.at(-1)?.on === event.on)
        points[points.length - 1] = { on: event.on, balanceMinor: cashBalance };
      else points.push({ on: event.on, balanceMinor: cashBalance });
    }
    if (points.at(-1)?.on !== input.throughOn)
      points.push({ on: input.throughOn, balanceMinor: cashBalance });
    return {
      currency,
      netWorthMinor,
      openingSpendableMinor,
      projectedSpendableMinor: cashBalance,
      unallocatedAfterPlannedMinor: minimumUnallocated,
      movements,
      points,
      qualifications: [...qualifications],
    };
  });
}
