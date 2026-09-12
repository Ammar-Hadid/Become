import {
  DirectionError,
  jsonValue,
  lockDirection,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
export async function linkIdeaOutput(
  tx: DirectionTx,
  userId: string,
  ideaId: string,
  destination:
    { contentId: string } | { goalId: string } | { experimentId: string },
  kind: "CREATED" | "LINKED",
) {
  await lockDirection(tx, userId, `idea:${ideaId}`);
  const idea = await tx.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) throw new DirectionError("Idea not found.", "ideaId", 404);
  if (idea.archivedAt)
    throw new DirectionError("Restore this idea before developing it.");
  const prior = await tx.ideaOutput.findFirst({
    where: { userId, ideaId, ...destination },
  });
  if (prior) return;
  await tx.ideaOutput.create({
    data: { userId, ideaId, ...destination, kind },
  });
  await tx.ideaChange.create({
    data: {
      userId,
      ideaId,
      kind: kind === "CREATED" ? "PROMOTED" : "LINKED",
      snapshot: jsonValue(destination),
    },
  });
}
