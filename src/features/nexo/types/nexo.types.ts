import type { z } from "zod";
import type { NEXO_TASKS } from "@/features/nexo/constants/nexo-task.constants";
import type { NexoProfile } from "@/features/nexo/schemas/nexo-settings.schema";
export type NexoTaskId = (typeof NEXO_TASKS)[number];
export type NexoTaskRequest<T> = {
  userId: string;
  operationKey: string;
  taskId: NexoTaskId;
  taskVersion: number;
  scopeId: string;
  promptVersion: string;
  instructions: string;
  input: unknown;
  outputSchema: z.ZodType<T>;
  validateOutput: (value: T) => T;
};
export type NexoProviderRequest = {
  profile: NexoProfile;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  operationKey: string;
};
export type NexoProviderResult = {
  output: unknown;
  usage: { inputTokens: number | null; outputTokens: number | null };
  providerRequestId: string | null;
};
export class NexoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NexoError";
  }
}
