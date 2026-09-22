import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { recommendExplorationNextMove } from "@/features/entrepreneurship/exploration-snapshots/utils/exploration-recommendation.util";
import type {
  ExplorationCoverage,
  ExplorationRecommendationFacts,
} from "@/features/entrepreneurship/exploration-snapshots/types/exploration-snapshot.types";

type SnapshotDatabase = Prisma.TransactionClient;

const observableOutcomeKinds = [
  "INTERESTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
  "SUPERSEDED",
  "CANCELLED",
  "CLOSED",
] as const;

export async function readExplorationSnapshotFacts(
  db: SnapshotDatabase,
  userId: string,
  nicheId: string,
) {
  const niche = await db.niche.findFirst({
    where: { id: nicheId, userId },
    select: { id: true, scope: true, archivedAt: true },
  });
  if (!niche) return null;

  const [targets, interactionFacts, observations, problems, tests, outcomes] =
    await Promise.all([
      Promise.all([
        db.person.count({
          where: { userId, archivedAt: null, niches: { some: { nicheId } } },
        }),
        db.company.count({
          where: { userId, archivedAt: null, niches: { some: { nicheId } } },
        }),
      ]),
      db.$queryRaw<
        {
          outreach: number;
          replies: number;
          conversations: number;
        }[]
      >(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE r.kind = 'OUTREACH_SENT')::int AS outreach,
          COUNT(*) FILTER (WHERE r.kind = 'REPLY_RECEIVED')::int AS replies,
          COUNT(*) FILTER (WHERE r.kind = 'CONVERSATION' AND i.status = 'COMPLETED')::int AS conversations
        FROM interaction i
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE i."userId" = ${userId}
          AND i."voidedAt" IS NULL
          AND r."nicheId" = ${nicheId}
      `),
      db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM observation o
        JOIN observation_revision r
          ON r."observationId" = o.id AND r.version = o.version
        WHERE o."userId" = ${userId}
          AND o."voidedAt" IS NULL
          AND r."nicheId" = ${nicheId}
      `),
      db.problem.count({
        where: { userId, nicheId, archivedAt: null },
      }),
      db.offer.count({
        where: {
          userId,
          archivedAt: null,
          niches: { some: { nicheId } },
        },
      }),
      db.offerEvent.count({
        where: {
          userId,
          retractedAt: null,
          kind: { in: [...observableOutcomeKinds] },
          offer: { niches: { some: { nicheId } } },
        },
      }),
    ]);

  const [
    latestMaterial,
    latestEdition,
    overdueFollowUp,
    activeConversation,
    replyWithoutConversation,
  ] = await Promise.all([
    db.$queryRaw<{ latest: Date | null }[]>(Prisma.sql`
        SELECT MAX(source."createdAt") AS latest FROM (
          SELECT GREATEST(r."createdAt", COALESCE(o."voidedAt", r."createdAt")) AS "createdAt"
          FROM observation o
          JOIN observation_revision r
            ON r."observationId" = o.id AND r.version = o.version
          WHERE o."userId" = ${userId} AND r."nicheId" = ${nicheId}
          UNION ALL
          SELECT GREATEST(r."createdAt", COALESCE(i."voidedAt", r."createdAt"))
          FROM interaction i
          JOIN interaction_revision r
            ON r."interactionId" = i.id AND r.version = i.version
          WHERE i."userId" = ${userId}
            AND r."nicheId" = ${nicheId} AND r.kind IN ('REPLY_RECEIVED', 'CONVERSATION')
          UNION ALL
          SELECT GREATEST(
            r."createdAt",
            COALESCE(m."voidedAt", r."createdAt"),
            COALESCE(i."voidedAt", r."createdAt")
          )
          FROM conversation_message m
          JOIN conversation_message_revision r
            ON r."messageId" = m.id AND r.version = m.version
          JOIN interaction i
            ON i.id = m."interactionId" AND i."userId" = m."userId"
          JOIN interaction_revision ir
            ON ir."interactionId" = i.id AND ir.version = i.version
          WHERE m."userId" = ${userId} AND ir."nicheId" = ${nicheId}
            AND ir.kind = 'CONVERSATION'
          UNION ALL
          SELECT GREATEST(p."createdAt", COALESCE(p."archivedAt", p."createdAt"))
          FROM problem p
          WHERE p."userId" = ${userId} AND p."nicheId" = ${nicheId}
          UNION ALL
          SELECT GREATEST(e."createdAt", COALESCE(e."withdrawnAt", e."createdAt"))
          FROM problem_evidence e
          JOIN problem p ON p.id = e."problemId" AND p."userId" = e."userId"
          WHERE e."userId" = ${userId} AND p."nicheId" = ${nicheId}
          UNION ALL
          SELECT a."createdAt"
          FROM problem_assessment a
          JOIN problem p ON p.id = a."problemId" AND p."userId" = a."userId"
          WHERE a."userId" = ${userId} AND p."nicheId" = ${nicheId}
          UNION ALL
          SELECT GREATEST(e."createdAt", COALESCE(e."retractedAt", e."createdAt"))
          FROM offer_event e
          WHERE e."userId" = ${userId}
            AND EXISTS (
              SELECT 1 FROM offer_niche n WHERE n."offerId" = e."offerId" AND n."nicheId" = ${nicheId}
            )
          UNION ALL
          SELECT GREATEST(o."createdAt", COALESCE(o."archivedAt", o."createdAt"))
          FROM offer o
          WHERE o."userId" = ${userId}
            AND EXISTS (
              SELECT 1 FROM offer_niche n WHERE n."offerId" = o.id AND n."nicheId" = ${nicheId}
            )
          UNION ALL
          SELECT r."createdAt"
          FROM offer_revision r
          WHERE r."userId" = ${userId}
            AND EXISTS (
              SELECT 1 FROM offer_niche n WHERE n."offerId" = r."offerId" AND n."nicheId" = ${nicheId}
            )
          UNION ALL
          SELECT n."createdAt"
          FROM offer_niche n
          WHERE n."userId" = ${userId} AND n."nicheId" = ${nicheId}
          UNION ALL
          SELECT r."createdAt" FROM exploration_claim_revision r
          WHERE r."userId" = ${userId} AND r."nicheId" = ${nicheId}
          UNION ALL
          SELECT r."createdAt" FROM exploration_uncertainty_revision r
          WHERE r."userId" = ${userId} AND r."nicheId" = ${nicheId}
          UNION ALL
          SELECT c."archivedAt" FROM exploration_claim c
          WHERE c."userId" = ${userId} AND c."nicheId" = ${nicheId}
            AND c."archivedAt" IS NOT NULL
          UNION ALL
          SELECT u."resolvedAt" FROM exploration_uncertainty u
          WHERE u."userId" = ${userId} AND u."nicheId" = ${nicheId}
            AND u."resolvedAt" IS NOT NULL
          UNION ALL
          SELECT u."archivedAt" FROM exploration_uncertainty u
          WHERE u."userId" = ${userId} AND u."nicheId" = ${nicheId}
            AND u."archivedAt" IS NOT NULL
        ) source
      `),
    db.explorationSnapshotEdition.findFirst({
      where: { userId, nicheId },
      orderBy: [{ number: "desc" }, { id: "desc" }],
      select: { id: true, number: true, publishedAt: true },
    }),
    db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT f.id
        FROM follow_up f
        LEFT JOIN interaction i ON i.id = f."interactionId" AND i."userId" = f."userId"
        LEFT JOIN interaction_revision r ON r."interactionId" = i.id AND r.version = i.version
        WHERE f."userId" = ${userId}
          AND f."completedAt" IS NULL AND f."cancelledAt" IS NULL
          AND f."dueOn" IS NOT NULL AND f."dueOn" <= CURRENT_DATE
          AND (
            r."nicheId" = ${nicheId}
            OR EXISTS (
              SELECT 1 FROM offer_niche n WHERE n."offerId" = f."offerId" AND n."nicheId" = ${nicheId}
            )
          )
        ORDER BY f."dueOn", f.id
        LIMIT 1
      `),
    db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT i.id
        FROM interaction i
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE i."userId" = ${userId} AND i."voidedAt" IS NULL
          AND i.status IN ('DRAFT', 'IN_PROGRESS')
          AND r.kind = 'CONVERSATION' AND r."nicheId" = ${nicheId}
        ORDER BY i."createdAt" DESC, i.id DESC
        LIMIT 1
      `),
    db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT i.id
        FROM interaction i
        JOIN interaction_revision r
          ON r."interactionId" = i.id AND r.version = i.version
        WHERE i."userId" = ${userId} AND i."voidedAt" IS NULL
          AND r.kind = 'REPLY_RECEIVED' AND r."nicheId" = ${nicheId}
          AND NOT EXISTS (
            SELECT 1
            FROM interaction conversation
            JOIN interaction_revision conversation_revision
              ON conversation_revision."interactionId" = conversation.id
              AND conversation_revision.version = conversation.version
            WHERE conversation."userId" = ${userId}
              AND conversation."voidedAt" IS NULL
              AND conversation_revision.kind = 'CONVERSATION'
              AND conversation_revision."respondsToInteractionId" = i.id
          )
        ORDER BY r."occurredAt" DESC, i.id DESC
        LIMIT 1
      `),
  ]);

  const [supportedProblem, testWithoutOutcome] = await Promise.all([
    db.problem.findFirst({
      where: {
        userId,
        nicheId,
        archivedAt: null,
        evidence: { some: { stance: "SUPPORTS", withdrawnAt: null } },
        offerRevisions: { none: {} },
      },
      orderBy: [{ formulatedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    }),
    db.offer.findFirst({
      where: {
        userId,
        archivedAt: null,
        niches: { some: { nicheId } },
        events: {
          none: {
            retractedAt: null,
            kind: { in: [...observableOutcomeKinds] },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    }),
  ]);

  const targetCount = targets.reduce((sum, count) => sum + count, 0);
  const interaction = interactionFacts[0] ?? {
    outreach: 0,
    replies: 0,
    conversations: 0,
  };
  const observationCount = observations[0]?.count ?? 0;
  const latestMaterialAt = latestMaterial[0]?.latest ?? null;
  const coverage: ExplorationCoverage = {
    targets: targetCount,
    outreach: interaction.outreach,
    replies: interaction.replies,
    conversations: interaction.conversations,
    observations: observationCount,
    problems,
    tests,
    outcomes,
    latestMaterialAt: latestMaterialAt?.toISOString() ?? null,
  };
  const recommendationFacts: ExplorationRecommendationFacts = {
    overdueFollowUpId: overdueFollowUp[0]?.id ?? null,
    activeConversationId: activeConversation[0]?.id ?? null,
    scopeReady: Boolean(niche.scope?.trim()),
    targets: targetCount,
    outreach: interaction.outreach,
    replies: interaction.replies,
    conversations: interaction.conversations,
    replyWithoutConversationId: replyWithoutConversation[0]?.id ?? null,
    observations: observationCount,
    repeatedObservationsWithoutProblem: observationCount >= 2 && problems === 0,
    supportedProblemWithoutTestId: supportedProblem?.id ?? null,
    activeTestWithoutOutcomeId: testWithoutOutcome?.id ?? null,
    snapshotStale: Boolean(
      latestEdition &&
      latestMaterialAt &&
      latestMaterialAt.getTime() > latestEdition.publishedAt.getTime(),
    ),
  };
  return {
    niche,
    coverage,
    recommendationFacts,
    recommendation: recommendExplorationNextMove(recommendationFacts),
    latestEdition,
    latestMaterialAt,
  };
}

export async function getExplorationSnapshot(userId: string, nicheId: string) {
  return prisma.$transaction(
    async (tx) => {
      const facts = await readExplorationSnapshotFacts(tx, userId, nicheId);
      if (!facts) return null;
      const [claims, uncertainties, latestEdition] = await Promise.all([
        tx.explorationClaim.findMany({
          where: { userId, nicheId, archivedAt: null },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: {
            revisions: {
              orderBy: { version: "desc" },
              take: 1,
              include: {
                citations: {
                  orderBy: [{ stance: "asc" }, { createdAt: "asc" }],
                  include: {
                    observation: {
                      select: { version: true, voidedAt: true },
                    },
                    observationRevision: {
                      select: {
                        version: true,
                        statement: true,
                        observedAt: true,
                        sourceDescription: true,
                        sourceMessage: {
                          select: { version: true, voidedAt: true },
                        },
                        sourceMessageRevision: { select: { version: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.explorationUncertainty.findMany({
          where: {
            userId,
            nicheId,
            archivedAt: null,
            resolvedAt: null,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: {
            revisions: { orderBy: { version: "desc" }, take: 1 },
          },
        }),
        tx.explorationSnapshotEdition.findFirst({
          where: { userId, nicheId },
          orderBy: [{ number: "desc" }, { id: "desc" }],
          include: {
            claims: {
              orderBy: { position: "asc" },
              include: {
                claimRevision: {
                  include: {
                    citations: {
                      orderBy: [{ stance: "asc" }, { createdAt: "asc" }],
                      include: {
                        observationRevision: {
                          select: {
                            statement: true,
                            observedAt: true,
                            sourceDescription: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            uncertainties: {
              orderBy: { position: "asc" },
              include: { uncertaintyRevision: true },
            },
          },
        }),
      ]);
      return {
        ...facts,
        claims: claims.map((claim) => ({
          ...claim,
          needsReview: claim.revisions[0]?.citations.some(
            (citation) =>
              Boolean(citation.observation.voidedAt) ||
              citation.observation.version !==
                citation.observationRevision.version ||
              Boolean(citation.observationRevision.sourceMessage?.voidedAt) ||
              (citation.observationRevision.sourceMessage != null &&
                citation.observationRevision.sourceMessage.version !==
                  citation.observationRevision.sourceMessageRevision?.version),
          ),
        })),
        uncertainties,
        latestEdition,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000 },
  );
}

export function getExplorationSnapshotHistory(userId: string, nicheId: string) {
  return prisma.explorationSnapshotEdition.findMany({
    where: { userId, nicheId },
    orderBy: [{ number: "desc" }, { id: "desc" }],
    include: {
      claims: {
        orderBy: { position: "asc" },
        include: {
          claimRevision: {
            include: {
              citations: {
                orderBy: [{ stance: "asc" }, { createdAt: "asc" }],
                include: {
                  observationRevision: {
                    select: {
                      statement: true,
                      observedAt: true,
                      sourceDescription: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      uncertainties: {
        orderBy: { position: "asc" },
        include: { uncertaintyRevision: true },
      },
    },
  });
}
