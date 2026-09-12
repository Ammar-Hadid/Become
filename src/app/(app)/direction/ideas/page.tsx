import type { Metadata } from "next";
import {
  getIdeas,
  getThinkingOptions,
} from "@/features/direction/thinking/queries/thinking.query";
import { IdeaList } from "@/features/direction/thinking/ideas/components/idea-list.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Ideas" };

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    domainId?: string;
    archived?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const [ideas, options] = await Promise.all([
    getIdeas(user.id, {
      q: params.q,
      cursor: params.cursor,
      domainId: params.domainId,
      archived: params.archived === "true",
    }),
    getThinkingOptions(user.id),
  ]);
  return (
    <IdeaList
      initialData={ideas}
      domains={options.domains}
      query={params.q}
      domainId={params.domainId}
      cursor={params.cursor}
      archived={params.archived === "true"}
    />
  );
}
