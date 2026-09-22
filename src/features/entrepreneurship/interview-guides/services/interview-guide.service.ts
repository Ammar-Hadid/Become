import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import {
  archiveInterviewGuideSchema,
  createInterviewGuideSchema,
  publishInterviewGuideSchema,
  saveInterviewGuideDraftSchema,
} from "@/features/entrepreneurship/interview-guides/schemas/interview-guide.schema";
import {
  interviewGuideQuestionIndex,
  starterInterviewGuideDocument,
  validateInterviewGuideDocument,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function validateScope(
  tx: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  segmentId: string | null,
  marketType: "B2C" | "B2B",
) {
  const niche = await tx.niche.findFirst({
    where: { id: nicheId, userId, archivedAt: null },
    select: { id: true },
  });
  if (!niche) throw new BusinessError("Choose an active exploration you own.");
  if (!segmentId) return null;
  const segment = await tx.audienceSegment.findFirst({
    where: {
      id: segmentId,
      userId,
      archivedAt: null,
      niches: { some: { nicheId } },
    },
    select: { id: true, name: true, marketType: true },
  });
  if (!segment)
    throw new BusinessError("Choose an active segment from this exploration.");
  if (segment.marketType !== "UNKNOWN" && segment.marketType !== marketType)
    throw new BusinessError("The guide and segment must use the same market.");
  return segment;
}

export async function createInterviewGuide(
  userId: string,
  operationKey: string,
  input: unknown,
) {
  const data = createInterviewGuideSchema.parse(input);
  const document = validateInterviewGuideDocument(data.document);
  return captureOnce(userId, operationKey, input, async (tx) => {
    await validateScope(
      tx,
      userId,
      data.nicheId,
      data.segmentId,
      data.marketType,
    );
    const guide = await tx.interviewGuide.create({
      data: {
        userId,
        nicheId: data.nicheId,
        segmentId: data.segmentId,
        title: data.title,
        objective: data.objective,
        marketType: data.marketType,
        expectedDurationMinutes: data.expectedDurationMinutes,
        draftDocument: json(document),
      },
    });
    return guide.id;
  });
}

export async function ensureStarterInterviewGuides(
  userId: string,
  nicheId: string,
  operationKey: string,
) {
  return captureOnce(userId, operationKey, { nicheId }, async (tx) => {
    await validateScope(tx, userId, nicheId, null, "B2C");
    const current = await tx.interviewGuide.findMany({
      where: { userId, nicheId, archivedAt: null },
      select: { id: true, marketType: true },
    });
    let first = current[0]?.id ?? "";
    for (const marketType of ["B2C", "B2B"] as const) {
      if (current.some((guide) => guide.marketType === marketType)) continue;
      const guide = await tx.interviewGuide.create({
        data: {
          userId,
          nicheId,
          title: `${marketType} discovery interview`,
          objective:
            marketType === "B2C"
              ? "Understand lived experience, current alternatives, and consequences."
              : "Understand the workflow, organizational impact, and buying process.",
          marketType,
          expectedDurationMinutes: 30,
          draftDocument: json(starterInterviewGuideDocument(marketType)),
        },
      });
      first ||= guide.id;
    }
    return first;
  });
}

export async function saveInterviewGuideDraft(
  userId: string,
  guideId: string,
  operationKey: string,
  input: unknown,
) {
  const data = saveInterviewGuideDraftSchema.parse(input);
  const document = validateInterviewGuideDocument(data.document);
  await captureOnce(userId, operationKey, input, async (tx) => {
    const guide = await tx.interviewGuide.findFirst({
      where: { id: guideId, userId, archivedAt: null },
    });
    if (!guide || guide.version !== data.expectedVersion)
      throw new BusinessError(
        "This guide changed in another tab. Your draft is preserved; compare the latest copy before saving.",
      );
    if (guide.nicheId !== data.nicheId)
      throw new BusinessError("A guide cannot move between explorations.");
    await validateScope(
      tx,
      userId,
      data.nicheId,
      data.segmentId,
      data.marketType,
    );
    const changed = await tx.interviewGuide.updateMany({
      where: {
        id: guideId,
        userId,
        version: data.expectedVersion,
        archivedAt: null,
      },
      data: {
        segmentId: data.segmentId,
        title: data.title,
        objective: data.objective,
        marketType: data.marketType,
        expectedDurationMinutes: data.expectedDurationMinutes,
        draftDocument: json(document),
        savedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (!changed.count)
      throw new BusinessError(
        "This guide changed in another tab. Your draft is preserved; compare the latest copy before saving.",
      );
    return guideId;
  });
  return prisma.interviewGuide.findFirst({ where: { id: guideId, userId } });
}

export async function publishInterviewGuide(
  userId: string,
  guideId: string,
  operationKey: string,
  input: unknown,
) {
  const data = publishInterviewGuideSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const guide = await tx.interviewGuide.findFirst({
      where: { id: guideId, userId, archivedAt: null },
      include: { segment: { select: { name: true } } },
    });
    if (!guide || guide.version !== data.expectedVersion)
      throw new BusinessError(
        "Review the latest saved guide before publishing.",
      );
    await validateScope(
      tx,
      userId,
      guide.nicheId,
      guide.segmentId,
      guide.marketType as "B2C" | "B2B",
    );
    const document = validateInterviewGuideDocument(guide.draftDocument);
    const questions = interviewGuideQuestionIndex(document);
    if (!questions.length)
      throw new BusinessError(
        "Add at least one interview question before publishing.",
      );
    const latest = await tx.interviewGuideRevision.findFirst({
      where: { guideId, userId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const revision = await tx.interviewGuideRevision.create({
      data: {
        userId,
        guideId,
        version: (latest?.version ?? 0) + 1,
        titleSnapshot: guide.title,
        objectiveSnapshot: guide.objective,
        marketType: guide.marketType,
        segmentId: guide.segmentId,
        segmentSnapshot: guide.segment?.name ?? null,
        expectedDurationMinutes: guide.expectedDurationMinutes,
        document: json(document),
        questionIndex: json(questions),
      },
    });
    return revision.id;
  });
}

export async function duplicateInterviewGuide(
  userId: string,
  guideId: string,
  operationKey: string,
) {
  return captureOnce(userId, operationKey, { guideId }, async (tx) => {
    const guide = await tx.interviewGuide.findFirst({
      where: { id: guideId, userId },
    });
    if (!guide) throw new BusinessError("Choose an interview guide you own.");
    await validateScope(
      tx,
      userId,
      guide.nicheId,
      guide.segmentId,
      guide.marketType as "B2C" | "B2B",
    );
    const duplicate = await tx.interviewGuide.create({
      data: {
        userId,
        nicheId: guide.nicheId,
        segmentId: guide.segmentId,
        title: `${guide.title} copy`.slice(0, 160),
        objective: guide.objective,
        marketType: guide.marketType,
        expectedDurationMinutes: guide.expectedDurationMinutes,
        draftDocument: json(guide.draftDocument),
      },
    });
    return duplicate.id;
  });
}

export async function archiveInterviewGuide(
  userId: string,
  guideId: string,
  operationKey: string,
  input: unknown,
) {
  const data = archiveInterviewGuideSchema.parse(input);
  return captureOnce(userId, operationKey, input, async (tx) => {
    const guide = await tx.interviewGuide.findFirst({
      where: { id: guideId, userId },
    });
    if (!guide) throw new BusinessError("Choose an interview guide you own.");
    await validateScope(
      tx,
      userId,
      guide.nicheId,
      guide.segmentId,
      guide.marketType as "B2C" | "B2B",
    );
    await tx.interviewGuide.update({
      where: { id_userId: { id: guideId, userId } },
      data: { archivedAt: data.archived ? new Date() : null },
    });
    return guideId;
  });
}
