import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { SYNTHESIS_TASK } from "@/features/nexo/constants/nexo-task.constants";
import { nexoSettingsSchema } from "@/features/nexo/schemas/nexo-settings.schema";
import { executeOpenAiTask } from "@/features/nexo/adapters/openai.adapter";
import {
  NexoError,
  type NexoTaskRequest,
} from "@/features/nexo/types/nexo.types";
import {
  nexoFingerprint,
  nexoJson,
} from "@/features/nexo/utils/nexo-json.util";

export async function executeAiTask<T>(request: NexoTaskRequest<T>) {
  if (request.taskId !== SYNTHESIS_TASK || request.taskVersion !== 1)
    throw new NexoError("This Nexo task is not available yet.");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(request.operationKey))
    throw new NexoError("Reopen this view before generating.");
  const input = JSON.stringify(nexoJson(request.input));
  if (Buffer.byteLength(input, "utf8") > 65536)
    throw new NexoError("The source context exceeds the generation limit.");
  const fingerprint = nexoFingerprint({
    taskId: request.taskId,
    taskVersion: request.taskVersion,
    scopeId: request.scopeId,
    promptVersion: request.promptVersion,
    input: request.input,
  });
  const prepared = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nexo:${request.userId}`},0))::text`;
    const prior = await tx.nexoRun.findUnique({
      where: {
        userId_operationKey: {
          userId: request.userId,
          operationKey: request.operationKey,
        },
      },
    });
    if (prior) {
      if (prior.inputFingerprint !== fingerprint)
        throw new NexoError(
          "This request already belongs to an earlier source context. Start a new refresh.",
        );
      return { run: prior, profile: null };
    }
    const settings = await tx.nexoSettings.findUnique({
      where: { userId: request.userId },
    });
    if (!settings)
      throw new NexoError("Choose a synthesis model in Settings → Nexo first.");
    const config = nexoSettingsSchema.parse(settings.config);
    const assignment = config.assignments.find(
      (item) => item.taskId === request.taskId,
    );
    const profile = config.profiles.find(
      (item) => item.id === assignment?.profileId,
    );
    if (!profile)
      throw new NexoError(
        "Assign a model profile to synthesis in Settings → Nexo.",
      );
    if (!process.env.OPENAI_API_KEY?.trim())
      throw new NexoError(
        "Add the server’s OpenAI credential before generating.",
      );
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const count = await tx.nexoRun.count({
      where: { userId: request.userId, createdAt: { gte: since } },
    });
    if (count >= config.dailyRunLimit)
      throw new NexoError(
        "Today’s Nexo run limit has been reached. You can adjust it in settings.",
      );
    const run = await tx.nexoRun.create({
      data: {
        userId: request.userId,
        operationKey: request.operationKey,
        taskId: request.taskId,
        taskVersion: request.taskVersion,
        scopeId: request.scopeId,
        promptVersion: request.promptVersion,
        configSnapshot: nexoJson({
          settingsVersion: settings.version,
          profile,
        }),
        inputFingerprint: fingerprint,
        input: nexoJson(request.input),
      },
    });
    return { run, profile };
  });
  if (!prepared.profile) {
    if (prepared.run.status === "FAILED")
      throw new NexoError(
        prepared.run.error ?? "Generation failed. Start a new refresh.",
      );
    return prepared.run;
  }
  try {
    const schema = z.toJSONSchema(request.outputSchema, { target: "draft-7" });
    delete schema.$schema;
    const response = await executeOpenAiTask({
      profile: prepared.profile,
      instructions: request.instructions,
      input,
      schema,
      operationKey: prepared.run.id,
    });
    const output = request.validateOutput(
      request.outputSchema.parse(response.output),
    );
    await prisma.nexoRun.updateMany({
      where: { id: prepared.run.id, userId: request.userId, status: "PENDING" },
      data: {
        status: "READY",
        output: nexoJson(output),
        usage: nexoJson(response.usage),
      },
    });
    return await prisma.nexoRun.findUniqueOrThrow({
      where: { id: prepared.run.id },
    });
  } catch (error) {
    const message =
      error instanceof NexoError
        ? error.message
        : error instanceof z.ZodError
          ? "The generated proposal did not pass validation. Your accepted understanding is unchanged."
          : "Generation failed. Check your model configuration and try again.";
    await prisma.nexoRun.updateMany({
      where: { id: prepared.run.id, userId: request.userId, status: "PENDING" },
      data: { status: "FAILED", error: message },
    });
    throw new NexoError(message);
  }
}
