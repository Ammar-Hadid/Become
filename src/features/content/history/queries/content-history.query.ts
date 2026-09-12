import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  decodeContentCursor,
  encodeContentCursor,
  observationView,
  getVariantPublications,
} from "@/features/content/queries/content.query";
import { toSessionListItem } from "@/features/sessions/mappers/session.mapper";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
export async function getContentHistory(
  userId: string,
  kind: "observations" | "publication" | "sessions" | "releases",
  id: string,
  cursor?: string,
) {
  if (kind === "releases") return getVariantPublications(userId, id, cursor);
  if (kind === "publication") {
    const version = cursor ? Number(cursor) : 2147483647;
    if (!Number.isInteger(version) || version < 1)
      throw new DirectionError("Invalid history page.");
    const rows = await prisma.publicationRevision.findMany({
      where: { userId, publicationId: id, version: { lt: version } },
      orderBy: { version: "desc" },
      take: 21,
    });
    return {
      items: rows
        .slice(0, 20)
        .map((h) => ({
          id: h.id,
          version: h.version,
          kind: h.kind,
          reason: h.reason,
          recordedAt: h.createdAt.toISOString(),
          snapshot: h.snapshot,
        })),
      nextCursor: rows.length > 20 ? String(rows[19].version) : null,
    };
  }
  const at = decodeContentCursor(cursor);
  if (kind === "observations") {
    const rows = await prisma.performanceObservation.findMany({
      where: {
        userId,
        publicationId: id,
        ...(at
          ? {
              OR: [
                { observedAt: { lt: at.at } },
                { observedAt: at.at, id: { lt: at.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ observedAt: "desc" }, { id: "desc" }],
      take: 21,
      include: { supersededBy: { select: { id: true } } },
    });
    return {
      items: rows.slice(0, 20).map(observationView),
      nextCursor:
        rows.length > 20
          ? encodeContentCursor(rows[19].observedAt, rows[19].id)
          : null,
    };
  }
  const rows = await prisma.session.findMany({
    where: {
      userId,
      contentId: id,
      ...(at
        ? {
            OR: [
              { startedAt: { lt: at.at } },
              { startedAt: at.at, id: { lt: at.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: 51,
    include: { domain: true, activityType: true, engineeringProject: true },
  });
  return {
    items: rows.slice(0, 50).map((s) => toSessionListItem(s)),
    nextCursor:
      rows.length > 50
        ? encodeContentCursor(rows[49].startedAt, rows[49].id)
        : null,
  };
}
