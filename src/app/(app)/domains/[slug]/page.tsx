import {
  Workspace,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceMetric,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import "@/features/sessions/history/styles/session-history.css";
import { notFound, redirect } from "next/navigation";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getDomainBySlug } from "@/features/domains/queries/domain.query";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { getRecentSessions } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { formatDuration } from "@/lib/dates/utils/period.util";

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { slug } = await params;
  // The retired YouTube URL is a bookmark alias only; it never renders a domain.
  if (["finance", "entrepreneurship", "youtube", "content"].includes(slug)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value))
        value.forEach((item) => query.append(key, item));
    }
    redirect(
      `/${slug === "youtube" ? "content" : slug}${query.size ? `?${query}` : ""}`,
    );
  }
  if (slug === "engineering") {
    const session = (await searchParams).session;
    redirect(
      typeof session === "string"
        ? `/engineering?session=${encodeURIComponent(session)}`
        : "/engineering",
    );
  }
  const domain = await getDomainBySlug(user.id, slug);
  if (!domain) notFound();
  const sessions = await getRecentSessions(user.id, 50, domain.id);
  const completedSeconds = sessions
    .filter((session) => session.endedAt)
    .reduce((total, session) => total + session.durationSeconds, 0);
  return (
    <Workspace
      area="direction"
      className="page-shell session-history-workspace"
    >
      <WorkspaceHeader
        eyebrow="Your domain"
        title={domain.name}
        description="Your time, activities, and the work you have recorded."
        actions={
          <WorkspaceLink href="/sessions" variant="secondary">
            All session history
          </WorkspaceLink>
        }
      />
      <div className="session-history-metrics">
        <WorkspaceMetric
          label="Focused time"
          value={formatDuration(completedSeconds, true)}
          detail="Completed sessions among the latest 50"
          icon={<DomainIcon slug={domain.slug} />}
        />
        <WorkspaceMetric
          label="Sessions"
          value={sessions.length}
          detail="Latest recorded sessions"
        />
        <WorkspaceMetric
          label="Activities"
          value={domain.activityTypes.length}
          detail="Ways to spend time here"
        />
      </div>
      <div className="domain-workspace-grid">
        <WorkspacePanel
          title="Recent sessions"
          description="Open a completed session for its outcome and full record."
        >
          {sessions.length ? (
            sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <EmptyState
              pattern="first-focus"
              size="compact"
              title={`No ${domain.name.toLowerCase()} sessions yet`}
              description="Choose this domain when starting a timer. Your completed work will appear here."
            />
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="Your activities"
          description="Choose an activity when you start a session."
        >
          <div className="domain-activity-list">
            {domain.activityTypes.map((activity) => (
              <span className="activity-chip" key={activity.id}>
                {activity.name}
              </span>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </Workspace>
  );
}
