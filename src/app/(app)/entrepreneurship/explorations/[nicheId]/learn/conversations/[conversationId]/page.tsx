import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ConversationWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-workspace.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; conversationId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, conversationId } = await params;
  return (
    <ConversationWorkspace
      userId={user.id}
      nicheId={nicheId}
      conversationId={conversationId}
    />
  );
}
