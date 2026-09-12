import type { Metadata } from "next";
import { DateTime } from "luxon";
import { DecisionList } from "@/features/direction/thinking/decisions/components/decision-list.component";
import {
  getDecisions,
  getThinkingOptions,
} from "@/features/direction/thinking/queries/thinking.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export const metadata: Metadata = { title: "Decisions" };

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const [decisions, options] = await Promise.all([
    getDecisions(user.id, {
      q: params.q,
      cursor: params.cursor,
      archived: params.archived === "true",
    }),
    getThinkingOptions(user.id),
  ]);
  return (
    <DecisionList
      initialData={decisions}
      options={options}
      defaultDecidedOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
      query={params.q}
      cursor={params.cursor}
      archived={params.archived === "true"}
    />
  );
}
