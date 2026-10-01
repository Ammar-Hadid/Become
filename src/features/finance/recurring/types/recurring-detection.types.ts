export type RecurringObservation = {
  id: string;
  accountId: string;
  currency: string;
  type: "INCOME" | "EXPENSE";
  amountMinor: bigint;
  activityOn: string;
  counterpartyId: string;
  counterpartyName: string;
  expenseCategoryId: string | null;
};

export type RecurringSuggestion = {
  key: string;
  name: string;
  accountId: string;
  currency: string;
  type: "INCOME" | "EXPENSE";
  counterpartyId: string;
  expenseCategoryId: string | null;
  amountMinor: bigint;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  lastActivityOn: string;
  nextDueOn: string;
  observationIds: string[];
};
