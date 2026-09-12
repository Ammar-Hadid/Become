import {
  Prisma,
  type EngineeringEvidenceType,
} from "@/generated/prisma/client";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";

export async function readEngineeringProjectCompletion(
  tx: DirectionTx,
  userId: string,
  projectId: string,
) {
  // Archiving does not withdraw the canonical project's lifecycle state.
  return tx.engineeringProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true, name: true, status: true, completedOn: true },
  });
}

export async function readEngineeringMeasurement(
  tx: DirectionTx,
  s: {
    userId: string;
    start: Date;
    end: Date;
    projectId?: string;
    evidenceType?: string;
  },
  offset = 0,
) {
  const where = {
    userId: s.userId,
    occurredAt: { gte: s.start, lt: s.end },
    ...(s.projectId ? { projectId: s.projectId } : {}),
    ...(s.evidenceType
      ? { type: s.evidenceType as EngineeringEvidenceType }
      : {}),
  };
  const [count, rows, digest] = await Promise.all([
    tx.engineeringEvidence.count({ where }),
    tx.engineeringEvidence.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: 25,
    }),
    tx.$queryRaw<{ hash: string }[]>(
      Prisma.sql`SELECT md5(COALESCE(string_agg(id||':'||type::text||':'||"occurredAt"::text||':'||COALESCE("projectId",''),',' ORDER BY id),'')) AS hash FROM engineering_evidence WHERE "userId"=${s.userId} AND "occurredAt">=${s.start} AND "occurredAt"<${s.end} ${s.projectId ? Prisma.sql`AND "projectId"=${s.projectId}` : Prisma.empty} ${s.evidenceType ? Prisma.sql`AND type::text=${s.evidenceType}` : Prisma.empty}`,
    ),
  ]);
  return { count, rows, hash: digest[0].hash };
}
