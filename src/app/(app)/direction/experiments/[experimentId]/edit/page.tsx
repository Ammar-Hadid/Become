import { notFound } from "next/navigation";
import { ExperimentEditor } from "@/features/direction/experiments/components/experiment-editor.component";
import {
  getDirectionOptions,
  getExperimentView,
} from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function EditExperimentPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { experimentId } = await params;
  const [experiment, domains] = await Promise.all([
    getExperimentView(user.id, experimentId),
    getDirectionOptions(user.id, "domain"),
  ]);
  if (!experiment) notFound();
  return (
    <ExperimentEditor
      experiment={experiment}
      domainOptions={domains.items}
      defaultStartOn={experiment.startOn}
    />
  );
}
