import { materializeMappedEvidence } from "@/features/finance/accounts/services/bank-account-mapping.service";
import { randomUUID } from "node:crypto";
import { Prisma, type BankSyncTrigger } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import {
  ingestFinancialBalance,
  ingestFinancialEvidence,
} from "@/features/finance/evidence/services/financial-evidence.service";
import {
  bankSyncCadenceSeconds,
  getOpenBankingConfig,
} from "../../config/open-banking.config";
import { getBankDataProvider } from "../../providers/adapters/enable-banking.adapter";
import {
  bankFailureCode,
  bankRequiresReauthorization,
  bankRetryDate,
  bankSyncCursorSchema,
  bankSyncDateBounds,
  type BankSyncCursor,
} from "../utils/bank-sync.util";

const LEASE_MS = 5 * 60_000;

export async function enqueueBankSynchronization(
  userId: string,
  connectionId: string,
  trigger: BankSyncTrigger = "SCHEDULED",
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bank_connection WHERE id = ${connectionId} AND "userId" = ${userId} FOR UPDATE`;
    const connection = await tx.bankConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) throw new FinanceError("Bank connection not found.");
    if (connection.status !== "CONNECTED" || !connection.sessionId)
      throw new FinanceError("Reconnect this bank before synchronizing.");
    if (
      !connection.consentExpiresAt ||
      connection.consentExpiresAt <= new Date()
    )
      throw new FinanceError(
        "Bank consent has expired. Reconnect to continue.",
      );
    const existing = await tx.bankSyncJob.findFirst({
      where: { userId, connectionId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (existing) return { id: existing.id, more: true };
    const resumable = await tx.bankSyncJob.findFirst({
      where: {
        userId,
        connectionId,
        status: "FAILED",
        lastError: {
          notIn: ["REAUTHORIZED", "DISCONNECTED", "SESSION_EXPIRED"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    const nextAttemptAt =
      connection.nextEligibleAt && connection.nextEligibleAt > now
        ? connection.nextEligibleAt
        : now;
    const job = await tx.bankSyncJob.create({
      data: {
        userId,
        connectionId,
        trigger,
        nextAttemptAt,
        arguments: resumable?.cursor
          ? (resumable.arguments as Prisma.InputJsonValue)
          : { longestHistory: trigger === "INITIAL" },
        cursor: resumable?.cursor
          ? (resumable.cursor as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    return { id: job.id, more: nextAttemptAt > now };
  });
}

export async function scheduleDueBankSynchronizations(now = new Date()) {
  if (!getOpenBankingConfig().configured) return;
  await prisma.bankConnection.updateMany({
    where: { status: "CONNECTED", consentExpiresAt: { lte: now } },
    data: { status: "REAUTH_REQUIRED" },
  });
  const connections = await prisma.bankConnection.findMany({
    where: {
      status: "CONNECTED",
      sessionId: { not: null },
      consentExpiresAt: { gt: now },
      OR: [{ nextEligibleAt: null }, { nextEligibleAt: { lte: now } }],
    },
    take: 200,
  });
  for (const connection of connections) {
    const cadence = bankSyncCadenceSeconds(
      connection.provider,
      connection.institutionCountry,
      connection.institutionName,
    );
    if (
      !connection.lastSuccessAt ||
      now.getTime() - connection.lastSuccessAt.getTime() >= cadence * 1000
    )
      await enqueueBankSynchronization(connection.userId, connection.id).catch(
        (error: unknown) => {
          if (!(error instanceof FinanceError)) throw error;
        },
      );
  }
}

async function claimBankJob(now: Date) {
  return prisma.$transaction(async (tx) => {
    // Serialize the tiny claim transaction across worker processes; network work is outside it.
    // Row locks still skip unrelated jobs held by administrative transactions.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(91092385)::text`;
    await tx.bankSyncJob.updateMany({
      where: { status: "RUNNING", leasedUntil: { lte: now } },
      data: { status: "QUEUED", leaseToken: null, leasedUntil: null },
    });
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT j.id FROM bank_sync_job j
      JOIN bank_connection c ON c.id = j."connectionId" AND c."userId" = j."userId"
      WHERE j.status = 'QUEUED' AND j."nextAttemptAt" <= ${now}
        AND ((c.status = 'CONNECTED' AND c."consentExpiresAt" > ${now}
          AND (c."nextEligibleAt" IS NULL OR c."nextEligibleAt" <= ${now}))
          OR j.arguments->>'materializeOnly' = 'true')
        AND NOT EXISTS (SELECT 1 FROM bank_sync_job running WHERE running."connectionId" = j."connectionId" AND running.status = 'RUNNING')
      ORDER BY CASE WHEN j.trigger = 'INITIAL' THEN 0 ELSE 1 END, j."nextAttemptAt", j."createdAt"
      FOR UPDATE OF j SKIP LOCKED LIMIT 1
    `;
    if (!rows[0]) return null;
    return tx.bankSyncJob.update({
      where: { id: rows[0].id },
      data: {
        status: "RUNNING",
        leaseToken: randomUUID(),
        leasedUntil: new Date(now.getTime() + LEASE_MS),
        attempts: { increment: 1 },
      },
      include: { connection: true },
    });
  });
}

function initialCursor(
  accountIds: string[],
  longestHistory: boolean,
  lastSuccessAt: Date | null,
): BankSyncCursor {
  return {
    accountIds,
    accountIndex: 0,
    phase: "BALANCES",
    page: 0,
    longestHistory,
    ...bankSyncDateBounds(longestHistory, lastSuccessAt),
  };
}

export async function runNextBankSynchronization() {
  const job = await claimBankJob(new Date());
  if (!job) return false;
  const provider = getBankDataProvider(job.connection.provider);
  const cadence = bankSyncCadenceSeconds(
    job.connection.provider,
    job.connection.institutionCountry,
    job.connection.institutionName,
  );
  try {
    const args = job.arguments as Record<string, unknown>;
    if (args.materializeOnly === true && job.externalAccountId) {
      await prisma.$transaction(
        async (tx) => {
          await assertLease(tx, job.id, job.leaseToken, false);
          const result = await materializeMappedEvidence(
            job.userId,
            job.externalAccountId!,
            tx,
          );
          await tx.bankSyncJob.update({
            where: { id: job.id },
            data: {
              status: result.more ? "QUEUED" : "SUCCEEDED",
              leaseToken: null,
              leasedUntil: null,
              nextAttemptAt: new Date(),
              lastError: null,
            },
          });
        },
        { timeout: 30_000 },
      );
      return true;
    }
    let cursor: BankSyncCursor;
    if (job.cursor) cursor = bankSyncCursorSchema.parse(job.cursor);
    else {
      const accounts = await prisma.externalBankAccount.findMany({
        where: {
          connectionId: job.connectionId,
          userId: job.userId,
          authorizedSessionId: job.connection.sessionId,
        },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      const args = job.arguments as Record<string, unknown>;
      cursor = initialCursor(
        accounts.map((account) => account.id),
        args.longestHistory === true,
        job.connection.lastSuccessAt,
      );
      await prisma.bankSyncJob.updateMany({
        where: { id: job.id, leaseToken: job.leaseToken, status: "RUNNING" },
        data: { cursor },
      });
    }
    // A page is the durable unit. Ingestion and cursor advancement commit together.
    while (cursor.accountIndex < cursor.accountIds.length) {
      const account = await prisma.externalBankAccount.findFirst({
        where: {
          id: cursor.accountIds[cursor.accountIndex],
          connectionId: job.connectionId,
          userId: job.userId,
          authorizedSessionId: job.connection.sessionId,
        },
      });
      if (!account)
        throw new FinanceError(
          "The bank account changed while synchronizing. Reconnect to restart.",
        );
      if (cursor.phase === "BALANCES") {
        let moreStaged = true;
        while (moreStaged) {
          moreStaged = await prisma.$transaction(
            async (tx) => {
              await assertLease(tx, job.id, job.leaseToken);
              const result = await materializeMappedEvidence(
                job.userId,
                account.id,
                tx,
              );
              await persistCursor(tx, job.id, job.leaseToken, cursor);
              return result.more;
            },
            { timeout: 30_000 },
          );
        }
        const balances = await provider.balances(account.providerAccountId);
        const next = { ...cursor, phase: "TRANSACTIONS" as const };
        await prisma.$transaction(async (tx) => {
          await assertLease(tx, job.id, job.leaseToken);
          for (const balance of balances)
            await ingestFinancialBalance(
              job.userId,
              {
                ...balance,
                source: "LIVE_SYNC",
                externalAccountId: account.id,
              },
              tx,
            );
          await persistCursor(tx, job.id, job.leaseToken, next);
        });
        cursor = next;
      } else {
        const page = await provider.transactions({
          accountId: account.providerAccountId,
          dateFrom: cursor.dateFrom,
          dateTo: cursor.dateTo,
          continuationKey: cursor.continuationKey,
          longestHistory: cursor.longestHistory,
        });
        if (
          page.continuationKey &&
          page.continuationKey === cursor.continuationKey
        )
          throw new FinanceError("Bank pagination did not advance.");
        const next: BankSyncCursor = page.continuationKey
          ? {
              ...cursor,
              continuationKey: page.continuationKey,
              page: cursor.page + 1,
            }
          : {
              ...cursor,
              accountIndex: cursor.accountIndex + 1,
              phase: "BALANCES",
              continuationKey: undefined,
              page: 0,
            };
        await prisma.$transaction(
          async (tx) => {
            await assertLease(tx, job.id, job.leaseToken);
            const ordinals = new Map<string, number>();
            for (const observation of page.observations) {
              const ordinal = (ordinals.get(observation.fingerprint) ?? 0) + 1;
              ordinals.set(observation.fingerprint, ordinal);
              await ingestFinancialEvidence(
                job.userId,
                {
                  ...observation,
                  source: "LIVE_SYNC",
                  externalAccountId: account.id,
                  occurrenceKey: `${job.id}:${cursor.page}:${observation.fingerprint}:${ordinal}`,
                  ownCounterpartyIdentity: observation.ownCounterpartyIdentity,
                },
                tx,
              );
            }
            await persistCursor(tx, job.id, job.leaseToken, next);
            if (!page.continuationKey)
              await tx.externalBankAccount.update({
                where: { id: account.id, userId: job.userId },
                data: { lastSuccessAt: new Date() },
              });
          },
          { timeout: 30_000 },
        );
        cursor = next;
      }
    }
    await prisma.$transaction(async (tx) => {
      await assertLease(tx, job.id, job.leaseToken);
      await tx.bankSyncJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          leaseToken: null,
          leasedUntil: null,
          lastError: null,
        },
      });
      await tx.bankConnection.updateMany({
        where: {
          id: job.connectionId,
          userId: job.userId,
          status: "CONNECTED",
        },
        data: { lastSuccessAt: new Date(), nextEligibleAt: null },
      });
    });
  } catch (error) {
    const reauthorize = bankRequiresReauthorization(error);
    const nextAttemptAt = bankRetryDate(error, job.attempts, cadence);
    const code = bankFailureCode(error);
    await prisma.$transaction(async (tx) => {
      const owned = await tx.bankSyncJob.updateMany({
        where: { id: job.id, leaseToken: job.leaseToken, status: "RUNNING" },
        data: {
          status:
            reauthorize || job.attempts >= 8 || error instanceof FinanceError
              ? "FAILED"
              : "QUEUED",
          leaseToken: null,
          leasedUntil: null,
          nextAttemptAt,
          lastError: code,
        },
      });
      if (owned.count)
        await tx.bankConnection.updateMany({
          where: {
            id: job.connectionId,
            userId: job.userId,
            status: "CONNECTED",
          },
          data: {
            nextEligibleAt: nextAttemptAt,
            ...(reauthorize ? { status: "REAUTH_REQUIRED" as const } : {}),
          },
        });
    });
  }
  return true;
}

async function assertLease(
  tx: Prisma.TransactionClient,
  id: string,
  leaseToken: string | null,
  requireConnected = true,
) {
  const held = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT j.id FROM bank_sync_job j JOIN bank_connection c ON c.id = j."connectionId"
    WHERE j.id = ${id} AND j.status = 'RUNNING' AND j."leaseToken" = ${leaseToken}
      AND j."leasedUntil" > ${new Date()} AND (${!requireConnected} OR c.status = 'CONNECTED')
    FOR NO KEY UPDATE OF j,c
  `;
  if (!held.length)
    throw new FinanceError("Synchronization was stopped or its lease expired.");
}
async function persistCursor(
  tx: Prisma.TransactionClient,
  id: string,
  leaseToken: string | null,
  cursor: BankSyncCursor,
) {
  // Strip undefined continuation fields so the stored cursor is valid JSON.
  await tx.bankSyncJob.updateMany({
    where: { id, leaseToken, status: "RUNNING" },
    data: {
      cursor: JSON.parse(JSON.stringify(cursor)),
      leasedUntil: new Date(Date.now() + LEASE_MS),
    },
  });
}
