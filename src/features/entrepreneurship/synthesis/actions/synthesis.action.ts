"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { NexoError } from "@/features/nexo/types/nexo.types";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { SYNTHESIS_TASK } from "@/features/nexo/constants/nexo-task.constants";
import { nexoRunDisplayState } from "@/features/nexo/utils/nexo-run-state.util";
import {
  generateSynthesis,
  acceptSynthesis,
  discardSynthesis,
} from "../services/synthesis.service";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
async function mutate(
  run: (userId: string) => Promise<{ id: string }>,
): Promise<RecordFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in before continuing." };
  try {
    const result = await run(user.id);
    revalidatePath("/entrepreneurship", "layout");
    return { error: null, success: "Saved.", id: result.id };
  } catch (error) {
    return {
      error:
        error instanceof NexoError
          ? error.message
          : error instanceof z.ZodError
            ? (error.issues[0]?.message ?? "Review your proposal.")
            : "Could not complete this request. Your accepted understanding is unchanged.",
    };
  }
}
export async function generateSynthesisAction(
  nicheId: string,
  operationKey: string,
) {
  return mutate((userId) => generateSynthesis(userId, nicheId, operationKey));
}
export async function acceptSynthesisAction(
  nicheId: string,
  runId: string,
  output: unknown,
) {
  return mutate((userId) => acceptSynthesis(userId, nicheId, runId, output));
}
export async function discardSynthesisAction(nicheId: string, runId: string) {
  return mutate((userId) => discardSynthesis(userId, nicheId, runId));
}

export async function getSynthesisRunStatusAction(
  nicheId: string,
  runId: string,
) {
  const user = await getCurrentUser();
  if (!user) return null;
  const run = await prisma.nexoRun.findFirst({
    where: {
      id: runId,
      userId: user.id,
      scopeId: nicheId,
      taskId: SYNTHESIS_TASK,
    },
    select: {
      status: true,
      error: true,
      createdAt: true,
      configSnapshot: true,
    },
  });
  return run ? nexoRunDisplayState(run) : null;
}
