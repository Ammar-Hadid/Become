import { DateTime } from "luxon";
import { ExperimentEditor } from "@/features/direction/experiments/components/experiment-editor.component";
import {
  getDirectionOptions,
  getExperimentView,
} from "@/features/direction/queries/direction.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ repeatFrom?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { repeatFrom: repeatFromId } = await searchParams;
  const [domains, prior] = await Promise.all([
    getDirectionOptions(user.id, "domain"),
    repeatFromId ? getExperimentView(user.id, repeatFromId) : null,
  ]);
  const repeatFrom =
    prior?.status === "CONCLUDED" && !prior.archivedAt ? prior : undefined;
  return (
    <ExperimentEditor
      repeatFrom={repeatFrom}
      domainOptions={domains.items}
      defaultStartOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
    />
  );
}
