import { ArrowRight, Braces, CalendarDays, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { TimeBarChart } from "@/components/ui/charts/time-bar-chart.component";
import { EngineeringEvidenceList } from "@/features/engineering/evidence/components/engineering-evidence-list.component";
import type {
  EngineeringAnalyticsData,
  EngineeringEvidenceListItem,
  EngineeringProjectListItem,
} from "@/features/engineering/types/engineering.types";
import { cn } from "@/lib/styles/utils/class-name.util";
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
    <div className="page-shell">
      <header className="page-header flex flex-col md:flex-row">
        <div>
          <div className="text-primary mb-lg gap-sm text-body flex items-center">
            <Braces className="size-4" /> Engineering
          </div>
          <h1>Build. Solve. Learn.</h1>
          <p className="page-description text-text-secondary mt-sm max-w-copy">
            A factual view of the settings, projects, and concrete evidence
            behind your Engineering time.
          </p>
        </div>
        <div className="engineering-header-actions">
          <Link
            href="/engineering/evidence/new"
            className="engineering-secondary-link"
          >
            <Plus className="size-4" /> Evidence
          </Link>
          <Link
            href="/engineering/projects/new"
            className="engineering-primary-link"
          >
            <Plus className="size-4" /> Project
          </Link>
        </div>
      </header>

      <section className="engineering-summary">
        <div>
          <p className="eyebrow mb-sm">Engineering time</p>
          <p className="timer-numerals engineering-summary-value">
            {formatDuration(analytics.totalSeconds, true)}
          </p>
          <p className="text-text-secondary mt-md text-body">
            {analytics.comparisonPercent === null
              ? "First recorded time in this period"
              : `${analytics.comparisonPercent > 0 ? "+" : ""}${analytics.comparisonPercent}% from the previous ${analytics.timeframe}`}
          </p>
        </div>
        <div className="timeframe-switcher" aria-label="Engineering timeframe">
          {TIMEFRAMES.map((timeframe) => (
            <Link
              key={timeframe}
              href={`/engineering?timeframe=${timeframe}`}
              className={cn(analytics.timeframe === timeframe && "active")}
            >
              {timeframe[0].toUpperCase() + timeframe.slice(1)}
            </Link>
          ))}
        </div>
      </section>

      <section className="engineering-signal-grid">
        <div>
          <Clock3 />
          <strong>{formatDuration(analytics.totalSeconds, true)}</strong>
          <span>{analytics.periodLabel}</span>
        </div>
        <div>
          <CalendarDays />
          <strong>{analytics.activeDays}</strong>
          <span>Active {analytics.activeDays === 1 ? "day" : "days"}</span>
        </div>
        <div>
          <Braces />
          <strong>{evidenceTotal}</strong>
          <span>Evidence {evidenceTotal === 1 ? "record" : "records"}</span>
        </div>
      </section>

      <section className="engineering-analytics-grid">
        <div className="engineering-analytics-main">
          <div className="engineering-section-heading">
            <div>
              <p className="eyebrow mb-sm">Rhythm</p>
              <h2 className="section-title">Engineering over time</h2>
            </div>
          </div>
          <TimeBarChart data={analytics.chart} />
        </div>
        <Breakdown
          title="Context"
          description="The setting in which the work happened"
          items={analytics.contexts}
          total={analytics.totalSeconds}
        />
        <Breakdown
          title="Projects"
          description="Optional bodies of work"
          items={analytics.projects}
          total={analytics.totalSeconds}
        />
        <ProjectContextBreakdown
          items={analytics.workedProjectContexts}
          periodLabel={analytics.periodLabel}
        />
        <Breakdown
          title="Activities"
          description="What you were actually doing"
          items={analytics.activities}
          total={analytics.totalSeconds}
        />
        {analytics.technologies.length > 0 && (
          <Breakdown
            title="Project technologies"
            description="Time on projects using each technology · buckets may overlap"
            items={analytics.technologies.slice(0, 8)}
            total={analytics.totalSeconds}
          />
        )}
      </section>

      <section className="engineering-output-section">
        <div className="engineering-section-heading">
          <div>
            <p className="eyebrow mb-sm">Outputs and learning</p>
            <h2 className="section-title">
              Evidence this {analytics.timeframe}
            </h2>
          </div>
          <Link href="/engineering/evidence" className="text-link">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="engineering-evidence-counts">
          {analytics.evidence.map((item) => (
            <div key={item.type}>
              <strong>{item.count}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <EngineeringEvidenceList evidence={recentEvidence} compact />
      </section>

      <section className="engineering-output-section">
        <div className="engineering-section-heading">
          <div>
            <p className="eyebrow mb-sm">Current work</p>
            <h2 className="section-title">Open projects</h2>
          </div>
          <Link href="/engineering/projects" className="text-link">
            View projects <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="engineering-project-preview">
          {projects.length ? (
            projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/engineering/projects/${project.id}`}
              >
                <strong>{project.name}</strong>
                <span>
                  {project.sessionCount} sessions · {project.evidenceCount}{" "}
                  evidence
                </span>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <p>
                No active projects. Sessions can still be recorded without one.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectContextBreakdown({
  items,
  periodLabel,
}: {
  items: EngineeringAnalyticsData["workedProjectContexts"];
  periodLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.projectCount, 0);

  return (
    <div className="engineering-breakdown">
      <h2 className="section-title">Projects worked on by context</h2>
      <p className="section-description">
        Distinct projects with Engineering session activity in {periodLabel}
      </p>
      <div className="mt-xl space-y-lg">
        {items.map((item) => (
          <div key={item.id}>
            <div className="gap-lg text-body flex items-center justify-between">
              <span>{item.label}</span>
              <span className="timer-numerals text-text-secondary">
                {item.projectCount}{" "}
                {item.projectCount === 1 ? "project" : "projects"}
              </span>
            </div>
            <span className="metric-track">
              <span
                style={{
                  width: `${total ? Math.max((item.projectCount / total) * 100, item.projectCount ? 2 : 0) : 0}%`,
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  description,
  items,
  total,
}: {
  title: string;
  description: string;
  items: Array<{ id: string; label: string; seconds: number }>;
  total: number;
}) {
  return (
    <div className="engineering-breakdown">
      <h2 className="section-title">{title}</h2>
      <p className="section-description">{description}</p>
      <div className="mt-xl space-y-lg">
        {items.length ? (
          items.map((item) => (
            <div key={item.id}>
              <div className="gap-lg text-body flex items-center justify-between">
                <span>{item.label}</span>
                <span className="timer-numerals text-text-secondary">
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
          <p className="text-text-muted text-body">No recorded time.</p>
        )}
      </div>
    </div>
  );
}
