import { z } from "zod";
import { audienceInputSchema } from "@/features/entrepreneurship/audiences/schemas/audience.schema";
import {
  channels,
  observationInputSchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { CONVERSATION_SPEAKER_ROLES } from "@/features/entrepreneurship/conversations/constants/conversation.constants";

const optionalId = z
  .string()
  .trim()
  .max(100)
  .nullish()
  .transform((value) => value || null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const timestamp = z.preprocess(
  (value) => (value instanceof Date ? value : new Date(String(value))),
  z
    .date()
    .refine(
      (value) => value.getTime() <= Date.now() + 60_000,
      "Use a time that has already happened.",
    ),
);

export const startConversationSchema = z.object({
  ...audienceInputSchema.shape,
  nicheId: z.string().trim().min(1).max(100),
  linkedInteractionId: optionalId,
  guideRevisionId: optionalId,
  channel: z.enum(channels).default("OTHER"),
  occurredAt: timestamp.default(() => new Date()),
  summary: optionalText(3_000),
  notes: optionalText(6_000),
});

export const conversationMessageSchema = z.object({
  speakerRole: z.enum(CONVERSATION_SPEAKER_ROLES),
  speakerName: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(12_000),
  occurredAt: timestamp.default(() => new Date()),
  channel: z.enum(channels).default("OTHER"),
  guideQuestionId: optionalId,
});

export const correctConversationMessageSchema =
  conversationMessageSchema.extend({
    expectedVersion: z.number().int().positive(),
    correctionReason: z.string().trim().min(1).max(2_000),
  });

export const voidConversationMessageSchema = z.object({
  reason: z.string().trim().min(1).max(2_000),
});

export const bookmarkConversationMessageSchema = z.object({
  bookmarked: z.boolean(),
});

export const conversationConductStateSchema = z.object({
  currentQuestionId: optionalId,
  skippedQuestionIds: z.array(z.string().trim().min(1).max(100)).max(200),
});

export const askConversationGuideQuestionSchema = z.object({
  questionId: z.string().trim().min(1).max(100),
});

export const switchConversationGuideSchema = z.object({
  guideRevisionId: optionalId,
});

export const promoteMessageObservationSchema = observationInputSchema.extend({
  expectedMessageVersion: z.number().int().positive(),
});

export const finishConversationSchema = z.object({
  outcome: z.string().trim().min(1).max(3_000),
  nextAction: optionalText(3_000),
  takeaways: z.array(z.string().trim().min(1).max(2_000)).max(30).default([]),
  summary: optionalText(6_000),
  observationMessages: z
    .array(
      z.object({
        messageId: z.string().trim().min(1).max(100),
        expectedVersion: z.number().int().positive(),
      }),
    )
    .max(30)
    .default([])
    .refine(
      (messages) =>
        new Set(messages.map((message) => message.messageId)).size ===
        messages.length,
      "Choose each message only once.",
    ),
});

export const cancelConversationSchema = z.object({
  reason: optionalText(2_000),
});
