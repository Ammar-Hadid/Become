import { pendingOwnedTransfers } from "@/features/finance/forecast/utils/pending-transfer.util";
import { expectedIncomeDueDates } from "@/features/finance/forecast/utils/expected-income-calendar.util";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { getFinanceCoverage } from "@/features/finance/measurements/queries/finance-coverage.query";
import { getRecurringSuggestions } from "@/features/finance/recurring/queries/recurring-suggestions.query";
import {
  financeToday,
  localDay,
  recurringDueDates,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import { projectFinanceForecast } from "@/features/finance/forecast/utils/finance-forecast.util";
import type {
  ForecastAccount,
  ForecastHorizon,
  ForecastMovement,
  ForecastSettlement,
} from "@/features/finance/forecast/types/finance-forecast.types";

export async function getFinanceForecast(
  userId: string,
  horizonDays: ForecastHorizon = 30,
  at = new Date(),
) {
  if (![7, 30, 90].includes(horizonDays)) horizonDays = 30;
  const today = financeToday(at);
  const through = today.plus({ days: horizonDays });
  const asOf = today.toISODate()!;
  const throughOn = through.toISODate()!;
  const [
    position,
    definitions,
    occurrences,
    expectedIncome,
    policies,
    goals,
    pending,
    identities,
    coverage,
    suggestions,
    matchedIncome,
    ownedAccounts,
  ] = await Promise.all([
    getFinancialPosition(userId, at),
    prisma.recurringExpense.findMany({
      where: { userId, archivedAt: null, status: "ACTIVE" },
    }),
    prisma.recurringExpenseOccurrence.findMany({
      where: {
        userId,
        dueOn: { lte: new Date(`${throughOn}T00:00:00Z`) },
        OR: [
          { status: "AWAITING_CONFIRMATION" },
          { dueOn: { gte: new Date(`${asOf}T00:00:00Z`) } },
        ],
      },
    }),
    prisma.financeExpectedIncome.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ dueOn: "asc" }, { id: "asc" }],
    }),
    prisma.financeCurrencyPolicy.findMany({ where: { userId } }),
    prisma.savingsGoal.groupBy({
      by: ["currency"],
      where: { userId, archivedAt: null },
      _sum: { allocatedAmountMinor: true },
    }),
    prisma.financialEvidenceLink.findMany({
      where: {
        userId,
        accountId: { not: null },
        status: "PROJECTED",
        transactionId: null,
        observation: { bookingStatus: "PENDING" },
      },
      select: {
        accountId: true,
        observation: {
          select: {
            id: true,
            activityOn: true,
            amountMinor: true,
            direction: true,
            description: true,
            counterpartyName: true,
            counterpartyIdentity: true,
            ownCounterpartyIdentity: true,
          },
        },
      },
    }),
    prisma.counterpartyIdentity.findMany({
      where: { userId },
      select: { identityKey: true, counterpartyId: true },
    }),
    getFinanceCoverage(userId, undefined, at),
    getRecurringSuggestions(userId),
    prisma.financialTransaction.findMany({
      where: {
        userId,
        expectedIncomeId: { not: null },
        expectedIncomeDueOn: { gte: asOf, lte: throughOn },
      },
      select: { expectedIncomeId: true, expectedIncomeDueOn: true },
    }),
    prisma.externalBankAccount.findMany({
      where: { userId, financialAccountId: { not: null } },
      select: {
        financialAccountId: true,
        identityKey: true,
        identityAliases: true,
      },
    }),
  ]);
  const accounts: ForecastAccount[] = position.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    type: account.type,
    includeInLiquidSavings: account.includeInLiquidSavings,
    balanceMinor: account.balanceMinor,
    includesPending: account.balanceIncludesPending,
    qualifications: [
      ...(account.balanceIncludesPending
        ? [`${account.name}: the observed balance includes pending activity.`]
        : []),
      ...(account.balanceCoverage === "STALE"
        ? [`${account.name}: balance evidence is stale.`]
        : []),
      ...(account.balanceMinor === null
        ? [`${account.name}: balance is unavailable.`]
        : []),
      ...(coverage.accounts.find((item) => item.id === account.id)?.complete ===
      false
        ? [coverage.accounts.find((item) => item.id === account.id)!.detail]
        : []),
      ...(account.type === "CREDIT_CARD" && account.repaymentMethod === "MANUAL"
        ? [
            `${account.name}: future manual repayments require a recorded repayment schedule.`,
          ]
        : []),
    ],
  }));
  const accountIds = new Set(accounts.map((account) => account.id));
  const movements: ForecastMovement[] = pending
    .filter((link) => accountIds.has(link.accountId!))
    .map(({ accountId, observation }) => ({
      id: `pending:${observation.id}`,
      accountId: accountId!,
      on: observation.activityOn < asOf ? asOf : observation.activityOn,
      label:
        observation.counterpartyName ??
        observation.description ??
        "Pending activity",
      kind: "PENDING",
      amountMinor:
        observation.direction === "CREDIT"
          ? observation.amountMinor
          : -observation.amountMinor,
    }));
  const ownedPending = pendingOwnedTransfers(
    pending
      .filter((link) => accountIds.has(link.accountId!))
      .map((link) => ({
        id: link.observation.id,
        accountId: link.accountId!,
        amountMinor: link.observation.amountMinor,
        direction: link.observation.direction,
        activityOn: link.observation.activityOn,
        identity:
          link.observation.ownCounterpartyIdentity ??
          link.observation.counterpartyIdentity,
      })),
    ownedAccounts
      .filter((account) => accountIds.has(account.financialAccountId!))
      .map((account) => ({
        accountId: account.financialAccountId!,
        identities: [
          account.identityKey,
          ...(Array.isArray(account.identityAliases)
            ? account.identityAliases.filter(
                (alias): alias is string => typeof alias === "string",
              )
            : []),
        ],
      })),
    asOf,
  );
  const identityMap = new Map(
    identities.map((identity) => [
      identity.identityKey,
      identity.counterpartyId,
    ]),
  );
  const pendingMatches = new Set<string>();
  const pendingIncomeMatches = new Set<string>();
  const confirmedPendingIncome = new Map<string, string>();
  for (const link of pending) {
    const observation = link.observation;
    if (!observation.counterpartyIdentity) continue;
    const counterpartyId = identityMap.get(observation.counterpartyIdentity);
    if (!counterpartyId) continue;
    const on = DateTime.fromISO(observation.activityOn, { zone: APP_TIMEZONE });
    if (observation.direction === "CREDIT") {
      const matches = expectedIncome
        .filter(
          (income) =>
            income.accountId === link.accountId &&
            income.counterpartyId === counterpartyId &&
            income.amountMinor === observation.amountMinor,
        )
        .flatMap((income) =>
          expectedIncomeDueDates(
            income,
            on.minus({ days: 3 }),
            on.plus({ days: 3 }),
          ).map((date) => `${income.id}:${date.toISODate()!}`),
        );
      if (matches.length === 1) {
        pendingIncomeMatches.add(matches[0]);
        confirmedPendingIncome.set(
          observation.id,
          matches[0].slice(matches[0].lastIndexOf(":") + 1),
        );
      }
      continue;
    }
    const matches = definitions
      .filter(
        (definition) =>
          definition.accountId === link.accountId &&
          definition.counterpartyId === counterpartyId &&
          definition.amountMinor === observation.amountMinor,
      )
      .flatMap((definition) =>
        recurringDueDates(
          definition,
          on.minus({ days: 3 }),
          on.plus({ days: 3 }),
        ).map((date) => `${definition.id}:${date.toISODate()!}`),
      );
    if (matches.length === 1) pendingMatches.add(matches[0]);
  }
  for (let index = movements.length - 1; index >= 0; index--) {
    const movement = movements[index];
    if (movement.kind !== "PENDING" || movement.amountMinor <= 0n) continue;
    if (
      ownedPending.ownedObservationIds.has(movement.id.slice("pending:".length))
    )
      continue;
    const confirmedOn = confirmedPendingIncome.get(
      movement.id.slice("pending:".length),
    );
    if (confirmedOn) movement.on = confirmedOn < asOf ? asOf : confirmedOn;
    else {
      accounts
        .find((account) => account.id === movement.accountId)!
        .qualifications.push(
          "Unconfirmed pending incoming activity is excluded from projected spending capacity.",
        );
      movements.splice(index, 1);
    }
  }
  movements.push(...ownedPending.counterpartMovements);
  for (const movement of ownedPending.counterpartMovements)
    accounts
      .find((account) => account.id === movement.accountId)!
      .qualifications.push(
        "A pending owned transfer has an expected counterpart; this projection is not a booked bank movement.",
      );
  for (const definition of definitions) {
    if (!accountIds.has(definition.accountId)) continue;
    for (const due of recurringDueDates(definition, today, through)) {
      const on = due.toISODate()!;
      const occurrence = occurrences.find(
        (item) =>
          item.recurringExpenseId === definition.id &&
          localDay(item.dueOn).toISODate() === on,
      );
      if (
        (occurrence && occurrence.status !== "AWAITING_CONFIRMATION") ||
        pendingMatches.has(`${definition.id}:${on}`)
      )
        continue;
      movements.push({
        id: `recurring:${definition.id}:${on}`,
        on,
        label: definition.name,
        kind: "RECURRING_EXPENSE",
        accountId: definition.accountId,
        amountMinor: -definition.amountMinor,
      });
    }
  }
  for (const occurrence of occurrences.filter(
    (item) =>
      item.status === "AWAITING_CONFIRMATION" && localDay(item.dueOn) < today,
  )) {
    if (
      !accountIds.has(occurrence.accountId) ||
      pendingMatches.has(
        `${occurrence.recurringExpenseId}:${localDay(occurrence.dueOn).toISODate()}`,
      )
    )
      continue;
    const account = accounts.find((item) => item.id === occurrence.accountId)!;
    account.qualifications.push(
      `${occurrence.nameSnapshot}: overdue payment remains unmatched.`,
    );
    movements.push({
      id: `overdue:${occurrence.id}`,
      on: asOf,
      label: `${occurrence.nameSnapshot} (awaiting payment)`,
      kind: "RECURRING_EXPENSE",
      accountId: occurrence.accountId,
      amountMinor: -occurrence.scheduledAmountMinor,
    });
  }
  for (const income of expectedIncome) {
    if (!accountIds.has(income.accountId)) continue;
    const dates = expectedIncomeDueDates(income, today, through);
    for (const due of dates.filter(
      (date) =>
        !matchedIncome.some(
          (fact) =>
            fact.expectedIncomeId === income.id &&
            fact.expectedIncomeDueOn === date.toISODate(),
        ) && !pendingIncomeMatches.has(`${income.id}:${date.toISODate()}`),
    ))
      movements.push({
        id: `income:${income.id}:${due.toISODate()}`,
        on: due.toISODate()!,
        label: income.title,
        kind: "EXPECTED_INCOME",
        accountId: income.accountId,
        amountMinor: income.amountMinor,
      });
  }
  const settlements: ForecastSettlement[] = [];
  for (const card of position.filter(
    (account) =>
      account.type === "CREDIT_CARD" &&
      account.repaymentMethod === "LINKED_ACCOUNT",
  )) {
    if (!card.settlementAccountId) continue;
    if (
      card.statementDueOn &&
      card.statementDueMinor !== null &&
      card.statementDueOn >= asOf &&
      card.statementDueOn <= throughOn
    )
      settlements.push({
        id: `statement:${card.id}:${card.statementDueOn}`,
        on: card.statementDueOn,
        cardAccountId: card.id,
        settlementAccountId: card.settlementAccountId,
        amountMinor: card.statementDueMinor,
        label: `${card.name} statement repayment`,
      });
    if (card.settlementDay) {
      let month = today.startOf("month");
      while (month <= through) {
        const due = month.set({
          day: Math.min(card.settlementDay, month.daysInMonth!),
        });
        if (
          due >= today &&
          due <= through &&
          !settlements.some(
            (item) =>
              item.cardAccountId === card.id &&
              item.on.slice(0, 7) === due.toISODate()!.slice(0, 7),
          )
        )
          settlements.push({
            id: `settlement:${card.id}:${due.toISODate()}`,
            on: due.toISODate()!,
            cardAccountId: card.id,
            settlementAccountId: card.settlementAccountId,
            amountMinor: null,
            label: `${card.name} estimated full-balance repayment`,
          });
        month = month.plus({ months: 1 });
      }
    }
    if (!card.statementDueOn && !card.settlementDay)
      accounts
        .find((account) => account.id === card.id)!
        .qualifications.push(
          `${card.name}: repayment date is unknown; no repayment has been projected.`,
        );
  }
  const currencies = new Set([
    ...accounts.map((account) => account.currency),
    ...policies.map((policy) => policy.currency),
    ...goals.map((goal) => goal.currency),
  ]);
  const projected = projectFinanceForecast({
    asOf,
    throughOn,
    accounts,
    movements,
    settlements,
    reserves: [...currencies].map((currency) => ({
      currency,
      protectedReserveMinor:
        policies.find((policy) => policy.currency === currency)
          ?.protectedReserveMinor ?? null,
      allocatedMinor:
        goals.find((goal) => goal.currency === currency)?._sum
          .allocatedAmountMinor ?? 0n,
    })),
  });
  return {
    asOf,
    throughOn,
    horizonDays,
    currencies: projected,
    expectedIncome,
    suggestions,
    coverage,
  };
}
