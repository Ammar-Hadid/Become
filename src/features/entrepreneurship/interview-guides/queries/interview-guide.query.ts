import { prisma } from "@/lib/db/adapters/prisma.adapter";

export function getInterviewGuideIndex(userId: string, nicheId: string) {
  return prisma.interviewGuide.findMany({
    where: { userId, nicheId },
    orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      objective: true,
      marketType: true,
      expectedDurationMinutes: true,
      version: true,
      savedAt: true,
      archivedAt: true,
      segment: { select: { id: true, name: true } },
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, publishedAt: true },
      },
    },
  });
}

export function getInterviewGuide(userId: string, guideId: string) {
  return prisma.interviewGuide.findFirst({
    where: { id: guideId, userId },
    include: {
      niche: { select: { id: true, name: true, archivedAt: true } },
      segment: { select: { id: true, name: true, archivedAt: true } },
      revisions: { orderBy: { version: "desc" } },
    },
  });
}

export function getInterviewGuideOptions(userId: string, nicheId: string) {
  return prisma.interviewGuide.findMany({
    where: { userId, nicheId, archivedAt: null, revisions: { some: {} } },
    orderBy: [{ marketType: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      marketType: true,
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, publishedAt: true },
      },
    },
  });
}
