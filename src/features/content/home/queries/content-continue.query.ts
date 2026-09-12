import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { CONTENT_STAGES } from "@/features/content/constants/content.constants";
import type { ContentStage } from "@/features/content/types/content.types";

/** One optional Home entry; the full production desk remains in Content. */
export async function getContentContinue(userId: string) {
  const selection = {
    id: true,
    title: true,
    variants: {
      where: { archivedAt: null },
      select: { nextStep: true, stage: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    },
    sessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
  } as const;
  const active = await prisma.content.findFirst({
    where: { userId, archivedAt: null, sessions: { some: { endedAt: null } } },
    select: selection,
  });
  const work =
    active ??
    (await prisma.content.findFirst({
      where: {
        userId,
        archivedAt: null,
        variants: { some: { archivedAt: null } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: selection,
    }));
  if (!work) return null;
  const version = work.variants[0];
  return {
    id: work.id,
    title: work.title,
    href: `/content/${work.id}`,
    nextStep:
      version?.nextStep ||
      (version
        ? CONTENT_STAGES[version.stage as ContentStage].guidance
        : "Open your creative work"),
    activeSessionId: work.sessions[0]?.id ?? null,
  };
}
