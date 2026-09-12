import type { Metadata } from "next";
import { DateTime } from "luxon";
import { notFound } from "next/navigation";
import { DecisionDetail } from "@/features/direction/thinking/decisions/components/decision-detail.component";
import {
  getDecision,
  getThinkingOptions,
} from "@/features/direction/thinking/queries/thinking.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export const metadata: Metadata = { title: "Decision" };

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { decisionId } = await params;
  const [decision, options] = await Promise.all([
    getDecision(user.id, decisionId),
    getThinkingOptions(user.id),
  ]);
  if (!decision) notFound();
  return (
    <DecisionDetail
      decision={decision}
      options={options}
      defaultDecidedOn={DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? ""}
    />
  );
}
