import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getPaymentCandidates(
  userId: string,
  paymentId: string,
  search?: string,
) {
  const payment = await prisma.financialTransaction.findFirstOrThrow({
    where: { id: paymentId, userId },
    include: { paymentAllocations: true, incomeOpportunity: true },
  });
  const term = search?.trim().slice(0, 200);
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      financeActivityKind: "PAID_WORK",
      endedAt: { not: null },
      domain: { slug: "finance" },
      ...(term
        ? {
            OR: [
              { id: term },
              { description: { contains: term, mode: "insensitive" as const } },
              {
                workSource: {
                  name: { contains: term, mode: "insensitive" as const },
                },
              },
              {
                incomeOpportunity: {
                  title: { contains: term, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      workSource: true,
      incomeOpportunity: true,
      paymentAllocations: {
        select: { transactionId: true, amountMinor: true },
      },
    },
    orderBy: [
      { paymentAttributionCompleteAt: { sort: "asc", nulls: "first" } },
      { endedAt: "desc" },
      { id: "asc" },
    ],
    take: 200,
  });
  // Keep existing allocations editable even when older than the suggestion window.
  const missing = payment.paymentAllocations
    .map((allocation) => allocation.sessionId)
    .filter((id) => !sessions.some((session) => session.id === id));
  if (missing.length)
    sessions.push(
      ...(await prisma.session.findMany({
        where: { userId, id: { in: missing } },
        include: {
          workSource: true,
          incomeOpportunity: true,
          paymentAllocations: {
            select: { transactionId: true, amountMinor: true },
          },
        },
      })),
    );
  return sessions
    .map((session) => {
      const reasons: string[] = [];
      let rank = 0;
      if (
        payment.workSourceId &&
        session.workSourceId === payment.workSourceId
      ) {
        rank += 100;
        reasons.push("Same work source");
      }
      if (
        payment.incomeOpportunityId &&
        session.incomeOpportunityId === payment.incomeOpportunityId
      ) {
        rank += 50;
        reasons.push("Same opportunity");
      }
      if (
        (session.incomeOpportunity?.resultingWorkSourceId &&
          session.incomeOpportunity.resultingWorkSourceId ===
            payment.workSourceId) ||
        (payment.incomeOpportunity?.resultingWorkSourceId &&
          payment.incomeOpportunity.resultingWorkSourceId ===
            session.workSourceId)
      ) {
        rank += 25;
        reasons.push("Linked through accepted opportunity");
      }
      if (!session.paymentAttributionCompleteAt) {
        rank += 10;
        reasons.push("Attribution unresolved");
      }
      const amount =
        session.paymentAllocations.find(
          (allocation) => allocation.transactionId === paymentId,
        )?.amountMinor ?? null;
      return {
        id: session.id,
        description: session.description || "Paid work",
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt!.toISOString(),
        durationSeconds: Math.max(
          0,
          Math.floor(
            (session.endedAt!.getTime() - session.startedAt.getTime()) / 1000,
          ),
        ),
        workSourceName: session.workSource?.name ?? "Unassigned",
        complete: Boolean(session.paymentAttributionCompleteAt),
        amount: amount?.toString() ?? null,
        reasons,
        rank,
        proximity: Math.abs(
          payment.occurredAt.getTime() - session.endedAt!.getTime(),
        ),
      };
    })
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        a.proximity - b.proximity ||
        a.id.localeCompare(b.id),
    );
}
