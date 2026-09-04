import type { Metadata } from "next";
import { History } from "lucide-react";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { getRecentSessions } from "@/features/sessions/session.query";
import { getCurrentUser } from "@/lib/auth/current-user.query";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const sessions = await getRecentSessions(user.id, 100);
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Evidence log</p>
          <h1>Session history</h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            A record of where your attention went, with outcomes preserved
            alongside the time.
          </p>
        </div>
        <span className="header-icon">
          <History />
        </span>
      </header>
      <div className="divide-border border-border mt-4xl divide-y border-y">
        {sessions.length ? (
          sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))
        ) : (
          <div className="empty-state">
            <p>No sessions recorded yet.</p>
            <span>Start a timer from anywhere in Become.</span>
          </div>
        )}
      </div>
    </div>
  );
}
