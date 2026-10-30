import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: {} }));
vi.mock("@/features/nexo/services/nexo-runtime.service", () => ({ executeAiTask: vi.fn() }));
vi.mock("@/features/nexo/services/nexo-season-context.service", () => ({ getNexoSeasonContext: vi.fn() }));

import { conversationInputSchema } from "./cots-conversation.service";

describe("C.O.T.S follow-up conversation input", () => {
  it("accepts a complete valid generated reply when asking the next question", () => {
    const input = {
      question: "What should I do next?",
      history: [
        { role: "user", content: "Explain my progress." },
        { role: "assistant", content: "a".repeat(1800) },
      ],
    };
    expect(conversationInputSchema.parse(input)).toEqual(input);
  });

  it("keeps user questions and assistant turns within their own limits", () => {
    expect(conversationInputSchema.safeParse({ question: "a".repeat(1001) }).success).toBe(false);
    expect(conversationInputSchema.safeParse({
      question: "Continue.", history: [{ role: "user", content: "a".repeat(1001) }],
    }).success).toBe(false);
    expect(conversationInputSchema.safeParse({
      question: "Continue.", history: [{ role: "assistant", content: "a".repeat(1801) }],
    }).success).toBe(false);
  });
});
