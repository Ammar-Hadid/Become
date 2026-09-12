import type { Metadata } from "next";
import { DateTime } from "luxon";
import { DecisionStandaloneEditor } from "@/features/direction/thinking/decisions/components/decision-editor.component";
import { getThinkingOptions } from "@/features/direction/thinking/queries/thinking.query";
import type { DecisionContext } from "@/features/direction/thinking/types/thinking.types";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export const metadata: Metadata = { title: "New decision" };

export default async function NewDecisionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const contextKeys = [
    "contentId",
    "projectId",
    "goalId",
    "experimentId",
    "nicheId",
    "seasonId",
  ] as const;
  const requested: DecisionContext = {};
  for (const key of contextKeys) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 100) {
      requested[key] = value;
    }
  }
  const options = await getThinkingOptions(user.id, requested);
  const context: DecisionContext = {
    contentId: options.content.some((item) => item.id === requested.contentId)
      ? requested.contentId
      : undefined,
    projectId: options.projects.some((item) => item.id === requested.projectId)
      ? requested.projectId
      : undefined,
    goalId: options.goals.some((item) => item.id === requested.goalId)
      ? requested.goalId
      : undefined,
    experimentId: options.experiments.some(
      (item) => item.id === requested.experimentId,
    )
      ? requested.experimentId
      : undefined,
    nicheId: options.niches.some((item) => item.id === requested.nicheId)
      ? requested.nicheId
      : undefined,
    seasonId: options.seasons.some((item) => item.id === requested.seasonId)
      ? requested.seasonId
      : undefined,
  };
  const returnHref = context.contentId
    ? `/content/${context.contentId}`
    : "/direction/decisions";
  return (
    <DecisionStandaloneEditor
      options={options}
      defaultDecidedOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
      initialContext={context}
      returnHref={returnHref}
    />
  );
}
