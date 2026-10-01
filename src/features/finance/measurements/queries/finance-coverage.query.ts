import { DateTime } from "luxon";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import type { FinanceCoverage } from "@/features/finance/measurements/types/finance-coverage.types";

export async function getFinanceCoverage(
  userId: string,
  period?: { start: Date; end: Date },
  at = new Date(),
  tx: Prisma.TransactionClient = prisma,
): Promise<FinanceCoverage> {
  const occurredAt = period ? { gte: period.start, lt: period.end } : undefined;
  const activityOn = period
    ? {
        gte: DateTime.fromJSDate(period.start)
          .setZone(APP_TIMEZONE)
          .toISODate()!,
        lt: DateTime.fromJSDate(period.end).setZone(APP_TIMEZONE).toISODate()!,
      }
    : undefined;
  // A statement preview is a proposed import, not active Finance evidence.
  // Bank observations without a statement batch still qualify staging gaps.
  const activeEvidence: Prisma.FinancialEvidenceObservationWhereInput = {
    OR: [
      { importId: null },
      { statementImport: { confirmedAt: { not: null } } },
    ],
  };
  const [
    counts,
    pendingCount,
    unresolvedEvidenceCount,
    unreviewedCount,
    accountCount,
    accounts,
  ] = await Promise.all([
    tx.financialTransaction.groupBy({
      by: ["dataSource"],
      where: { userId, occurredAt },
      _count: { _all: true },
    }),
    tx.financialEvidenceLink.count({
      where: {
        userId,
        status: "PROJECTED",
        observation: {
          ...activeEvidence,
          bookingStatus: "PENDING",
          activityOn,
        },
      },
    }),
    tx.financialEvidenceLink.count({
      where: {
        userId,
        status: { in: ["STAGED", "DUPLICATE_REVIEW"] },
        observation: { ...activeEvidence, bookingStatus: "BOOKED", activityOn },
      },
    }),
    tx.financialTransaction.count({
      where: { userId, occurredAt, reviewedAt: null },
    }),
    tx.financialAccount.count({ where: { userId, archivedAt: null } }),
    tx.financialAccount.findMany({
      where: { userId, archivedAt: null },
      take: 80,
      orderBy: [{ currency: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        currency: true,
        dataSource: true,
        externalAccounts: {
          select: {
            lastSuccessAt: true,
            connection: { select: { status: true, nextEligibleAt: true } },
          },
        },
        statementImports: {
          where: { confirmedAt: { not: null } },
          orderBy: { coverageThroughOn: "desc" },
          take: 1,
          select: { coverageThroughOn: true },
        },
      },
    }),
  ]);
  const coverageAccounts = accounts.map((account) => {
    let complete = true;
    let detail =
      "Manual records only; completeness of real activity is not established.";
    let lastSuccessAt: string | null = null;
    const coverageThroughOn =
      account.statementImports[0]?.coverageThroughOn ?? null;
    if (account.dataSource === "LIVE_SYNC") {
      const connections = account.externalAccounts;
      const latest = connections
        .flatMap((external) =>
          external.lastSuccessAt ? [external.lastSuccessAt] : [],
        )
        .sort((a, b) => b.getTime() - a.getTime())[0];
      lastSuccessAt = latest?.toISOString() ?? null;
      complete = Boolean(
        latest &&
        connections.some(
          (external) => external.connection.status === "CONNECTED",
        ),
      );
      const overdue = connections.some(
        (external) =>
          external.connection.nextEligibleAt &&
          external.connection.nextEligibleAt < at,
      );
      if (overdue) complete = false;
      detail = !latest
        ? "No successful bank synchronization recorded."
        : !complete
          ? "Bank connection needs synchronization or renewed authorization; activity may be incomplete."
          : "Live bank activity available through the last successful synchronization; provider history limits still apply.";
    } else if (account.dataSource === "STATEMENT_IMPORT") {
      // Generic row extraction establishes observed dates, not an exhaustive statement period.
      complete = false;
      detail = coverageThroughOn
        ? `Imported statement activity reaches ${coverageThroughOn}; file completeness and later activity are not established.`
        : "No confirmed statement coverage recorded.";
    }
    return {
      id: account.id,
      name: account.name,
      currency: account.currency,
      source: account.dataSource,
      detail,
      lastSuccessAt,
      coverageThroughOn,
      complete,
    };
  });
  const omittedAccounts = Math.max(0, accountCount - accounts.length);
  const complete =
    unresolvedEvidenceCount === 0 &&
    omittedAccounts === 0 &&
    coverageAccounts.every((account) => account.complete);
  const detail = `${complete ? "Available records have no known ingestion gaps." : "Finance evidence has incomplete coverage."} ${unresolvedEvidenceCount} booked observation(s) await mapping or duplicate resolution; ${pendingCount} pending observation(s) are excluded from booked spending. Manual records do not prove exhaustive account history.`;
  return {
    sourceCounts: counts.map((row) => ({
      source: row.dataSource,
      count: row._count._all,
    })),
    pendingCount,
    unresolvedEvidenceCount,
    unreviewedCount,
    accounts: coverageAccounts,
    omittedAccounts,
    complete,
    detail,
  };
}
