import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentWorkspace } from "@/features/content/queries/content.query";
import { ContentWorkspace } from "@/features/content/workspace/components/content-workspace.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Content workspace" };

export default async function ContentWorkspacePage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { contentId } = await params;
  const workspace = await getContentWorkspace(user.id, contentId);
  if (!workspace) notFound();
  return <ContentWorkspace key={workspace.id} initialData={workspace} />;
}
