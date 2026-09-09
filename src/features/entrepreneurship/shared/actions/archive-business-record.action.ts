"use server";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
export async function archiveBusinessRecordAction(
  kind: "problem" | "offer",
  id: string,
  restore: boolean,
) {
  return businessMutation(async (userId) => {
    z.enum(["problem", "offer"]).parse(kind);
    const args = {
      where: { id_userId: { id, userId } },
      data: { archivedAt: restore ? null : new Date() },
    };
    return kind === "problem"
      ? prisma.problem.update(args)
      : prisma.offer.update(args);
  });
}
