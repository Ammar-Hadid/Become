import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import {
  problemSchema,
  evidenceSchema,
  sourcedObservationSchema,
  assessmentSchema,
} from "@/features/entrepreneurship/problems/schemas/problem.schema";
import { resolveCompany } from "@/features/entrepreneurship/market/services/market.service";
import {
  evidenceInclude,
  evidenceCondition,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import type { Prisma } from "@/generated/prisma/client";
import { lockFinancialTransaction } from "@/features/finance/transactions/services/transaction-lock.service";
import { isBusinessReceipt } from "@/features/finance/business-receipts/services/business-receipt.service";

export async function linkReceiptEvidence(
  userId: string,
  problemId: string,
  key: string,
  input: { receiptAllocationId: string; stance: string; explanation: string },
) {
  if (
    !["SUPPORTS", "CONTRADICTS", "CONTEXT"].includes(input.stance) ||
    !input.explanation.trim() ||
    input.explanation.length > 6000
  )
    throw new BusinessError(
      "Explain the receipt’s relationship to this problem.",
    );
  return captureOnce(userId, key, input, async (tx) => {
    await requireProblem(tx, userId, problemId);
    const source = await tx.businessReceiptAllocation.findFirst({
      where: { id: input.receiptAllocationId, userId },
    });
    if (!source?.transactionId)
      throw new BusinessError("Choose an available receipt attribution.");
    await lockFinancialTransaction(tx, userId, source.transactionId);
    const allocation = await tx.businessReceiptAllocation.findFirstOrThrow({
      where: { id: source.id, userId },
      include: { transaction: true },
    });
    if (
      allocation.withdrawnAt ||
      allocation.needsReviewAt ||
      !allocation.transaction ||
      !isBusinessReceipt(allocation.transaction)
    )
      throw new BusinessError(
        "Review the Finance attribution before using it as evidence.",
      );
    const evidence = await tx.problemEvidence.create({
      data: {
        userId,
        problemId,
        receiptAllocationId: allocation.id,
        stance: input.stance,
        explanation: input.explanation.trim(),
        receiptSnapshot: {
          amountMinor: allocation.amountMinor.toString(),
          currency: allocation.transaction.currency,
          occurredAt: allocation.transaction.occurredAt.toISOString(),
          companyName: allocation.companySnapshot,
        },
      },
    });
    return evidence.id;
  });
}

async function requireProblem(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  const problem = await tx.problem.findFirst({
    where: { id, userId, archivedAt: null },
  });
  if (!problem) throw new BusinessError("Choose an active problem you own.");
  return problem;
}
export async function createProblem(
  userId: string,
  key: string,
  input: unknown,
) {
  const data = problemSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const niche = data.nicheId
      ? await tx.niche.findFirst({
          where: { id: data.nicheId, userId, archivedAt: null },
        })
      : null;
    if (data.nicheId && !niche)
      throw new BusinessError("Choose an active niche you own.");
    return (
      await tx.problem.create({
        data: { ...data, userId, nicheSnapshot: niche?.name },
      })
    ).id;
  });
}
export async function linkEvidence(
  userId: string,
  problemId: string,
  key: string,
  input: unknown,
) {
  const data = evidenceSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await requireProblem(tx, userId, problemId);
    const source = await tx.observationRevision.findFirst({
      where: {
        id: data.observationRevisionId,
        observationId: data.observationId,
        userId,
      },
      include: { observation: true },
    });
    if (
      !source ||
      source.observation.voidedAt ||
      source.version !== source.observation.version
    )
      throw new BusinessError(
        "Choose the current version of an available observation.",
      );
    const evidence = await tx.problemEvidence.create({
      data: { ...data, userId, problemId },
    });
    return evidence.id;
  });
}
export async function recordObservation(
  userId: string,
  problemId: string | null,
  key: string,
  input: unknown,
) {
  const data = sourcedObservationSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    if (problemId) await requireProblem(tx, userId, problemId);
    let company = await resolveCompany(
      tx,
      userId,
      data.companyId,
      data.companyName,
    );
    let niche = data.nicheId
      ? await tx.niche.findFirst({
          where: { id: data.nicheId, userId, archivedAt: null },
        })
      : null;
    if (data.nicheId && !niche)
      throw new BusinessError("Choose an active niche you own.");
    const source =
      data.sourceKind === "INTERACTION"
        ? await tx.interactionRevision.findFirst({
            where: {
              id: data.interactionRevisionId ?? "",
              interactionId: data.interactionId ?? "",
              userId,
            },
            include: { interaction: true, company: true, niche: true },
          })
        : null;
    if (data.sourceKind === "INTERACTION") {
      if (
        !source ||
        source.interaction.voidedAt ||
        source.version !== source.interaction.version
      )
        throw new BusinessError(
          "Choose the current version of an available interaction.",
        );
      if (company && source.companyId && company.id !== source.companyId)
        throw new BusinessError(
          "Observation and source must refer to the same company.",
        );
      if (niche && source.nicheId && niche.id !== source.nicheId)
        throw new BusinessError(
          "Observation and source must refer to the same niche.",
        );
      company ??= source.company;
      niche ??= source.niche;
    }
    if (data.sourceKind === "PUBLIC_SOURCE" && !data.sourceUrl)
      throw new BusinessError("Keep the public source URL.");
    const observation = await tx.observation.create({ data: { userId } });
    const revision = await tx.observationRevision.create({
      data: {
        userId,
        observationId: observation.id,
        version: 1,
        kind: data.kind,
        wordingMode: data.wordingMode,
        statement: data.statement,
        observedAt: data.observedAt,
        companyId: company?.id,
        companySnapshot: company?.name,
        nicheId: niche?.id,
        nicheSnapshot: niche?.name,
        sourceKind: data.sourceKind,
        interactionId: source?.interactionId,
        interactionRevisionId: source?.id,
        sourceUrl: data.sourceKind === "PUBLIC_SOURCE" ? data.sourceUrl : null,
        sourceDescription: data.sourceDescription,
      },
    });
    if (problemId) {
      if (!data.explanation)
        throw new BusinessError(
          "Explain how this source relates to the problem.",
        );
      await tx.problemEvidence.create({
        data: {
          userId,
          problemId,
          observationId: observation.id,
          observationRevisionId: revision.id,
          stance: data.stance,
          explanation: data.explanation,
        },
      });
    }
    return observation.id;
  });
}
export async function assessProblem(
  userId: string,
  problemId: string,
  key: string,
  input: unknown,
) {
  const data = assessmentSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await requireProblem(tx, userId, problemId);
    const ids = [...new Set(data.evidenceIds)];
    const evidence = await tx.problemEvidence.findMany({
      where: { id: { in: ids }, problemId, userId, withdrawnAt: null },
      include: evidenceInclude,
    });
    if (evidence.length !== ids.length)
      throw new BusinessError("Choose evidence from this problem only.");
    if (evidence.some((item) => evidenceCondition(item) !== "CURRENT"))
      throw new BusinessError(
        "Review changed sources before using them for a new judgment.",
      );
    if (
      data.state === "SUPPORTED_FOR_SCOPE" &&
      !evidence.some((item) => item.stance === "SUPPORTS")
    )
      throw new BusinessError(
        "A supported judgment needs at least one supporting source and a clear scope.",
      );
    const assessment = await tx.problemAssessment.create({
      data: {
        userId,
        problemId,
        state: data.state,
        scope: data.scope,
        rationale: data.rationale,
        assessedAt: data.assessedAt,
      },
    });
    await tx.problemAssessmentEvidence.createMany({
      data: ids.map((evidenceId) => ({
        userId,
        problemId,
        assessmentId: assessment.id,
        evidenceId,
      })),
    });
    return assessment.id;
  });
}
export async function withdrawEvidence(
  userId: string,
  problemId: string,
  id: string,
  reason: string,
) {
  if (!reason.trim())
    throw new BusinessError(
      "Explain why you are withdrawing this interpretation.",
    );
  const evidence = await prisma.problemEvidence.findFirst({
    where: { id, problemId, userId },
  });
  if (!evidence) throw new BusinessError("Evidence not found in this problem.");
  return prisma.problemEvidence.update({
    where: { id },
    data: {
      withdrawnAt: new Date(),
      withdrawalReason: reason.trim().slice(0, 2000),
    },
  });
}
export async function reconfirmEvidence(
  userId: string,
  problemId: string,
  ids: string[],
) {
  if (!ids.length || ids.length > 200)
    throw new BusinessError("Select the sources whose meaning you reviewed.");
  return prisma.$transaction(async (tx) => {
    const records = await tx.problemEvidence.findMany({
      where: { id: { in: ids }, userId, problemId, withdrawnAt: null },
      include: evidenceInclude,
    });
    if (
      records.length !== new Set(ids).size ||
      records.some((record) =>
        ["SOURCE_WITHDRAWN", "WITHDRAWN"].includes(evidenceCondition(record)),
      )
    )
      throw new BusinessError("Withdrawn sources cannot be reconfirmed.");
    await tx.problemEvidence.updateMany({
      where: { id: { in: ids }, userId, problemId },
      data: { confirmedAt: new Date() },
    });
  });
}
