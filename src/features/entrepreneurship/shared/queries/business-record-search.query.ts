import { Prisma } from "@/generated/prisma/client";
import { offerExplorationSql } from "@/features/entrepreneurship/explorations/queries/exploration-scope.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  businessRecordSearchSchema,
  type BusinessRecordOption,
} from "../schemas/business-record-search.schema";
import {
  collectionSearch,
  readCollectionCursor,
  writeCollectionCursor,
} from "../utils/collection-cursor.util";
export async function searchBusinessRecords(userId: string, input: unknown) {
  const data = businessRecordSearchSchema.parse(input),
    search = collectionSearch(data.q),
    cursor = readCollectionCursor(data.cursor);
  const niche = data.nicheId;
  let from: Prisma.Sql,
    scope: Prisma.Sql,
    label: Prisma.Sql,
    searchText: Prisma.Sql,
    revision: Prisma.Sql,
    market: Prisma.Sql = Prisma.sql`NULL::text`,
    description: Prisma.Sql = Prisma.sql`NULL::text`;
  if (data.kind === "source") return searchExplorationSources(userId, data);
  if (data.kind === "interaction" || data.kind === "observation") {
    const interaction = data.kind === "interaction";
    from = interaction
      ? Prisma.sql`interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"`
      : Prisma.sql`observation i JOIN observation_revision r ON r."observationId"=i.id AND r.version=i.version AND r."userId"=i."userId"`;
    scope = Prisma.sql`i."voidedAt" IS NULL ${niche ? Prisma.sql`AND r."nicheId"=${niche}` : Prisma.empty} ${interaction ? Prisma.sql`AND r.kind IN (${Prisma.join(data.interactionKinds?.length ? data.interactionKinds : ["OUTREACH_SENT", "REPLY_RECEIVED", "CONVERSATION"])})` : Prisma.empty}`;
    label = interaction
      ? Prisma.sql`concat_ws(' · ',COALESCE(r."personSnapshot",r."companySnapshot",r."audienceLabel"),LEFT(r.summary,180))`
      : Prisma.sql`concat_ws(' · ',COALESCE(r."personSnapshot",r."companySnapshot",r."audienceLabel"),LEFT(r.statement,180))`;
    searchText = interaction
      ? Prisma.sql`concat_ws(' ',r.summary,r.notes,r."personSnapshot",r."companySnapshot",r."audienceLabel")`
      : Prisma.sql`concat_ws(' ',r.statement,r."sourceDescription",r."personSnapshot",r."companySnapshot",r."audienceLabel")`;
    revision = Prisma.sql`r.id`;
  } else {
    const tables = {
      person: "person",
      company: "company",
      segment: "audience_segment",
      problem: "problem",
    };
    from = Prisma.sql`${Prisma.raw(tables[data.kind])} i`;
    if (data.kind === "problem")
      scope = Prisma.sql`i."archivedAt" IS NULL ${niche ? Prisma.sql`AND i."nicheId"=${niche}` : Prisma.empty}`;
    else {
      const links = {
        person: ["person_niche", "personId"],
        company: ["company_niche", "companyId"],
        segment: ["audience_segment_niche", "segmentId"],
      }[data.kind];
      scope = Prisma.sql`i."archivedAt" IS NULL ${niche ? Prisma.sql`AND EXISTS(SELECT 1 FROM ${Prisma.raw(links[0])} n WHERE n.${Prisma.raw('"' + links[1] + '"')}=i.id AND n."userId"=${userId} AND n."nicheId"=${niche})` : Prisma.empty}`;
    }
    label = data.kind === "problem" ? Prisma.sql`i.title` : Prisma.sql`i.name`;
    searchText = label;
    revision = Prisma.sql`NULL::text`;
    if (data.kind === "segment") {
      market = Prisma.sql`i."marketType"`;
      description = Prisma.sql`i.description`;
    }
  }
  type Row = {
    id: string;
    name: string;
    date: Date;
    revisionId: string | null;
    marketType: string | null;
    description: string | null;
  };
  const select = Prisma.sql`SELECT i.id,${label} AS name,i."createdAt" AS date,${revision} AS "revisionId",${market} AS "marketType",${description} AS description FROM ${from} WHERE i."userId"=${userId} AND ${scope}`;
  const [rows, selected] = await Promise.all([
    prisma.$queryRaw<Row[]>(
      Prisma.sql`${select} ${search ? Prisma.sql`AND ${searchText} ILIKE ${search}` : Prisma.empty} ${cursor ? Prisma.sql`AND(i."createdAt",i.id)<(${cursor.date},${cursor.id})` : Prisma.empty} ORDER BY i."createdAt" DESC,i.id DESC LIMIT 26`,
    ),
    data.selectedIds.length
      ? prisma.$queryRaw<Row[]>(
          Prisma.sql`${select} AND i.id IN (${Prisma.join(data.selectedIds)}) ORDER BY i."createdAt" DESC,i.id DESC`,
        )
      : Promise.resolve([]),
  ]);
  const page = rows.slice(0, 25),
    all = new Map([...page, ...selected].map((row) => [row.id, row]));
  const items: BusinessRecordOption[] = [...all.values()].map((row) => ({
    id: row.id,
    name: row.name,
    ...(row.revisionId ? { revisionId: row.revisionId } : {}),
    ...(row.marketType ? { marketType: row.marketType } : {}),
    ...(row.description ? { description: row.description } : {}),
  }));
  return {
    items,
    next: rows.length > 25 ? writeCollectionCursor(page[24]) : null,
  };
}

async function searchExplorationSources(
  userId: string,
  data: import("../schemas/business-record-search.schema").BusinessRecordSearch,
) {
  const cursor = readCollectionCursor(data.cursor),
    search = collectionSearch(data.q),
    niche = data.nicheId;
  const sources = Prisma.sql`WITH sources AS (
    SELECT 'CONVERSATION:'||r.id AS id,LEFT(r.summary,180) AS name,r."occurredAt" AS date,r.id AS "revisionId",concat_ws(' ',r.summary,r.notes,r."personSnapshot",r."companySnapshot") AS text
    FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version AND r."userId"=i."userId"
    WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.kind='CONVERSATION' ${niche ? Prisma.sql`AND r."nicheId"=${niche}` : Prisma.empty}
    UNION ALL
    SELECT 'OBSERVATION:'||r.id,LEFT(r.statement,180),r."observedAt",r.id,concat_ws(' ',r.statement,r."sourceDescription",r."personSnapshot",r."companySnapshot")
    FROM observation o JOIN observation_revision r ON r."observationId"=o.id AND r.version=o.version AND r."userId"=o."userId"
    WHERE o."userId"=${userId} AND o."voidedAt" IS NULL ${niche ? Prisma.sql`AND r."nicheId"=${niche}` : Prisma.empty}
    UNION ALL
    SELECT 'OFFER_EVENT:'||e.id,e.kind||' · '||LEFT(r.title,140),e."occurredAt",e.id,concat_ws(' ',e.kind,r.title,e."sourceDescription")
    FROM offer_event e JOIN offer_revision r ON r.id=e."offerRevisionId" AND r."userId"=e."userId"
    WHERE e."userId"=${userId} AND e."retractedAt" IS NULL ${niche ? Prisma.sql`AND ${offerExplorationSql(userId, niche, Prisma.sql`e."offerId"`)}` : Prisma.empty}
  )`;
  type Row = BusinessRecordOption & { date: Date };
  const [rows, selected] = await Promise.all([
    prisma.$queryRaw<Row[]>(
      Prisma.sql`${sources} SELECT id,name,date,"revisionId" FROM sources WHERE TRUE ${search ? Prisma.sql`AND text ILIKE ${search}` : Prisma.empty} ${cursor ? Prisma.sql`AND (date,id)<(${cursor.date},${cursor.id})` : Prisma.empty} ORDER BY date DESC,id DESC LIMIT 26`,
    ),
    data.selectedIds?.length
      ? prisma.$queryRaw<Row[]>(
          Prisma.sql`${sources} SELECT id,name,date,"revisionId" FROM sources WHERE id IN (${Prisma.join(data.selectedIds)})`,
        )
      : Promise.resolve([]),
  ]);
  return {
    items: [
      ...new Map(
        [...rows.slice(0, 25), ...selected].map((row) => [
          row.id,
          { id: row.id, name: row.name, revisionId: row.revisionId },
        ]),
      ).values(),
    ],
    next: rows.length > 25 ? writeCollectionCursor(rows[24]) : null,
  };
}
