import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ACTIVE_NEXO_TASKS } from "@/features/nexo/constants/nexo-task.constants";
import { nexoSettingsSchema } from "@/features/nexo/schemas/nexo-settings.schema";
import { executeNexoProvider } from "@/features/nexo/adapters/nexo-provider.adapter";
import { getAiCredential } from "@/features/nexo/services/ai-credential.service";
import {
  ONBOARDING_TEXT_TASKS,
  resolveNexoTaskProfile,
} from "./nexo-task-configuration.service";
import { nexoProviderError } from "../utils/nexo-provider-error.util";
import {
  NexoError,
  type NexoProviderResult,
  type NexoTaskRequest,
} from "@/features/nexo/types/nexo.types";
import {
  nexoFingerprint,
  nexoJson,
} from "@/features/nexo/utils/nexo-json.util";

export async function executeAiTask<T>(request: NexoTaskRequest<T>) {
  if (
    !ACTIVE_NEXO_TASKS.some(
      (task) =>
        task.id === request.taskId && task.version === request.taskVersion,
    )
  )
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
    const config = settings
      ? nexoSettingsSchema.parse(settings.config)
      : {
          schemaVersion: 1 as const,
          profiles: [],
          assignments: [],
          dailyRunLimit: 20,
        };
    const profile = resolveNexoTaskProfile(
      config,
      request.taskId,
      request.defaultProfile,
    );
    if (request.webResearch && profile.provider !== "openai")
      throw new NexoError(
        "Character research currently needs an OpenAI model with web search. Choose one for Character research in Settings → Nexo.",
      );
    // Retain the original failure as diagnostic history. Recovery creates a
    // distinct, unapproved result only after every current validator passes.
    if (request.recoverRejectedOutput) {
      const rejected = await tx.nexoRun.findFirst({
        where: {
          userId: request.userId,
          taskId: request.taskId,
          scopeId: request.scopeId,
          inputFingerprint: fingerprint,
          status: "FAILED",
          error:
            "The character or production brief ends mid-sentence. Retry with concise complete prose before approval; saved work is preserved.",
        },
        orderBy: { createdAt: "desc" },
      });
      if (rejected?.output) {
        let recovered: T | undefined;
        try {
          recovered = request.validateOutput(
            request.outputSchema.parse(rejected.output),
          );
        } catch {
          /* Still invalid: normal explicit generation continues below. */
        }
        if (recovered !== undefined) {
          const run = await tx.nexoRun.create({
            data: {
              userId: request.userId,
              operationKey: request.operationKey,
              taskId: request.taskId,
              taskVersion: request.taskVersion,
              scopeId: request.scopeId,
              promptVersion: request.promptVersion,
              inputFingerprint: fingerprint,
              input: nexoJson(request.input),
              configSnapshot: nexoJson(rejected.configSnapshot),
              status: "READY",
              output: nexoJson(recovered),
              usage: nexoJson({
                recoveredFromRunId: rejected.id,
                latencyMs: 0,
                inputTokens: 0,
                outputTokens: 0,
                reasoningTokens: 0,
                searchCalls: 0,
                estimatedCostUsd: 0,
              }),
            },
          });
          return { run, profile: null };
        }
      }
    }
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
          settingsVersion: settings?.version ?? null,
          profile,
          webResearch: Boolean(request.webResearch),
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
  const startedAt = Date.now();
  let providerResult: NexoProviderResult | null = null;
  try {
    const apiKey = await getAiCredential(
      request.userId,
      prepared.profile.provider,
      {
        accountOnly: ONBOARDING_TEXT_TASKS.some(
          (task) => task === request.taskId,
        ),
      },
    );
    if (!apiKey)
      throw new NexoError(
        `Add a ${prepared.profile.provider} API key in Settings → Nexo first.`,
      );
    const schema = z.toJSONSchema(request.outputSchema, { target: "draft-7" });
    delete schema.$schema;
    providerResult = await executeNexoProvider({
      profile: prepared.profile,
      apiKey,
      instructions: request.instructions,
      input,
      schema,
      operationKey: prepared.run.id,
      webResearch: request.webResearch,
      onTextSnapshot: request.onTextSnapshot,
    });
    const output = request.validateOutput(
      request.outputSchema.parse(providerResult.output),
    );
    const inputRate = prepared.profile.inputUsdPerMillion;
    const outputRate = prepared.profile.outputUsdPerMillion;
    const estimatedCostUsd =
      inputRate != null &&
      outputRate != null &&
      providerResult.usage.inputTokens != null &&
      providerResult.usage.outputTokens != null
        ? Number(
            (
              (providerResult.usage.inputTokens * inputRate +
                providerResult.usage.outputTokens * outputRate) /
                1_000_000 +
              (providerResult.searchCalls ?? 0) * 0.01
            ).toFixed(6),
          )
        : null;
    await prisma.nexoRun.updateMany({
      where: { id: prepared.run.id, userId: request.userId, status: "PENDING" },
      data: {
        status: "READY",
        output: nexoJson(output),
        usage: nexoJson({
          ...providerResult.usage,
          sources: providerResult.sources ?? [],
          searchCalls: providerResult.searchCalls ?? 0,
          estimatedCostUsd,
          latencyMs: Date.now() - startedAt,
          providerRequestId: providerResult.providerRequestId,
        }),
      },
    });
    return await prisma.nexoRun.findUniqueOrThrow({
      where: { id: prepared.run.id },
    });
  } catch (error) {
    const validationIssues =
      error instanceof z.ZodError
        ? error.issues.slice(0, 5).map((issue) => ({
            path:
              issue.path
                .map(String)
                .join(".")
                .replace(/[^a-zA-Z0-9_.-]/g, "?")
                .slice(0, 120) || "response",
            code: issue.code,
          }))
        : [];
    const message =
      error instanceof NexoError
        ? error.message
        : error instanceof z.ZodError
          ? `The AI response failed validation: ${validationIssues.map((issue) => `${issue.path} (${issue.code})`).join(", ")}. Retry generation; your approved work is unchanged.`
          : nexoProviderError(
              error,
              prepared.profile.provider,
              prepared.profile.model,
            );
    await prisma.nexoRun.updateMany({
      where: { id: prepared.run.id, userId: request.userId, status: "PENDING" },
      data: {
        status: "FAILED",
        error: message,
        // A rejected paid result remains private diagnostic evidence, never READY content.
        ...(providerResult?.output != null
          ? { output: nexoJson(providerResult.output) }
          : {}),
        usage: nexoJson({
          validationIssues,
          sources: providerResult?.sources ?? [],
          searchCalls: providerResult?.searchCalls ?? 0,
          inputTokens: providerResult?.usage.inputTokens ?? null,
          outputTokens: providerResult?.usage.outputTokens ?? null,
          reasoningTokens: providerResult?.usage.reasoningTokens ?? null,
          latencyMs: Date.now() - startedAt,
          providerRequestId: providerResult?.providerRequestId ?? null,
        }),
      },
    });
    throw new NexoError(message);
  }
}
