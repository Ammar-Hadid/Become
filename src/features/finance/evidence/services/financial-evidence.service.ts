import {
  Prisma,
  type FinancialEvidenceObservation,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import type {
  FinancialEvidenceInput,
  FinancialBalanceInput,
} from "../types/financial-evidence.types";
import {
  evidenceHash,
  evidenceDay,
  evidenceWindow,
} from "../utils/financial-evidence.util";
import { invalidatePaymentAttribution } from "@/features/finance/payments/services/payment-invalidation.service";
import { matchImportedRecurringTransaction } from "@/features/finance/recurring/services/recurring-matching.service";

async function evidenceAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  input: { externalAccountId?: string; accountId?: string; currency: string },
) {
  if (!input.externalAccountId && !input.accountId)
    throw new FinanceError("Choose an account for the evidence.");
  const external = input.externalAccountId
    ? await tx.externalBankAccount.findFirst({
        where: { id: input.externalAccountId, userId },
      })
    : null;
  if (
    input.externalAccountId &&
    (!external || external.currency !== input.currency)
  )
    throw new FinanceError(
      "External account is unavailable or has a different currency.",
    );
  if (
    external &&
    input.accountId &&
    external.financialAccountId !== input.accountId
  )
    throw new FinanceError("Evidence account does not match the bank mapping.");
  const accountId = external?.financialAccountId ?? input.accountId;
  if (
    accountId &&
    !(await tx.financialAccount.findFirst({
      where: {
        id: accountId,
        userId,
        currency: input.currency,
        archivedAt: null,
      },
    }))
  )
    throw new FinanceError(
      "Choose an active owned account in the evidence currency.",
    );
  return { external, accountId };
}

export async function ingestFinancialEvidence(
  userId: string,
  input: FinancialEvidenceInput,
  tx?: Prisma.TransactionClient,
) {
  const run = async (db: Prisma.TransactionClient) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const { accountId, external } = await evidenceAccount(db, userId, input);
    const occurredAt = input.occurredAt ?? evidenceDay(input.activityDate);
    evidenceDay(input.activityDate);
    if (input.amountMinor <= 0n || !/^[A-Z]{3}$/.test(input.currency))
      throw new FinanceError(
        "Evidence needs a positive exact amount and currency.",
      );
    if (
      input.importId &&
      !(await db.financialStatementImport.findFirst({
        where: { id: input.importId, userId, accountId: accountId! },
      }))
    )
      throw new FinanceError("Statement import is unavailable.");
    const namespace = external ? `bank:${external.id}` : `account:${accountId}`;
    const reference = input.reference?.trim() || null;
    if (!reference && !input.occurrenceKey)
      throw new FinanceError(
        "Evidence without a stable reference needs an occurrence key.",
      );
    const evidenceKey = evidenceHash([
      namespace,
      reference ?? input.occurrenceKey,
    ]);
    const payloadHash = evidenceHash({
      amount: input.amountMinor,
      currency: input.currency,
      day: input.activityDate,
      status: input.status,
      direction: input.direction,
      source: input.source,
      sourceOrigin: input.importId,
      occurredAt,
      datePrecision: input.datePrecision ?? "DATE",
      bookingDate: input.bookingDate,
      valueDate: input.valueDate,
      counterpartyName: input.counterpartyName,
      counterpartyIdentity: input.counterpartyIdentity,
      ownCounterpartyIdentity: input.ownCounterpartyIdentity,
      description: input.description,
      raw: input.raw,
    });
    // Serialize revisions of a stable source identity, including two concurrent retries.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + evidenceKey},0))`;
    const old = await db.financialEvidenceObservation.findUnique({
      where: {
        userId_evidenceKey_payloadHash: { userId, evidenceKey, payloadHash },
      },
      include: { link: true },
    });
    if (old)
      return {
        id: old.id,
        transactionId: old.link?.transactionId,
        duplicate: true,
      };
    const observation = await db.financialEvidenceObservation.create({
      data: {
        userId,
        accountId: input.accountId ?? null,
        externalAccountId: input.externalAccountId,
        importId: input.importId,
        source: input.source,
        evidenceKey,
        payloadHash,
        externalReference: reference,
        fingerprint:
          input.fingerprint ??
          evidenceHash([
            input.currency,
            input.amountMinor,
            input.activityDate,
            input.direction,
            input.counterpartyIdentity ?? input.counterpartyName,
          ]),
        bookingStatus: input.status,
        direction: input.direction,
        amountMinor: input.amountMinor,
        currency: input.currency,
        activityOn: input.activityDate,
        occurredAt,
        datePrecision: input.datePrecision ?? "DATE",
        bookingOn: input.bookingDate,
        valueOn: input.valueDate,
        counterpartyName: input.counterpartyName,
        counterpartyIdentity: input.counterpartyIdentity,
        ownCounterpartyIdentity: input.ownCounterpartyIdentity,
        description: input.description,
        raw: input.raw,
      },
    });
    await db.financialEvidenceLink.create({
      data: {
        userId,
        observationId: observation.id,
        accountId,
        status: "STAGED",
      },
    });
    if (accountId && !input.deferProjection)
      await projectFinancialEvidence(db, userId, observation.id);
    const link = await db.financialEvidenceLink.findUniqueOrThrow({
      where: { observationId: observation.id },
    });
    return {
      id: observation.id,
      transactionId: link.transactionId,
      duplicate: false,
    };
  };
  return tx ? run(tx) : prisma.$transaction(run, { timeout: 30000 });
}

export async function ingestFinancialBalance(
  userId: string,
  input: FinancialBalanceInput,
  tx?: Prisma.TransactionClient,
) {
  const run = async (db: Prisma.TransactionClient) => {
    await evidenceAccount(db, userId, input);
    if (!Number.isFinite(input.observedAt.getTime()))
      throw new FinanceError("Balance observation time is invalid.");
    const payloadHash = evidenceHash([
      input.accountId,
      input.externalAccountId,
      input.source,
      input.balanceMinor,
      input.currency,
      input.balanceType,
      input.includesPending,
      input.observedAt,
      input.raw,
    ]);
    return db.financialBalanceObservation.upsert({
      where: { userId_payloadHash: { userId, payloadHash } },
      create: { ...input, userId, payloadHash },
      update: {},
    });
  };
  return tx ? run(tx) : prisma.$transaction(run);
}

async function ownedCounterAccount(
  db: Prisma.TransactionClient,
  userId: string,
  o: FinancialEvidenceObservation,
  accountId: string,
) {
  const identity = o.ownCounterpartyIdentity ?? o.counterpartyIdentity;
  if (!identity) return null;
  const owned = await db.externalBankAccount.findMany({
    where: { userId, currency: o.currency, financialAccountId: { not: null } },
    select: {
      identityKey: true,
      identityAliases: true,
      financialAccountId: true,
    },
  });
  const matches = owned.filter(
    (x) =>
      x.financialAccountId !== accountId &&
      (x.identityKey === identity ||
        (Array.isArray(x.identityAliases) &&
          x.identityAliases.includes(identity))),
  );
  const ids = [...new Set(matches.map((x) => x.financialAccountId!))];
  return ids.length === 1 ? ids[0] : null;
}

export async function findEvidenceOverlapCandidates(
  db: Prisma.TransactionClient,
  userId: string,
  o: Pick<
    FinancialEvidenceObservation,
    | "currency"
    | "amountMinor"
    | "activityOn"
    | "direction"
    | "externalReference"
    | "externalAccountId"
    | "accountId"
    | "source"
  >,
  accountId: string,
) {
  const candidates = await db.financialTransaction.findMany({
    where: {
      userId,
      currency: o.currency,
      amountMinor: o.amountMinor,
      occurredAt: evidenceWindow(o.activityOn, 1),
      OR: [{ accountId }, { destinationAccountId: accountId }],
      type: {
        in: [o.direction === "CREDIT" ? "INCOME" : "EXPENSE", "TRANSFER"],
      },
    },
    include: {
      evidenceLinks: {
        where: { status: "PROJECTED", accountId },
        include: { observation: true },
      },
    },
    take: 25,
  });
  return candidates.filter(
    (c) =>
      !o.externalReference ||
      !c.evidenceLinks.length ||
      !c.evidenceLinks.every(
        (l) =>
          l.observation.externalReference &&
          l.observation.source === o.source &&
          l.observation.externalAccountId === o.externalAccountId &&
          l.observation.accountId === o.accountId &&
          l.observation.externalReference !== o.externalReference,
      ),
  );
}

async function applyCorrection(
  db: Prisma.TransactionClient,
  userId: string,
  o: FinancialEvidenceObservation,
  transactionId: string,
) {
  const old = await db.financialTransaction.findUniqueOrThrow({
    where: { id: transactionId, userId },
  });
  const previousEvidence = await db.financialEvidenceLink.findFirst({
    where: {
      userId,
      transactionId,
      observation: { evidenceKey: o.evidenceKey, bookingStatus: "BOOKED" },
      status: "PROJECTED",
    },
    include: { observation: true },
  });
  const identityChanged =
    !!previousEvidence &&
    previousEvidence.observation.counterpartyIdentity !==
      o.counterpartyIdentity;
  const payment = await db.paymentSessionAllocation.aggregate({
    where: { userId, transactionId },
    _sum: { amountMinor: true },
  });
  const goal = await db.savingsGoalExpenseAllocation.aggregate({
    where: { userId, transactionId },
    _sum: { amountMinor: true },
  });
  const linkedAccount = await db.financialEvidenceLink.findUniqueOrThrow({
    where: { observationId: o.id },
  });
  const direction =
    old.type === "INCOME"
      ? "CREDIT"
      : old.type === "EXPENSE"
        ? "DEBIT"
        : old.accountId === linkedAccount.accountId
          ? "DEBIT"
          : "CREDIT";
  const inconsistentTransfer =
    old.type === "TRANSFER" &&
    (await db.financialEvidenceLink.findFirst({
      where: {
        userId,
        transactionId,
        accountId: { not: linkedAccount.accountId! },
        status: "PROJECTED",
        observation: {
          bookingStatus: "BOOKED",
          amountMinor: { not: o.amountMinor },
        },
      },
    }));
  if (
    inconsistentTransfer ||
    direction !== o.direction ||
    old.currency !== o.currency ||
    (payment._sum.amountMinor ?? 0n) > o.amountMinor ||
    (goal._sum.amountMinor ?? 0n) > o.amountMinor
  ) {
    await db.financialEvidenceLink.update({
      where: { observationId: o.id },
      data: {
        status: "DUPLICATE_REVIEW",
        transactionId,
        duplicateCandidates: [transactionId],
        needsAttention:
          "Source correction needs allocation or relationship review.",
      },
    });
    await db.financialTransaction.update({
      where: { id: transactionId, userId },
      data: { reviewedAt: null },
    });
    return false;
  }
  if (
    old.amountMinor !== o.amountMinor ||
    old.occurredAt.getTime() !== o.occurredAt.getTime() ||
    identityChanged
  ) {
    await invalidatePaymentAttribution(db, userId, transactionId);
    await db.savingsGoal.updateMany({
      where: {
        userId,
        status: "COMPLETED",
        expenses: { some: { transactionId } },
      },
      data: { completionNeedsReviewAt: new Date() },
    });
    await db.businessReceiptAllocation.updateMany({
      where: { userId, transactionId, withdrawnAt: null },
      data: { needsReviewAt: new Date() },
    });
    await db.financialTransaction.update({
      where: { id: transactionId, userId },
      data: {
        amountMinor: o.amountMinor,
        occurredAt: o.occurredAt,
        activityOn: o.activityOn,
        reviewedAt: null,
        ...(identityChanged ? { counterpartyId: null } : {}),
      },
    });
  }
  return true;
}

export async function projectFinancialEvidence(
  db: Prisma.TransactionClient,
  userId: string,
  observationId: string,
  distinct = false,
) {
  const o = await db.financialEvidenceObservation.findFirst({
    where: { id: observationId, userId },
    include: { link: true },
  });
  if (!o?.link?.accountId) return;
  if (
    o.link.status === "PROJECTED" ||
    o.link.status === "IGNORED" ||
    o.link.status === "SUPERSEDED"
  )
    return;
  const accountId = o.link.accountId;
  await db.$queryRaw`SELECT id FROM financial_account WHERE id=${accountId} AND "userId"=${userId} FOR NO KEY UPDATE`;
  const revisions = o.externalReference
    ? await db.financialEvidenceObservation.findMany({
        where: { userId, evidenceKey: o.evidenceKey, id: { not: o.id } },
        include: { link: true },
        orderBy: { observedAt: "desc" },
      })
    : [];
  // A provider repeating a pending state must never replace an already-booked fact.
  if (
    o.bookingStatus === "PENDING" &&
    revisions.some(
      (r) => r.bookingStatus === "BOOKED" && r.link?.status === "PROJECTED",
    )
  ) {
    await db.financialEvidenceLink.update({
      where: { observationId: o.id },
      data: { status: "SUPERSEDED" },
    });
    return;
  }
  if (o.bookingStatus === "PENDING") {
    for (const previous of revisions.filter(
      (r) => r.bookingStatus === "PENDING",
    ))
      await db.financialEvidenceLink.update({
        where: { observationId: previous.id },
        data: { status: "SUPERSEDED" },
      });
    await db.financialEvidenceLink.update({
      where: { observationId: o.id },
      data: { status: "PROJECTED" },
    });
    return;
  }
  for (const r of revisions.filter(
    (r) => r.bookingStatus === "PENDING" && r.link?.status === "PROJECTED",
  ))
    await db.financialEvidenceLink.update({
      where: { observationId: r.id },
      data: { status: "SUPERSEDED" },
    });
  const prior = revisions.find(
    (r) =>
      r.bookingStatus === "BOOKED" &&
      r.link?.transactionId &&
      r.link.status === "PROJECTED",
  );
  if (prior?.link?.transactionId) {
    if (!(await applyCorrection(db, userId, o, prior.link.transactionId)))
      return;
    await db.financialEvidenceLink.update({
      where: { observationId: o.id },
      data: {
        status: "PROJECTED",
        transactionId: prior.link.transactionId,
        needsAttention: null,
      },
    });
    for (const r of revisions.filter((r) => r.link?.status === "PROJECTED"))
      await db.financialEvidenceLink.update({
        where: { observationId: r.id },
        data: { status: "SUPERSEDED" },
      });
    return;
  }
  if (!o.externalReference && !distinct) {
    const existing = await findEvidenceOverlapCandidates(
      db,
      userId,
      o,
      accountId,
    );
    if (existing.length) {
      await db.financialEvidenceLink.update({
        where: { observationId: o.id },
        data: {
          status: "DUPLICATE_REVIEW",
          duplicateCandidates: existing.map((x) => x.id),
          needsAttention:
            "Unreferenced movement may overlap existing activity; confirm its identity.",
        },
      });
      return;
    }
  }
  const contraId = await ownedCounterAccount(db, userId, o, accountId);
  if (contraId) {
    const from = o.direction === "DEBIT" ? accountId : contraId;
    const to = o.direction === "CREDIT" ? accountId : contraId;
    const pairs = await db.financialTransaction.findMany({
      where: {
        userId,
        type: "TRANSFER",
        accountId: from,
        destinationAccountId: to,
        currency: o.currency,
        amountMinor: o.amountMinor,
        occurredAt: evidenceWindow(o.activityOn),
        evidenceLinks: {
          some: {
            status: "PROJECTED",
            accountId: contraId,
            observation: {
              bookingStatus: "BOOKED",
              direction: o.direction === "DEBIT" ? "CREDIT" : "DEBIT",
            },
          },
          none: {
            status: "PROJECTED",
            accountId,
            observation: { bookingStatus: "BOOKED" },
          },
        },
      },
      take: 2,
    });
    if (pairs.length === 1) {
      await db.financialEvidenceLink.update({
        where: { observationId: o.id },
        data: {
          status: "PROJECTED",
          transactionId: pairs[0].id,
          needsAttention: null,
        },
      });
      return;
    }
    if (!pairs.length) {
      if (!distinct) {
        const candidates = await findEvidenceOverlapCandidates(
          db,
          userId,
          o,
          accountId,
        );
        if (candidates.length) {
          await db.financialEvidenceLink.update({
            where: { observationId: o.id },
            data: {
              status: "DUPLICATE_REVIEW",
              duplicateCandidates: candidates.map((candidate) => candidate.id),
              needsAttention:
                "This owned transfer may overlap an existing event; confirm its identity.",
            },
          });
          return;
        }
      }
      const event = await db.financialTransaction.create({
        data: {
          userId,
          type: "TRANSFER",
          accountId: from,
          destinationAccountId: to,
          currency: o.currency,
          amountMinor: o.amountMinor,
          occurredAt: o.occurredAt,
          activityOn: o.activityOn,
          dataSource: o.source,
          reviewedAt: null,
        },
      });
      await db.financialEvidenceLink.update({
        where: { observationId: o.id },
        data: { status: "PROJECTED", transactionId: event.id },
      });
      return;
    }
  }
  if (!distinct) {
    const candidates = await findEvidenceOverlapCandidates(
      db,
      userId,
      o,
      accountId,
    );
    if (candidates.length) {
      await db.financialEvidenceLink.update({
        where: { observationId: o.id },
        data: {
          status: "DUPLICATE_REVIEW",
          duplicateCandidates: candidates.map((x) => x.id),
          needsAttention:
            "Possible overlapping transaction; confirm whether this is distinct.",
        },
      });
      return;
    }
  }
  const identity = o.counterpartyIdentity
    ? await db.counterpartyIdentity.findUnique({
        where: {
          userId_identityKey: { userId, identityKey: o.counterpartyIdentity },
        },
        include: { counterparty: true, defaultCategory: true },
      })
    : null;
  const known = identity && !identity.counterparty.archivedAt ? identity : null;
  const card = await db.financialAccount.findUniqueOrThrow({
    where: { id: accountId, userId },
  });
  const settlementCandidate =
    card.type === "CREDIT_CARD" &&
    o.direction === "CREDIT" &&
    card.repaymentMethod === "LINKED_ACCOUNT" &&
    card.settlementAccountId;
  if (settlementCandidate) {
    await db.financialEvidenceLink.update({
      where: { observationId: o.id },
      data: {
        status: "STAGED",
        needsAttention:
          "Confirm card repayment or classify this incoming movement.",
      },
    });
    return;
  }
  const transaction = await db.financialTransaction.create({
    data: {
      userId,
      accountId,
      currency: o.currency,
      amountMinor: o.amountMinor,
      occurredAt: o.occurredAt,
      activityOn: o.activityOn,
      dataSource: o.source,
      reviewedAt: null,
      type: o.direction === "CREDIT" ? "INCOME" : "EXPENSE",
      inflowKind: o.direction === "CREDIT" ? "OTHER" : null,
      counterpartyId: known?.counterpartyId,
      expenseCategoryId:
        o.direction === "DEBIT"
          ? known?.defaultCategory?.archivedAt
            ? null
            : known?.defaultCategoryId
          : null,
    },
  });
  await db.financialEvidenceLink.update({
    where: { observationId: o.id },
    data: {
      status: "PROJECTED",
      transactionId: transaction.id,
      needsAttention: null,
    },
  });
  await matchImportedRecurringTransaction(db, userId, transaction.id);
}

export async function resolveFinancialEvidence(
  userId: string,
  observationId: string,
  decision: "distinct" | "duplicate" | "ignore",
  transactionId?: string,
  tx?: Prisma.TransactionClient,
) {
  const run = async (db: Prisma.TransactionClient) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
    const link = await db.financialEvidenceLink.findFirst({
      where: { userId, observationId },
      include: { observation: true },
    });
    if (!link?.accountId)
      throw new FinanceError("Evidence is unavailable or not mapped.");
    await db.$queryRaw`SELECT id FROM financial_account WHERE id=${link.accountId} AND "userId"=${userId} FOR NO KEY UPDATE`;
    if (
      link.status === "PROJECTED" ||
      link.status === "SUPERSEDED" ||
      link.status === "IGNORED"
    )
      return;
    if (decision === "ignore") {
      await db.financialEvidenceLink.update({
        where: { id: link.id, userId },
        data: {
          status: "IGNORED",
          resolvedAt: new Date(),
          needsAttention: null,
        },
      });
      return;
    }
    const batch = link.observation.importId
      ? await db.financialStatementImport.findFirst({
          where: { id: link.observation.importId, userId },
        })
      : null;
    if (batch?.status === "PREVIEW") {
      if (decision === "duplicate") {
        const candidate = await db.financialTransaction.findFirst({
          where: {
            id: transactionId,
            userId,
            currency: link.observation.currency,
            OR: [
              { accountId: link.accountId },
              { destinationAccountId: link.accountId },
            ],
          },
        });
        if (!candidate)
          throw new FinanceError("Choose an owned matching existing event.");
      }
      await db.financialEvidenceLink.update({
        where: { id: link.id, userId },
        data: {
          status: "STAGED",
          transactionId: decision === "duplicate" ? transactionId : null,
          resolvedAt: new Date(),
          duplicateCandidates: [],
          needsAttention: null,
        },
      });
      return;
    }
    if (decision === "distinct") {
      if (link.transactionId)
        throw new FinanceError(
          "A corrected source fact must be reconciled with its existing event.",
        );
      await projectFinancialEvidence(db, userId, observationId, true);
      return;
    }
    const event = await db.financialTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
        currency: link.observation.currency,
        OR: [
          { accountId: link.accountId },
          { destinationAccountId: link.accountId },
        ],
      },
    });
    if (!event)
      throw new FinanceError(
        "Choose an owned matching event in the same account and currency.",
      );
    if (
      (event.type === "TRANSFER"
        ? event.accountId === link.accountId
          ? "DEBIT"
          : "CREDIT"
        : event.type === "INCOME"
          ? "CREDIT"
          : "DEBIT") !== link.observation.direction
    )
      throw new FinanceError("Direction does not match.");
    if (!(await applyCorrection(db, userId, link.observation, event.id)))
      throw new FinanceError(
        "Correct allocations before accepting the source correction.",
      );
    await db.financialEvidenceLink.updateMany({
      where: {
        userId,
        transactionId: event.id,
        accountId: link.accountId,
        status: "PROJECTED",
        observation: { bookingStatus: "BOOKED" },
      },
      data: { status: "SUPERSEDED" },
    });
    await db.financialEvidenceLink.update({
      where: { id: link.id, userId },
      data: {
        status: "PROJECTED",
        transactionId: event.id,
        duplicateCandidates: [],
        resolvedAt: new Date(),
        needsAttention: null,
      },
    });
    await matchImportedRecurringTransaction(db, userId, event.id);
  };
  return tx ? run(tx) : prisma.$transaction(run, { timeout: 30000 });
}
