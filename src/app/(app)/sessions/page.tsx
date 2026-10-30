import type { Metadata } from "next";
import { SessionHistory } from "@/features/sessions/history/components/session-history.component";
import { getRecentSessions } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Sessions" };
export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <SessionHistory sessions={await getRecentSessions(user.id, 100)} />;
}
