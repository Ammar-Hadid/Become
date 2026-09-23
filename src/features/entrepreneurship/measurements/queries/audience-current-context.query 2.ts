import type { Prisma } from "@/generated/prisma/client";
import { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";
export async function readAudienceCurrentContext(
  tx: Prisma.TransactionClient,
  userId: string,
  scope: { start: Date; end: Date },
) {
  const [summary, rows, total] = await Promise.all([
    getAudienceMetrics(userId, scope, tx),
    tx.niche.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 10,
      include: {
        decisions: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    }),
    tx.niche.count({ where: { userId, archivedAt: null } }),
  ]);
  return {
    version: 1 as const,
    summary,
    explorations: rows.map((n) => ({
      id: n.id,
      name: n.name,
      question: n.scope?.slice(0, 600) ?? null,
      workStatus: n.direction,
      audienceFocus: n.marketFocus,
      audienceConclusion: n.marketConclusion,
      classification: n.marketFocus === null ? "NOT_RECORDED" : "RECORDED",
      judgment: n.decisions[0]
        ? {
            id: n.decisions[0].id,
            recordedAt: n.decisions[0].createdAt.toISOString(),
            rationale: n.decisions[0].rationale.slice(0, 800),
            scope: n.decisions[0].conclusionScope?.slice(0, 600) ?? null,
            sourceCount: Array.isArray(n.decisions[0].sourceSnapshots)
              ? n.decisions[0].sourceSnapshots.length
              : 0,
          }
        : null,
      href: `/entrepreneurship/explorations/${n.id}`,
    })),
    omittedExplorations: Math.max(0, total - rows.length),
  };
}
