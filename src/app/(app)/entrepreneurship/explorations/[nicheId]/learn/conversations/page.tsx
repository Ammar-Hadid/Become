import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { ConversationWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-workspace.component";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ nicheId: string }>;
  searchParams: Promise<{ linkedInteractionId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [{ nicheId }, query] = await Promise.all([params, searchParams]);
  return (
    <ConversationWorkspace
      userId={user.id}
      nicheId={nicheId}
      initialLinkedInteractionId={query.linkedInteractionId}
    />
  );
}
