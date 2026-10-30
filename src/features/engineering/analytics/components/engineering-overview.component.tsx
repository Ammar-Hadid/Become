import {
  ArrowRight,
  Braces,
  CalendarDays,
  FolderKanban,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { TimeBarChart } from "@/components/ui/charts/time-bar-chart.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceMetric,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { EngineeringEvidenceList } from "@/features/engineering/evidence/components/engineering-evidence-list.component";
import type {
  EngineeringAnalyticsData,
  EngineeringEvidenceListItem,
  EngineeringProjectListItem,
} from "@/features/engineering/types/engineering.types";
import { formatDuration, TIMEFRAMES } from "@/lib/dates/utils/period.util";

export function EngineeringOverview({
  analytics,
  projects,
  recentEvidence,
}: {
  analytics: EngineeringAnalyticsData;
  projects: EngineeringProjectListItem[];
  recentEvidence: EngineeringEvidenceListItem[];
}) {
  const evidenceTotal = analytics.evidence.reduce(
    (total, item) => total + item.count,
    0,
  );
  return (
    <div className="page-shell engineering-overview">
      <WorkspaceHeader
        eyebrow="Engineering"
        title="Build. Solve. Learn."
        description="Your projects, focused time, and the work you can point to."
        actions={
          <>
            <WorkspaceLink href="/engineering/evidence/new" variant="secondary">
              <Plus /> Add evidence
            </WorkspaceLink>
            <WorkspaceLink href="/engineering/projects/new" variant="primary">
              <Plus /> New project
            </WorkspaceLink>
          </>
        }
      />
      <div className="engineering-overview-top">
        <WorkspacePanel
          className="engineering-focus-card"
          material="elevated-glass"
        >
          <p className="eyebrow">Focused time · {analytics.periodLabel}</p>
          <ViewTransition
            key={analytics.timeframe}
            name="engineering-summary-data"
            share="motion-data-recompose"
            default="none"
          >
            <div>
              <p className="engineering-focus-value timer-numerals">
                {formatDuration(analytics.totalSeconds, true)}
              </p>
              <p className="engineering-focus-comparison">
                {analytics.comparisonPercent === null
                  ? "Your first recorded time in this period"
                  : `${analytics.comparisonPercent > 0 ? "+" : ""}${analytics.comparisonPercent}% from the previous ${analytics.timeframe}`}
              </p>
            </div>
          </ViewTransition>
          <nav
            className="timeframe-switcher"
            aria-label="Engineering timeframe"
          >
            {TIMEFRAMES.map((timeframe) => (
              <WorkspaceLink
                key={timeframe}
                href={`/engineering?timeframe=${timeframe}`}
                variant={
                  analytics.timeframe === timeframe ? "secondary" : "ghost"
                }
                aria-current={
                  analytics.timeframe === timeframe ? "page" : undefined
                }
              >
                {timeframe[0].toUpperCase() + timeframe.slice(1)}
              </WorkspaceLink>
            ))}
          </nav>
        </WorkspacePanel>
        <div className="engineering-overview-metrics">
          <WorkspaceMetric
            label="Active days"
            value={analytics.activeDays}
            detail={analytics.periodLabel}
            icon={<CalendarDays />}
          />
          <WorkspaceMetric
            label="Evidence recorded"
            value={evidenceTotal}
            detail={`This ${analytics.timeframe}`}
            icon={<Braces />}
          />
          <WorkspaceMetric
            label="Open projects"
            value={projects.length}
            detail="Ready to continue"
            icon={<FolderKanban />}
          />
        </div>
      </div>
      <div className="engineering-overview-body">
        <WorkspacePanel
          title="Your rhythm"
          description={analytics.periodLabel}
          className="engineering-rhythm"
        >
          <TimeBarChart data={analytics.chart} />
        </WorkspacePanel>
        <WorkspacePanel
          title="Continue building"
          actions={
            <WorkspaceLink href="/engineering/projects" variant="ghost">
              All projects <ArrowRight />
            </WorkspaceLink>
          }
        >
          {projects.length ? (
            <div className="engineering-project-shortlist">
              {projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/engineering/projects/${project.id}`}
                >
                  <span>
                    <ViewTransition
                      name={`engineering-project-${project.id}`}
                      share="motion-carry"
                      default="none"
                    >
                      <strong>{project.name}</strong>
                    </ViewTransition>
                    <small>
                      {project.sessionCount} sessions · {project.evidenceCount}{" "}
                      evidence records
                    </small>
                  </span>
                  <ArrowRight aria-hidden />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              pattern="project-anatomy"
              area="engineering"
              size="compact"
              title="Make room for your next project"
              description="Sessions work on their own. Add a project when you want to connect the work."
              action={
                <WorkspaceLink
                  href="/engineering/projects/new"
                  variant="primary"
                >
                  Create a project
                </WorkspaceLink>
              }
            />
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="What came from the work"
          description="Recent evidence"
          className="engineering-evidence-overview"
          actions={
            <WorkspaceLink href="/engineering/evidence" variant="ghost">
              All evidence <ArrowRight />
            </WorkspaceLink>
          }
        >
          <EngineeringEvidenceList evidence={recentEvidence} compact />
        </WorkspacePanel>
        <WorkspacePanel
          title="Where your time went"
          description="Context and activity for this period"
        >
          <div className="engineering-primary-breakdowns">
            <Breakdown
              title="Context"
              items={analytics.contexts}
              total={analytics.totalSeconds}
            />
            <Breakdown
              title="Activities"
              items={analytics.activities}
              total={analytics.totalSeconds}
            />
          </div>
        </WorkspacePanel>
      </div>
      <WorkspaceDisclosure
        title="Explore the details"
        description="Project time, technology associations, and evidence types"
      >
        <div className="engineering-detail-grid">
          <WorkspacePanel title="Projects">
            <Breakdown
              items={analytics.projects}
              total={analytics.totalSeconds}
            />
          </WorkspacePanel>
          <WorkspacePanel
            title="Projects worked on by context"
            description={`Distinct projects with session activity in ${analytics.periodLabel}`}
          >
            <dl className="engineering-quiet-facts">
              {analytics.workedProjectContexts.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.projectCount}{" "}
                    {item.projectCount === 1 ? "project" : "projects"}
                  </dd>
                </div>
              ))}
            </dl>
          </WorkspacePanel>
          <WorkspacePanel
            title="Project technologies"
            description="Time on projects using each technology. Groups may overlap."
          >
            <Breakdown
              items={analytics.technologies}
              total={analytics.totalSeconds}
            />
          </WorkspacePanel>
          <WorkspacePanel title="Evidence by type">
            <dl className="engineering-quiet-facts">
              {analytics.evidence.map((item) => (
                <div key={item.type}>
                  <dt>{item.label}</dt>
                  <dd>{item.count}</dd>
                </div>
              ))}
            </dl>
          </WorkspacePanel>
        </div>
      </WorkspaceDisclosure>
    </div>
  );
}

function Breakdown({
  title,
  items,
  total,
}: {
  title?: string;
  items: Array<{ id: string; label: string; seconds: number }>;
  total: number;
}) {
  return (
    <div className="engineering-time-breakdown">
      {title && <h3>{title}</h3>}
      {items.length ? (
        items.map((item) => (
          <div key={item.id}>
            <div className="engineering-breakdown-label">
              <span>{item.label}</span>
              <span className="timer-numerals">
                {formatDuration(item.seconds, true)}
              </span>
            </div>
            <span className="metric-track">
              <span
                style={{
                  width: `${total ? Math.max((item.seconds / total) * 100, item.seconds ? 2 : 0) : 0}%`,
                }}
              />
            </span>
          </div>
        ))
      ) : (
        <p className="text-text-muted">No recorded time in this period.</p>
      )}
    </div>
  );
}
