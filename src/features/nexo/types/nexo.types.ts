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
  defaultProfile?: NexoProfile;
  /** Revalidate a retained rejected result with identical input before paying again. */
  recoverRejectedOutput?: boolean;
  webResearch?: boolean;
  /** Unvalidated cumulative JSON, for a separately labeled preview only. */
  onTextSnapshot?: (text: string) => Promise<void>;
};
export type NexoProviderRequest = {
  profile: NexoProfile;
  apiKey: string;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  operationKey: string;
  webResearch?: boolean;
  /** Unvalidated cumulative JSON, for a separately labeled preview only. */
  onTextSnapshot?: (text: string) => Promise<void>;
};
export type NexoProviderResult = {
  output: unknown;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
  };
  providerRequestId: string | null;
  sources?: { url: string; title: string }[];
  searchCalls?: number;
};
export class NexoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NexoError";
  }
}
