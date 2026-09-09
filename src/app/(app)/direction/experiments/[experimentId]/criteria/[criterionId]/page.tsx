import { notFound } from "next/navigation";
import { CriterionDetail } from "@/features/direction/evidence/components/criterion-detail.component";
import { getExperimentView } from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function ExperimentCriterionPage({
  params,
}: {
  params: Promise<{ experimentId: string; criterionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { experimentId, criterionId } = await params;
  const experiment = await getExperimentView(user.id, experimentId);
  const criterion = experiment?.evaluation.criteria.find(
    ({ id }) => id === criterionId,
  );
  if (!experiment || !criterion) notFound();
  return (
    <CriterionDetail
      criterion={criterion}
      ownerTitle={experiment.title}
      ownerHref={`/direction/experiments/${experiment.id}`}
      ownerVersion={experiment.version}
      ownerStatus={experiment.status}
    />
  );
}
