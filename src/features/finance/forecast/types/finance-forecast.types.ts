export type ForecastHorizon = 7 | 30 | 90;
export type ForecastMovement = {
  id: string;
  on: string;
  label: string;
  kind: "RECURRING_EXPENSE" | "EXPECTED_INCOME" | "CARD_SETTLEMENT" | "PENDING";
  accountId: string;
  amountMinor: bigint;
};
export type ForecastAccount = {
  id: string;
  name: string;
  currency: string;
  type: string;
  includeInLiquidSavings: boolean;
  balanceMinor: bigint | null;
  includesPending: boolean;
  qualifications: string[];
};
export type ForecastSettlement = {
  id: string;
  on: string;
  cardAccountId: string;
  settlementAccountId: string;
  amountMinor: bigint | null;
  label: string;
};
export type ForecastCurrency = {
  currency: string;
  netWorthMinor: bigint | null;
  openingSpendableMinor: bigint | null;
  projectedSpendableMinor: bigint | null;
  unallocatedAfterPlannedMinor: bigint | null;
  movements: ForecastMovement[];
  points: { on: string; balanceMinor: bigint | null }[];
  qualifications: string[];
};
