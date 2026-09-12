import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  decodeCursor,
  encodeCursor,
} from "@/lib/pagination/utils/keyset-cursor.util";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import {
  ideaChangeView,
  ideaOutputInclude,
  ideaOutputView,
  decisionChangeView,
  decisionReflectionView,
} from "./thinking.query";

export async function getThinkingHistory(
  userId: string,
  kind: "idea" | "ideaOutputs" | "decision" | "reflections",
  id: string,
  cursor?: string,
) {
  if (kind === "decision") {
    const version = cursor ? Number(cursor) : 2147483647;
    if (!Number.isSafeInteger(version) || version < 1)
      throw new DirectionError("Invalid history page.");
    const rows = await prisma.decisionChange.findMany({
      where: { userId, decisionId: id, version: { lt: version } },
      orderBy: { version: "desc" },
      take: 21,
    });
    return {
      items: rows.slice(0, 20).map(decisionChangeView),
      nextCursor: rows.length > 20 ? String(rows[19].version) : null,
    };
  }
  const at = decodeCursor(cursor);
  const createdPage = at
    ? {
        OR: [
          { createdAt: { lt: at.at } },
          { createdAt: at.at, id: { lt: at.id } },
        ],
      }
    : {};
  if (kind === "idea") {
    const rows = await prisma.ideaChange.findMany({
      where: { userId, ideaId: id, ...createdPage },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
    });
    return {
      items: rows.slice(0, 20).map(ideaChangeView),
      nextCursor:
        rows.length > 20 ? encodeCursor(rows[19].createdAt, rows[19].id) : null,
    };
  }
  if (kind === "ideaOutputs") {
    const rows = await prisma.ideaOutput.findMany({
      where: { userId, ideaId: id, ...createdPage },
      include: ideaOutputInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
    });
    return {
      items: rows.slice(0, 20).map(ideaOutputView),
      nextCursor:
        rows.length > 20 ? encodeCursor(rows[19].createdAt, rows[19].id) : null,
    };
  }
  const rows = await prisma.decisionReflection.findMany({
    where: {
      userId,
      decisionId: id,
      ...(at
        ? {
            OR: [
              { reflectedOn: { lt: at.at } },
              { reflectedOn: at.at, id: { lt: at.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ reflectedOn: "desc" }, { id: "desc" }],
    take: 21,
  });
  return {
    items: rows.slice(0, 20).map(decisionReflectionView),
    nextCursor:
      rows.length > 20 ? encodeCursor(rows[19].reflectedOn, rows[19].id) : null,
  };
}
