import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
export type EvidenceScope = {
  nicheId?: string;
  personId?: string;
  companyId?: string;
  segmentId?: string;
  marketType?: string;
  sourceKind?: string;
  cursor?: string;
};
export function evidenceScopeSql(
  scope: EvidenceScope,
  alias: "r" | "sr" = "r",
  participants = false,
) {
  const r = Prisma.raw(alias);
  return Prisma.sql`${scope.nicheId ? Prisma.sql`AND ${r}."nicheId"=${scope.nicheId}` : Prisma.empty}
 ${scope.personId ? Prisma.sql`AND (${r}."personId"=${scope.personId} ${participants ? Prisma.sql`OR EXISTS(SELECT 1 FROM interaction_participant ip WHERE ip."interactionRevisionId"=${r}.id AND ip."userId"=${r}."userId" AND ip."personId"=${scope.personId})` : Prisma.empty})` : Prisma.empty}
 ${scope.companyId ? Prisma.sql`AND ${r}."companyId"=${scope.companyId}` : Prisma.empty}
 ${scope.segmentId ? Prisma.sql`AND EXISTS (SELECT 1 FROM audience_context_segment acs WHERE acs."audienceContextId"=${r}."audienceContextId" AND acs."userId"=${r}."userId" AND acs."segmentId"=${scope.segmentId})` : Prisma.empty}
 ${scope.marketType ? (scope.marketType === "UNRECORDED" ? Prisma.sql`AND ${r}."audienceContextId" IS NULL` : Prisma.sql`AND EXISTS (SELECT 1 FROM audience_context ac WHERE ac.id=${r}."audienceContextId" AND ac."userId"=${r}."userId" AND ac."marketType"=${scope.marketType})`) : Prisma.empty}`;
}
export function getEvidenceJournal(userId: string, scope: EvidenceScope = {}) {
  return prisma.$transaction((tx) => readEvidenceJournal(tx, userId, scope), {
    isolationLevel: "RepeatableRead",
    timeout: 15000,
  });
}
async function readEvidenceJournal(
  db: Prisma.TransactionClient,
  userId: string,
  scope: EvidenceScope,
) {
  let cursor: { date: Date; id: string; type: string } | null = null;
  if (scope.cursor && scope.cursor.length < 1000)
    try {
      const value = JSON.parse(
        Buffer.from(scope.cursor, "base64url").toString(),
      );
      if (
        typeof value.id === "string" &&
        value.id.length < 100 &&
        ["INTERACTION", "OBSERVATION"].includes(value.type) &&
        !isNaN(new Date(value.date).getTime())
      )
        cursor = { ...value, date: new Date(value.date) };
    } catch {
      /* An invalid cursor starts a fresh owned page. */
    }
  const rows = await db.$queryRaw<
    { id: string; type: "INTERACTION" | "OBSERVATION"; date: Date }[]
  >(Prisma.sql`
 WITH entries AS (
  SELECT i.id,'INTERACTION'::text AS type,r."occurredAt" AS date FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r."userId"=i."userId" AND r.version=i.version
  WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' AND ((TRUE ${evidenceScopeSql(scope, "r", true)}) OR EXISTS(
   SELECT 1 FROM observation so JOIN observation_revision sr ON sr."observationId"=so.id AND sr.version=so.version AND sr."userId"=so."userId" WHERE so."userId"=${userId} AND so."voidedAt" IS NULL AND sr."interactionId"=i.id ${evidenceScopeSql(scope, "sr")}
  )) ${scope.sourceKind && scope.sourceKind !== "INTERACTION" ? Prisma.sql`AND FALSE` : Prisma.empty}
  UNION ALL
  SELECT o.id,'OBSERVATION'::text,r."observedAt" FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r."userId"=o."userId" AND r.version=o.version
  WHERE o."userId"=${userId} AND o."voidedAt" IS NULL ${evidenceScopeSql(scope)}
  ${scope.sourceKind === "INTERACTION" ? Prisma.sql`AND FALSE` : scope.sourceKind === "OBSERVATION" ? Prisma.empty : scope.sourceKind ? Prisma.sql`AND r."sourceKind"=${scope.sourceKind}` : Prisma.sql`AND r."interactionId" IS NULL`}
 ) SELECT * FROM entries ${cursor ? Prisma.sql`WHERE (date,type,id)<(${cursor.date},${cursor.type},${cursor.id})` : Prisma.empty} ORDER BY date DESC,type DESC,id DESC LIMIT 26`);
  const page = rows.slice(0, 25),
    interactionIds = page
      .filter((r) => r.type === "INTERACTION")
      .map((r) => r.id);
  const children = interactionIds.length
    ? await db.$queryRaw<
        { id: string; interactionId: string; total: number }[]
      >(Prisma.sql`
  SELECT id,"interactionId",total FROM (SELECT o.id,r."interactionId",COUNT(*) OVER(PARTITION BY r."interactionId")::int AS total,ROW_NUMBER() OVER(PARTITION BY r."interactionId" ORDER BY (TRUE ${evidenceScopeSql(scope)}) DESC,r."observedAt" DESC,o.id DESC) AS rank FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r.version=o.version AND r."userId"=o."userId" WHERE o."userId"=${userId} AND o."voidedAt" IS NULL AND r."interactionId" IN (${Prisma.join(interactionIds)})) ranked WHERE rank<=30`)
    : [];
  const [interactions, observations] = await Promise.all([
    db.interaction.findMany({
      where: { userId, id: { in: interactionIds } },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { audienceContext: audienceInclude },
        },
      },
    }),
    db.observation.findMany({
      where: {
        userId,
        id: {
          in: [
            ...page.filter((r) => r.type === "OBSERVATION").map((r) => r.id),
            ...children.map((r) => r.id),
          ],
        },
      },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { audienceContext: audienceInclude },
        },
      },
    }),
  ]);
  const entries = page.map((row) => {
    const record =
      row.type === "INTERACTION"
        ? interactions.find((i) => i.id === row.id)!.revisions[0]
        : observations.find((o) => o.id === row.id)!.revisions[0];
    const nested =
      row.type === "INTERACTION"
        ? observations
            .filter((o) => o.revisions[0]?.interactionId === row.id)
            .map((o) => ({
              ...o.revisions[0],
              id: o.id,
              revisionId: o.revisions[0].id,
              observationId: o.id,
            }))
        : [];
    return {
      id: row.id,
      type: row.type,
      occurredAt: row.date,
      title: "summary" in record ? record.summary : record.statement,
      interactionKind:
        "kind" in record && row.type === "INTERACTION" ? record.kind : null,
      sourceKind: "sourceKind" in record ? record.sourceKind : "INTERACTION",
      sourceUrl: "sourceUrl" in record ? record.sourceUrl : null,
      sourceDescription:
        "sourceDescription" in record ? record.sourceDescription : null,
      wordingMode: "wordingMode" in record ? record.wordingMode : null,
      notes: "notes" in record ? record.notes : null,
      audienceContext: record.audienceContext,
      identityKind: record.identityKind,
      personId: record.personId,
      personSnapshot: record.personSnapshot,
      companyId: record.companyId,
      companySnapshot: record.companySnapshot,
      audienceLabel: record.audienceLabel,
      sampleSize: record.sampleSize,
      sampleUnit: record.sampleUnit,
      observations: nested,
      omittedObservations: Math.max(
        0,
        (children.find((c) => c.interactionId === row.id)?.total ?? 0) -
          nested.length,
      ),
      revisionId: record.id,
      nicheId: record.nicheId,
      nicheSnapshot: record.nicheSnapshot,
    };
  });
  return {
    entries,
    next:
      rows.length > 25
        ? Buffer.from(JSON.stringify(page[24])).toString("base64url")
        : null,
  };
}
