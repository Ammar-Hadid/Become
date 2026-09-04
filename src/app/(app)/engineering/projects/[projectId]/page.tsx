import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineeringProjectDetailView } from "@/features/engineering/projects/components/engineering-project-detail.component";
import { getEngineeringProjectById } from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Engineering project" };

export default async function EngineeringProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { projectId } = await params;
  const project = await getEngineeringProjectById(user.id, projectId);
  if (!project) notFound();
  return <EngineeringProjectDetailView project={project} />;
}
