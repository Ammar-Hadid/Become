import { directionChangeView } from "@/features/direction/mappers/direction-history.mapper";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import type {
  DirectionChangeView,
  PageResult,
} from "@/features/direction/types/direction.types";
export async function getDirectionHistory(
  userId: string,
  kind: "GOAL" | "EXPERIMENT",
  id: string,
  cursor?: string,
): Promise<PageResult<DirectionChangeView>> {
  const isGoal = kind === "GOAL";
  const owner = isGoal
    ? await prisma.goal.findFirst({
        where: { id, userId },
        select: { id: true },
      })
    : await prisma.experiment.findFirst({
        where: { id, userId },
        select: { id: true },
      });
  if (!owner) throw new DirectionError("Intention not found.");
  const after = cursor
    ? isGoal
      ? await prisma.goalChange.findFirst({
          where: { id: cursor, userId, goalId: id },
        })
      : await prisma.experimentChange.findFirst({
          where: { id: cursor, userId, experimentId: id },
        })
    : null;
  if (cursor && !after) throw new DirectionError("History position not found.");
  const common = {
    userId,
    ...(after
      ? {
          OR: [
            { createdAt: { lt: after.createdAt } },
            { createdAt: after.createdAt, id: { lt: after.id } },
          ],
        }
      : {}),
  };
  const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
  const rows = isGoal
    ? await prisma.goalChange.findMany({
        where: { ...common, goalId: id },
        orderBy,
        take: 21,
      })
    : await prisma.experimentChange.findMany({
        where: { ...common, experimentId: id },
        orderBy,
        take: 21,
      });
  return {
    items: rows.slice(0, 20).map(directionChangeView),
    nextCursor: rows.length > 20 ? rows[19].id : null,
  };
}
