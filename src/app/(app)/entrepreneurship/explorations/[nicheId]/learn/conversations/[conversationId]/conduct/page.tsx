import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ConversationConductWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-conduct-workspace.component";

export default async function Page({
  params,
}: {
  params: Promise<{ nicheId: string; conversationId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId, conversationId } = await params;
  return (
    <ConversationConductWorkspace
      userId={user.id}
      nicheId={nicheId}
      conversationId={conversationId}
    />
  );
}
