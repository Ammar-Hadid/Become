import { notFound } from "next/navigation";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getDomainBySlug } from "@/features/domains/domain.query";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { getRecentSessions } from "@/features/sessions/session.query";
import { getCurrentUser } from "@/lib/auth/current-user.query";
import { formatDuration } from "@/lib/dates/period.util";

export default async function DomainPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { slug } = await params;
  const domain = await getDomainBySlug(user.id, slug);
  if (!domain) notFound();
  const sessions = await getRecentSessions(user.id, 50, domain.id);
  const completedSeconds = sessions
    .filter((session) => session.endedAt)
    .reduce((total, session) => total + session.durationSeconds, 0);
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <div
            className="mb-lg gap-sm text-body flex items-center"
            style={{ color: domain.analyticsColor ?? undefined }}
          >
            <DomainIcon slug={domain.slug} />
            <span>{domain.name}</span>
          </div>
          <h1>{formatDuration(completedSeconds, true)} recorded</h1>
          <p className="page-description text-text-secondary mt-sm">
            Phase 1 activity and session evidence for this domain.
          </p>
        </div>
      </header>
      <section className="border-border mt-4xl border-y py-7">
        <p className="eyebrow mb-lg">Available activities</p>
        <div className="gap-sm flex flex-wrap">
          {domain.activityTypes.map((activity) => (
            <span className="activity-chip" key={activity.id}>
              {activity.name}
            </span>
          ))}
        </div>
      </section>
      <section className="mt-4xl">
        <p className="eyebrow mb-lg">Recent evidence</p>
        <div className="divide-border border-border divide-y border-y">
          {sessions.length ? (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <div className="empty-state">
              <p>No {domain.name.toLowerCase()} sessions yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
