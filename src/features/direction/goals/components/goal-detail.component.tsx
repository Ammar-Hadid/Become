import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Pencil,
} from "lucide-react";
import type { GoalView } from "@/features/direction/types/direction.types";
import { CriterionPreview } from "@/features/direction/criteria/components/criterion-preview.component";
import { DirectionHistory } from "@/features/direction/history/components/direction-history.component";
import { DirectionLifecycleControl } from "@/features/direction/lifecycle/components/direction-lifecycle-control.component";
import { ManualAssessment } from "@/features/direction/evidence/components/manual-assessment.component";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function GoalDetail({ goal }: { goal: GoalView }) {
  const qualitative = goal.criteria.length === 0;

  return (
    <article className="direction-goal-detail">
      <header className="direction-goal-masthead">
        <div>
          <Link className="direction-back-link" href="/direction/goals">
            <ArrowLeft aria-hidden="true" /> All goals
          </Link>
          <p className="eyebrow">{goal.status.toLowerCase()} direction</p>
          <h1>{goal.title}</h1>
          {goal.description && <p>{goal.description}</p>}
        </div>
        <Link
          className="direction-secondary-action"
          href={`/direction/goals/${goal.id}/edit`}
        >
          <Pencil aria-hidden="true" /> Edit goal
        </Link>
      </header>

      <dl className="direction-goal-facts">
        <div>
          <dt>
            <CalendarDays aria-hidden="true" /> Horizon
          </dt>
          <dd>
            {formatDate(goal.startOn)}
            {goal.targetOn ? ` — ${formatDate(goal.targetOn)}` : " onward"}
          </dd>
        </div>
        <div>
          <dt>
            <CircleDashed aria-hidden="true" /> Current reading
          </dt>
          <dd>{goal.progressSummary}</dd>
        </div>
      </dl>

      <section
        className="direction-evidence-panel"
        aria-labelledby="goal-evidence-title"
      >
        <div className="direction-section-heading">
          <div>
            <p className="eyebrow">Definition of done</p>
            <h2 id="goal-evidence-title">
              {qualitative ? "A human judgment" : "Evidence and conditions"}
            </h2>
          </div>
          {!qualitative && (
            <span className="direction-evaluated-at">
              Evaluated {new Date(goal.evaluation.evaluatedAt).toLocaleString()}
            </span>
          )}
        </div>
        {qualitative ? (
          <div className="direction-qualitative-empty">
            <span aria-hidden="true">
              <CheckCircle2 />
            </span>
            <div>
              <h3>No synthetic progress.</h3>
              <p>
                This goal has no evidence criteria yet. It stays open until you
                add a definition or make a dated conclusion.
              </p>
            </div>
          </div>
        ) : (
          <div className="direction-saved-criteria">
            {goal.evaluation.criteria.map((criterion) => (
              <div key={criterion.id}>
                <CriterionPreview
                  criterion={criterion}
                  paginateSources
                  detailHref={`/direction/goals/${goal.id}/criteria/${criterion.id}`}
                />
                {criterion.metric === "MANUAL" && (
                  <ManualAssessment
                    criterion={criterion}
                    ownerVersion={goal.version}
                    ownerStatus={goal.status}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {goal.status === "CONCLUDED" && (
        <section className="direction-conclusion-card">
          <p className="eyebrow">
            Conclusion · {goal.outcome?.replaceAll("_", " ").toLowerCase()}
          </p>
          <h2>{goal.conclusion}</h2>
          {goal.liveChangedSinceConclusion && (
            <aside>
              Current source truth has changed since this dated conclusion. The
              conclusion snapshot remains preserved.
            </aside>
          )}
        </section>
      )}

      {goal.seasons.length > 0 && (
        <section
          className="direction-goal-seasons"
          aria-labelledby="goal-seasons-title"
        >
          <p className="eyebrow">Part of a wider season</p>
          <h2 id="goal-seasons-title">Seasons carrying this goal</h2>
          <div>
            {goal.seasons.map((season) => (
              <Link key={`${season.year}-${season.quarter}`} href={season.href}>
                <span>
                  Season {season.quarter}, {season.year}
                </span>
                <small>
                  {season.role === "PRIMARY"
                    ? "Main direction"
                    : "Supporting outcome"}
                </small>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <DirectionLifecycleControl kind="GOAL" view={goal} />
      <DirectionHistory
        key={goal.version}
        kind="GOAL"
        id={goal.id}
        initialItems={goal.history}
        initialCursor={goal.historyNextCursor}
      />
    </article>
  );
}
