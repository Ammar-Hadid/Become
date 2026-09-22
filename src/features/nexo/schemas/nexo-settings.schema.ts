import { z } from "zod";
import { NEXO_TASKS } from "@/features/nexo/constants/nexo-task.constants";

export const nexoProfileSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
  name: z.string().trim().min(1).max(80),
  provider: z.literal("openai"),
  model: z.string().trim().min(1).max(120),
  reasoning: z.enum([
    "default",
    "none",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
  ]),
  verbosity: z.enum(["default", "low", "medium", "high"]),
  maxOutputTokens: z.number().int().min(1000).max(32000),
  timeoutSeconds: z.number().int().min(15).max(180),
});
export const nexoSettingsSchema = z
  .object({
    schemaVersion: z.literal(1),
    profiles: z.array(nexoProfileSchema).max(20),
    assignments: z
      .array(
        z.object({ taskId: z.enum(NEXO_TASKS), profileId: z.string().max(60) }),
      )
      .max(4),
    dailyRunLimit: z.number().int().min(1).max(100),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.profiles.map((profile) => profile.id));
    if (ids.size !== value.profiles.length)
      ctx.addIssue({
        code: "custom",
        message: "Each profile needs a unique ID.",
      });
    const tasks = new Set(
      value.assignments.map((assignment) => assignment.taskId),
    );
    if (tasks.size !== value.assignments.length)
      ctx.addIssue({ code: "custom", message: "Assign each task only once." });
    if (value.assignments.some((assignment) => !ids.has(assignment.profileId)))
      ctx.addIssue({
        code: "custom",
        message: "Choose an existing profile for every task.",
      });
  });
export type NexoSettingsConfig = z.infer<typeof nexoSettingsSchema>;
export type NexoProfile = z.infer<typeof nexoProfileSchema>;
export const EMPTY_NEXO_SETTINGS: NexoSettingsConfig = {
  schemaVersion: 1,
  profiles: [],
  assignments: [],
  dailyRunLimit: 20,
};
