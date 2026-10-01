import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type { Prisma } from "@/generated/prisma/client";
import { financeToday } from "@/features/finance/recurring/utils/recurring-calendar.util";
export async function getFinanceActivity(userId: string) {
  const day = financeToday();
  const date = day.toISODate()!;
  const todayRange = {
    gte: day.toUTC().toJSDate(),
    lt: day.plus({ days: 1 }).toUTC().toJSDate(),
  };
  const today: Prisma.FinancialTransactionWhereInput = {
    userId,
    OR: [{ activityOn: date }, { activityOn: null, occurredAt: todayRange }],
  };
  const previous: Prisma.FinancialTransactionWhereInput = {
    userId,
    OR: [
      { activityOn: { lt: date } },
      { activityOn: null, occurredAt: { lt: todayRange.gte } },
    ],
    reviewedAt: null,
  };
  const unknown: Prisma.FinancialTransactionWhereInput = {
    dataSource: { not: "MANUAL" },
    type: { not: "TRANSFER" },
    counterpartyId: null,
  };
  const recognized: Prisma.FinancialTransactionWhereInput = {
    OR: [
      { dataSource: "MANUAL" },
      { type: "TRANSFER" },
      { counterpartyId: { not: null } },
    ],
  };
  const [
    total,
    known,
    needsReview,
    unknownToday,
    older,
    unknownOlder,
    uncategorized,
  ] = await Promise.all([
    prisma.financialTransaction.count({ where: today }),
    prisma.financialTransaction.count({ where: { AND: [today, recognized] } }),
    prisma.financialTransaction.count({
      where: { ...today, reviewedAt: null },
    }),
    prisma.financialTransaction.count({
      where: { AND: [today, unknown], reviewedAt: null },
    }),
    prisma.financialTransaction.count({ where: previous }),
    prisma.financialTransaction.count({ where: { AND: [previous, unknown] } }),
    prisma.financialTransaction.count({
      where: {
        ...today,
        type: "EXPENSE",
        expenseCategoryId: null,
        reviewedAt: null,
      },
    }),
  ]);
  const unresolvedWhere: Prisma.FinancialEvidenceLinkWhereInput = {
    userId,
    accountId: { not: null },
    needsAttention: { not: null },
    status: { in: ["STAGED", "DUPLICATE_REVIEW"] },
    observation: {
      bookingStatus: "BOOKED",
      OR: [{ importId: null }, { statementImport: { status: "CONFIRMED" } }],
    },
  };
  const [confirmedIdentities, ownedExternalAccounts] = await Promise.all([
    prisma.counterpartyIdentity.findMany({
      where: { userId, counterparty: { archivedAt: null } },
      select: { identityKey: true },
    }),
    prisma.externalBankAccount.findMany({
      where: { userId, financialAccountId: { not: null } },
      select: { identityKey: true, identityAliases: true },
    }),
  ]);
  const ownedIdentities = ownedExternalAccounts.flatMap((account) => [
    account.identityKey,
    ...(Array.isArray(account.identityAliases)
      ? account.identityAliases.filter(
          (alias): alias is string => typeof alias === "string",
        )
      : []),
  ]);
  const unknownObservedIdentity: Prisma.FinancialEvidenceObservationWhereInput =
    {
      AND: [
        {
          OR: [
            { ownCounterpartyIdentity: null },
            { ownCounterpartyIdentity: { notIn: ownedIdentities } },
          ],
        },
        {
          OR: [
            { counterpartyIdentity: null },
            { counterpartyIdentity: { notIn: ownedIdentities } },
          ],
        },
      ],
      OR: [
        { counterpartyIdentity: null },
        {
          counterpartyIdentity: {
            notIn: confirmedIdentities.map((identity) => identity.identityKey),
          },
        },
      ],
    };
  const [
    unresolved,
    unresolvedToday,
    unresolvedPrevious,
    unknownUnresolvedToday,
    unknownUnresolvedPrevious,
  ] = await Promise.all([
    Promise.all(
      [date, { lt: date }].map((activityOn) =>
        prisma.financialEvidenceLink.findMany({
          where: { AND: [unresolvedWhere, { observation: { activityOn } }] },
          select: {
            accountId: true,
            observationId: true,
            needsAttention: true,
            observation: {
              select: { activityOn: true, counterpartyName: true },
            },
          },
          take: 25,
          orderBy: { createdAt: "asc" },
        }),
      ),
    ),
    prisma.financialEvidenceLink.count({
      where: { AND: [unresolvedWhere, { observation: { activityOn: date } }] },
    }),
    prisma.financialEvidenceLink.count({
      where: {
        AND: [unresolvedWhere, { observation: { activityOn: { lt: date } } }],
      },
    }),
    prisma.financialEvidenceLink.count({
      where: {
        AND: [
          unresolvedWhere,
          {
            observation: {
              AND: [unknownObservedIdentity, { activityOn: date }],
            },
          },
        ],
      },
    }),
    prisma.financialEvidenceLink.count({
      where: {
        AND: [
          unresolvedWhere,
          {
            observation: {
              AND: [unknownObservedIdentity, { activityOn: { lt: date } }],
            },
          },
        ],
      },
    }),
  ]);
  const unresolvedRows = unresolved.flat().map((x) => ({
    accountId: x.accountId!,
    observationId: x.observationId,
    activityOn: x.observation.activityOn,
    counterpartyName: x.observation.counterpartyName,
    message: x.needsAttention!,
  }));
  return {
    unresolved: unresolvedRows,
    today: {
      unresolvedEvidence: unresolvedToday,
      unknownUnresolvedCounterparties: unknownUnresolvedToday,
      date,
      total,
      recognized: known,
      needsReview,
      unknownCounterparties: unknownToday,
      needsAttention: unknownToday,
      uncategorized,
    },
    previous: {
      unresolvedEvidence: unresolvedPrevious,
      unknownUnresolvedCounterparties: unknownUnresolvedPrevious,
      needsReview: older,
      unknownCounterparties: unknownOlder,
    },
  };
}
