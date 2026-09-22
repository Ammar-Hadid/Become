import { Prisma } from "@/generated/prisma/client";
import {
  offerExplorationSql,
  problemExplorationSql,
} from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { nexoFingerprint } from "@/features/nexo/utils/nexo-json.util";
import { NexoError } from "@/features/nexo/types/nexo.types";
import { boundSynthesisContext } from "@/features/entrepreneurship/synthesis/utils/synthesis-context.util";
import type { SynthesisSource } from "@/features/entrepreneurship/synthesis/types/synthesis.types";

// One eligible-source relation drives both complete-set freshness and bounded excerpts.
// The full material stays in SQL: only selected excerpts cross the provider boundary.
function synthesisSources(userId: string, nicheId: string) {
  const base = `/entrepreneurship/explorations/${nicheId}`;
  return Prisma.sql`WITH sources AS (
    SELECT 'OBSERVATION'::text AS type,o.id,r.id AS revision,r."observedAt" AS date,
      LEFT(r.statement,240) AS label,concat_ws(E'\n',r.statement,r."sourceDescription",r."sourceUrl") AS excerpt,
      ${base + "/evidence/observations/"}||o.id AS href,
      jsonb_build_object('record',to_jsonb(o),'revision',to_jsonb(r)) AS material
    FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r.version=o.version AND r."userId"=o."userId"
    WHERE o."userId"=${userId} AND r."nicheId"=${nicheId} AND o."voidedAt" IS NULL
    UNION ALL
    SELECT CASE WHEN r.kind='CONVERSATION' THEN 'CONVERSATION' ELSE 'OUTREACH' END,i.id,r.id,r."occurredAt",LEFT(r.summary,240),
      concat_ws(E'\n',r.kind,r.summary,r.notes,r."personSnapshot",r."companySnapshot",s.outcome,s.summary,s."nextAction"),
      CASE WHEN r.kind='CONVERSATION' THEN ${base + "/conversations/"} ELSE ${base + "/outreach/"} END||i.id,
      jsonb_build_object('record',to_jsonb(i),'revision',to_jsonb(r),'debrief',to_jsonb(s))
    FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"
    LEFT JOIN interview_session s ON s."interactionId"=i.id AND s."userId"=i."userId"
    WHERE i."userId"=${userId} AND r."nicheId"=${nicheId} AND i."voidedAt" IS NULL AND r.kind IN ('CONVERSATION','OUTREACH_SENT','REPLY_RECEIVED','ATTEMPT_NO_CONTACT')
    UNION ALL
    SELECT 'MESSAGE',m.id,r.id,r."occurredAt",LEFT(r."speakerNameSnapshot"||': '||r.body,240),
      r."speakerNameSnapshot"||' ('||r."speakerRole"||'): '||r.body,
      ${base + "/conversations/"}||i.id||'?message='||m.id||'#message-'||m.id,
      jsonb_build_object('record',to_jsonb(m),'revision',to_jsonb(r),'interactionRevision',ir.id)
    FROM conversation_message m JOIN conversation_message_revision r ON r."messageId"=m.id AND r.version=m.version AND r."userId"=m."userId"
    JOIN interaction i ON i.id=m."interactionId" AND i."userId"=m."userId"
    JOIN interaction_revision ir ON ir."interactionId"=i.id AND ir.version=i.version AND ir."userId"=i."userId"
    WHERE m."userId"=${userId} AND ir."nicheId"=${nicheId} AND ir.kind='CONVERSATION' AND i."voidedAt" IS NULL AND m."voidedAt" IS NULL
    UNION ALL
    SELECT 'PROBLEM',p.id,p.id,p."formulatedAt",p.title,concat_ws(E'\n','User hypothesis',p.title,p."initialStatement",p.notes),
      ${base + "/so-far-we-know/problems/"}||p.id,
      jsonb_build_object('record',to_jsonb(p),'evidence',COALESCE((SELECT jsonb_agg(to_jsonb(pe) ORDER BY pe.id) FROM problem_evidence pe WHERE pe."userId"=${userId} AND pe."problemId"=p.id),'[]'::jsonb))
    FROM problem p WHERE p."userId"=${userId} AND ${problemExplorationSql(userId, nicheId, Prisma.sql`p.id`)} AND p."archivedAt" IS NULL
    UNION ALL
    SELECT 'ASSESSMENT',a.id,a.id,a."assessedAt",p.title,concat_ws(E'\n','User assessment',a.state,a.scope,a.rationale),
      ${base + "/so-far-we-know/problems/"}||p.id,
      jsonb_build_object('record',to_jsonb(a),'basis',COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b."evidenceId") FROM problem_assessment_evidence b WHERE b."userId"=${userId} AND b."assessmentId"=a.id),'[]'::jsonb))
    FROM problem_assessment a JOIN problem p ON p.id=a."problemId" AND p."userId"=a."userId"
    WHERE a."userId"=${userId} AND ${problemExplorationSql(userId, nicheId, Prisma.sql`p.id`)} AND p."archivedAt" IS NULL
    UNION ALL
    SELECT 'EXPLORATION_DECISION',d.id,d.id,d."createdAt",d.direction,concat_ws(E'\n','User decision',d.direction,d.rationale,d."scopeSnapshot",d."conclusionScope"),
      ${base + "/overview"},to_jsonb(d)
    FROM niche_decision d WHERE d."userId"=${userId} AND d."nicheId"=${nicheId}
    UNION ALL
    SELECT 'DECISION',d.id,h.id,d."decidedOn",LEFT(d.choice,240),concat_ws(E'\n','User decision',d.choice,d.reason,d.context,d."expectedOutcome"),
      '/direction/decisions/'||d.id,jsonb_build_object('record',to_jsonb(d),'revision',to_jsonb(h))
    FROM direction_decision d JOIN direction_decision_change h ON h."decisionId"=d.id AND h.version=d.version AND h."userId"=d."userId"
    WHERE d."userId"=${userId} AND d."nicheId"=${nicheId} AND d."archivedAt" IS NULL
    UNION ALL
    SELECT 'OFFER',o.id,r.id,r."createdAt",r.title,
      concat_ws(E'\n',r.title,r.scope,r.terms,'Price basis: '||r."priceBasis",'Amount in minor units: '||r."priceMinor"::text,r.currency,'Proposed at: '||r."proposedAt"::text),
      ${base + "/offers/"}||o.id,jsonb_build_object('record',to_jsonb(o),'revision',to_jsonb(r),'engagements',COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.id) FROM offer_engagement g WHERE g."offerId"=o.id AND g."userId"=${userId}),'[]'::jsonb))
    FROM offer o JOIN LATERAL (SELECT * FROM offer_revision r WHERE r."offerId"=o.id AND r."userId"=o."userId" ORDER BY r.version DESC LIMIT 1) r ON TRUE
    WHERE o."userId"=${userId} AND o."archivedAt" IS NULL AND ${offerExplorationSql(userId, nicheId, Prisma.sql`o.id`)}
    UNION ALL
    SELECT 'OFFER_EVENT',e.id,e.id,e."occurredAt",e.kind,concat_ws(E'\n',e.kind,e."sourceDescription",'Offer revision: '||e."offerRevisionId",'Recipient: '||COALESCE(g."personSnapshot",g."companySnapshot",g."audienceLabel",e."engagementId",'Specific offer recipient')),
      ${base + "/offers/"}||e."offerId",jsonb_build_object('event',to_jsonb(e),'recipient',to_jsonb(g))
    FROM offer_event e LEFT JOIN offer_engagement g ON g.id=e."engagementId" AND g."userId"=e."userId" WHERE e."userId"=${userId} AND e."retractedAt" IS NULL
      AND ${offerExplorationSql(userId, nicheId, Prisma.sql`e."offerId"`)}
    UNION ALL
    SELECT 'EXPERIMENT',e.id,h.id,h."createdAt",e.title,concat_ws(E'\n',e.title,e.question,e.approach,e.status,e.outcome,e.result,e.learning),
      '/direction/experiments/'||e.id,jsonb_build_object('record',to_jsonb(e),'revision',to_jsonb(h),
        'criteria',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM direction_criterion c WHERE c."experimentId"=e.id AND c."userId"=${userId}),'[]'::jsonb),
        'links',COALESCE((SELECT jsonb_agg(to_jsonb(es) ORDER BY es."interactionId") FROM experiment_source es WHERE es."experimentId"=e.id AND es."userId"=${userId}),'[]'::jsonb))
    FROM experiment e JOIN LATERAL (SELECT * FROM experiment_change h WHERE h."experimentId"=e.id AND h."userId"=e."userId" ORDER BY h.version DESC,h."createdAt" DESC,h.id DESC LIMIT 1) h ON TRUE
    WHERE e."userId"=${userId} AND e."archivedAt" IS NULL AND (
      EXISTS(SELECT 1 FROM direction_criterion c WHERE c."experimentId"=e.id AND c."nicheId"=${nicheId} AND c."userId"=${userId})
      OR EXISTS(SELECT 1 FROM experiment_source es JOIN interaction i ON i.id=es."interactionId" AND i."userId"=es."userId" JOIN interaction_revision ir ON ir."interactionId"=i.id AND ir.version=i.version AND ir."userId"=i."userId" WHERE es."experimentId"=e.id AND es."userId"=${userId} AND ir."nicheId"=${nicheId} AND i."voidedAt" IS NULL))
    UNION ALL
    SELECT 'RECEIPT',a.id,a.id,a."occurredAtSnapshot",'Recorded receipt',
      concat_ws(E'\n','Recorded receipt, amount in minor units: '||a."amountMinor"::text,a."currencySnapshot",a.note,CASE WHEN a."needsReviewAt" IS NOT NULL OR a."sourceChangedAt" IS NOT NULL THEN 'Attribution needs review; do not treat as confirmed evidence' ELSE 'Attribution confirmed' END),
      CASE WHEN a."offerRevisionId" IS NOT NULL THEN ${base + "/offers/"}||(SELECT r."offerId" FROM offer_revision r WHERE r.id=a."offerRevisionId" AND r."userId"=${userId})||'#receipts' ELSE '/finance' END,
      jsonb_build_object('allocation',to_jsonb(a),'transaction',to_jsonb(t))
    FROM business_receipt_allocation a LEFT JOIN financial_transaction t ON t.id=a."transactionId" AND t."userId"=a."userId"
    WHERE a."userId"=${userId} AND a."withdrawnAt" IS NULL AND (a."nicheId"=${nicheId} OR EXISTS(SELECT 1 FROM offer_revision r WHERE r.id=a."offerRevisionId" AND r."userId"=${userId} AND ${offerExplorationSql(userId, nicheId, Prisma.sql`r."offerId"`)}))
  )`;
}

export async function readSynthesisContext(
  db: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
) {
  const niche = await db.niche.findFirst({
    where: { id: nicheId, userId },
    select: {
      id: true,
      name: true,
      scope: true,
      marketFocus: true,
      marketConclusion: true,
      direction: true,
      archivedAt: true,
    },
  });
  if (!niche) throw new NexoError("Choose an exploration you own.");
  const sources = synthesisSources(userId, nicheId);
  const understandingSql = Prisma.sql`WITH understanding AS (
    SELECT c.id,c.version,c."archivedAt",NULL::timestamp AS "resolvedAt",r.id AS revision,r.kind,r.lane,r.statement,r."sourceManifest" AS sources
    FROM exploration_claim c JOIN exploration_claim_revision r ON r."claimId"=c.id AND r.version=c.version AND r."userId"=c."userId"
    WHERE c."userId"=${userId} AND c."nicheId"=${nicheId}
    UNION ALL
    SELECT u.id,u.version,u."archivedAt",u."resolvedAt",r.id,r.kind,r.lane,r.statement,r."sourceManifest"
    FROM exploration_uncertainty u JOIN exploration_uncertainty_revision r ON r."uncertaintyId"=u.id AND r.version=u.version AND r."userId"=u."userId"
    WHERE u."userId"=${userId} AND u."nicheId"=${nicheId}
  )`;
  const [material, rows, base, understanding] = await Promise.all([
    db.$queryRaw<
      { fingerprint: string; count: number; metrics: Record<string, number> }[]
    >(Prisma.sql`${sources}
      SELECT md5(COALESCE(string_agg(type||':'||id||':'||revision||':'||md5(material::text),'|' ORDER BY type,id),'')) AS fingerprint,
      COUNT(*)::int AS count,(SELECT COALESCE(jsonb_object_agg(type,total),'{}') FROM (SELECT type,COUNT(*)::int AS total FROM sources GROUP BY type) counts) AS metrics FROM sources`),
    db.$queryRaw<
      {
        type: SynthesisSource["type"];
        id: string;
        revisionId: string;
        occurredAt: Date;
        label: string;
        excerpt: string;
        href: string;
        fingerprint: string;
      }[]
    >(Prisma.sql`${sources}, ranked_sources AS (
      SELECT *,ROW_NUMBER() OVER(PARTITION BY type ORDER BY date DESC,id) AS source_rank FROM sources
    ) SELECT type,id,revision AS "revisionId",date AS "occurredAt",LEFT(label,240) AS label,LEFT(excerpt,5000) AS excerpt,href,md5(material::text) AS fingerprint FROM ranked_sources ORDER BY source_rank,date DESC,type,id LIMIT 200`),
    db.$queryRaw<{ fingerprint: string; count: number }[]>(
      Prisma.sql`${understandingSql} SELECT md5(COALESCE(string_agg(to_jsonb(understanding)::text,'|' ORDER BY id),'')) AS fingerprint,COUNT(*) FILTER (WHERE "archivedAt" IS NULL AND "resolvedAt" IS NULL)::int AS count FROM understanding`,
    ),
    db.$queryRaw<
      {
        id: string;
        revisionId: string;
        kind: string;
        lane: string;
        statement: string;
      }[]
    >(
      Prisma.sql`${understandingSql} SELECT id,revision AS "revisionId",kind,lane,LEFT(statement,2000) AS statement FROM understanding WHERE "archivedAt" IS NULL AND "resolvedAt" IS NULL ORDER BY id LIMIT 200`,
    ),
  ]);
  return boundSynthesisContext({
    schemaVersion: 1,
    exploration: { id: niche.id, name: niche.name, scope: niche.scope },
    materialFingerprint: nexoFingerprint({
      sources: material[0]?.fingerprint,
      scope: niche,
    }),
    baseUnderstandingFingerprint: base[0]?.fingerprint ?? "",
    contextFingerprint: "",
    coverage: {
      eligibleSources: material[0]?.count ?? 0,
      includedSources: 0,
      omittedSources: 0,
      eligibleUnderstanding: base[0]?.count ?? 0,
      includedUnderstanding: 0,
      omittedUnderstanding: 0,
    },
    metrics: material[0]?.metrics ?? {},
    sources: rows.map((row) => ({
      ...row,
      key: `${row.type}:${row.id}`,
      occurredAt: row.occurredAt.toISOString(),
    })),
    understanding,
  });
}

export async function readSynthesisSourceStates(
  db: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  sources: SynthesisSource[],
) {
  if (!sources.length) return {};
  const rows = await db.$queryRaw<{ key: string; fingerprint: string }[]>(
    Prisma.sql`${synthesisSources(userId, nicheId)} SELECT type||':'||id AS key,md5(material::text) AS fingerprint FROM sources WHERE type||':'||id IN (${Prisma.join(sources.map((source) => source.key))})`,
  );
  const current = new Map(rows.map((row) => [row.key, row.fingerprint]));
  return Object.fromEntries(
    sources.map((source) => [
      source.key,
      !current.has(source.key)
        ? "unavailable"
        : current.get(source.key) === source.fingerprint
          ? "current"
          : "changed",
    ]),
  ) as Record<string, "current" | "changed" | "unavailable">;
}

export async function readSelectedSynthesisSources(
  db: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  keys: string[],
): Promise<SynthesisSource[]> {
  if (!keys.length) return [];
  const rows = await db.$queryRaw<
    {
      type: SynthesisSource["type"];
      id: string;
      revisionId: string;
      occurredAt: Date;
      label: string;
      excerpt: string;
      href: string;
      fingerprint: string;
    }[]
  >(
    Prisma.sql`${synthesisSources(userId, nicheId)} SELECT type,id,revision AS "revisionId",date AS "occurredAt",LEFT(label,240) AS label,LEFT(excerpt,5000) AS excerpt,href,md5(material::text) AS fingerprint FROM sources WHERE type||':'||id IN (${Prisma.join(keys)}) ORDER BY type,id`,
  );
  return rows.map((row) => ({
    ...row,
    key: `${row.type}:${row.id}`,
    occurredAt: row.occurredAt.toISOString(),
  }));
}
