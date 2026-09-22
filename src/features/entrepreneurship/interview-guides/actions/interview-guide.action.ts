"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type {
  InterviewGuideDraftView,
  InterviewGuideSaveResult,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import {
  archiveInterviewGuide,
  createInterviewGuide,
  duplicateInterviewGuide,
  ensureStarterInterviewGuides,
  publishInterviewGuide,
  saveInterviewGuideDraft,
} from "@/features/entrepreneurship/interview-guides/services/interview-guide.service";

function draftView(guide: {
  id: string;
  nicheId: string;
  segmentId: string | null;
  title: string;
  objective: string;
  marketType: string;
  expectedDurationMinutes: number;
  draftDocument: Prisma.JsonValue;
  version: number;
  savedAt: Date;
  archivedAt: Date | null;
}): InterviewGuideDraftView {
  return {
    ...guide,
    savedAt: guide.savedAt.toISOString(),
    archivedAt: guide.archivedAt?.toISOString() ?? null,
  };
}

export async function createInterviewGuideAction(
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    createInterviewGuide(userId, operationKey, input),
  );
}

export async function ensureStarterInterviewGuidesAction(
  nicheId: string,
  operationKey: string,
) {
  return businessMutation((userId) =>
    ensureStarterInterviewGuides(userId, nicheId, operationKey),
  );
}

export async function saveInterviewGuideDraftAction(
  guideId: string,
  operationKey: string,
  input: unknown,
): Promise<InterviewGuideSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { kind: "rejected", message: "Sign in before saving." };
  try {
    const guide = await saveInterviewGuideDraft(
      user.id,
      guideId,
      operationKey,
      input,
    );
    if (!guide)
      return {
        kind: "uncertain",
        message: "Become did not confirm this guide. Retry to check the save.",
      };
    revalidatePath("/entrepreneurship", "layout");
    return { kind: "saved", guide: draftView(guide) };
  } catch (error) {
    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Check the guide details.")
        : error instanceof BusinessError
          ? error.message
          : "The guide save could not be confirmed. Retry this draft.";
    const conflict =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2025"].includes(error.code)) ||
      (error instanceof BusinessError &&
        /changed in another tab/i.test(message));
    if (conflict) {
      const latest = await prisma.interviewGuide.findFirst({
        where: { id: guideId, userId: user.id },
      });
      if (latest)
        return { kind: "conflict", message, latest: draftView(latest) };
    }
    if (error instanceof ZodError || error instanceof BusinessError)
      return { kind: "rejected", message };
    console.error("Interview guide autosave failed", error);
    return { kind: "uncertain", message };
  }
}

export async function publishInterviewGuideAction(
  guideId: string,
  operationKey: string,
  input: unknown,
) {
  return businessMutation((userId) =>
    publishInterviewGuide(userId, guideId, operationKey, input),
  );
}

export async function duplicateInterviewGuideAction(
  guideId: string,
  operationKey: string,
) {
  return businessMutation((userId) =>
    duplicateInterviewGuide(userId, guideId, operationKey),
  );
}

export async function archiveInterviewGuideAction(
  guideId: string,
  operationKey: string,
  archived: boolean,
) {
  return businessMutation((userId) =>
    archiveInterviewGuide(userId, guideId, operationKey, { archived }),
  );
}
