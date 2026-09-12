import type { Metadata } from "next";
import { DateTime } from "luxon";
import { notFound } from "next/navigation";
import { IdeaDetail } from "@/features/direction/thinking/ideas/components/idea-detail.component";
import {
  getIdea,
  getThinkingOptions,
} from "@/features/direction/thinking/queries/thinking.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export const metadata: Metadata = { title: "Idea" };

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { ideaId } = await params;
  const [idea, options] = await Promise.all([
    getIdea(user.id, ideaId),
    getThinkingOptions(user.id),
  ]);
  if (!idea) notFound();
  return (
    <IdeaDetail
      idea={idea}
      options={options}
      defaultStartOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
    />
  );
}
