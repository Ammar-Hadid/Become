"use server";

import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getConversationDebriefMessages } from "../queries/conversation.query";

export async function getConversationDebriefMessagesAction(
  conversationId: string,
  cursor?: string,
): Promise<
  Awaited<ReturnType<typeof getConversationDebriefMessages>> & {
    error?: string;
  }
> {
  const user = await getCurrentUser();
  if (!user)
    return {
      items: [],
      next: null,
      total: 0,
      error: "Sign in to load messages.",
    };
  try {
    return await getConversationDebriefMessages(
      user.id,
      conversationId,
      cursor,
    );
  } catch {
    return {
      items: [],
      next: null,
      total: 0,
      error: "Could not load messages. Try again.",
    };
  }
}
