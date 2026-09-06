"use server";
import { z } from "zod";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { financeSessionValues } from "@/features/finance/sessions/services/finance-session.service";
import { compensationSchema } from "@/features/finance/work-sources/schemas/work-source.schema";
export async function correctFinanceSessionAction(data: FormData) {
  return financeMutation(async (userId) => {
    const id = z.string().min(1).parse(data.get("sessionId"));
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM session WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
      const session = await tx.session.findFirst({
        where: {
          userId,
          id,
          endedAt: { not: null },
          domain: { slug: "finance" },
        },
      });
      if (!session?.financeActivityKind)
        throw new FinanceError(
          "A classified, completed Finance session is required.",
        );
      const values = await financeSessionValues(
        userId,
        session.financeActivityKind,
        {
          workSourceId: String(data.get("workSourceId") || "") || null,
          incomeOpportunityId:
            String(data.get("incomeOpportunityId") || "") || null,
          financeCompensationType: data.get("financeCompensationType")
            ? compensationSchema.parse(data.get("financeCompensationType"))
            : null,
        },
        tx,
      );
      const complete = z
        .enum(["yes", "no", "unsure"])
        .parse(data.get("completeness") || "unsure");
      await tx.session.update({
        where: { id, userId },
        data: {
          ...values,
          paymentAttributionCompleteAt:
            session.financeActivityKind === "PAID_WORK" && complete === "yes"
              ? new Date()
              : null,
        },
      });
    });
  });
}
