import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getContentScript } from "@/features/content/scripts/queries/content-script.query";
import { ContentScriptWorkspace } from "@/features/content/scripts/components/content-script-workspace.component";

export const metadata: Metadata = { title: "Script · Become" };

export default async function ContentScriptPage({
  params,
}: {
  params: Promise<{ contentId: string; variantId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { contentId, variantId } = await params;
  const script = await getContentScript(user.id, contentId, variantId);
  if (!script) notFound();
  return <ContentScriptWorkspace key={variantId} initialData={script} />;
}
