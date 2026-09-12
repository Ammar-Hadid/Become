import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentWorkspace } from "@/features/content/queries/content.query";
import { ContentWorkspace } from "@/features/content/workspace/components/content-workspace.component";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Content workspace" };

export default async function ContentWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { contentId } = await params;
  const search = await searchParams;
  const variantId =
    typeof search.variant === "string" ? search.variant : undefined;
  const workspace = await getContentWorkspace(user.id, contentId, {
    variantId,
  });
  if (!workspace) notFound();
  if (
    variantId &&
    !workspace.variants.some((variant) => variant.id === variantId)
  )
    notFound();
  return (
    <ContentWorkspace
      key={`${workspace.id}:${variantId ?? "default"}`}
      initialData={workspace}
      initialVariantId={variantId}
    />
  );
}
