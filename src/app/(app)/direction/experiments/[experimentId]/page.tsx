import { notFound } from "next/navigation";
import { ExperimentDetail } from "@/features/direction/experiments/components/experiment-detail.component";
import { getExperimentView } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { experimentId } = await params;
  const experiment = await getExperimentView(user.id, experimentId);
  if (!experiment) notFound();
  return <ExperimentDetail experiment={experiment} />;
}
