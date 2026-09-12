import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Link2,
  Pencil,
} from "lucide-react";
import { CriterionPreview } from "@/features/direction/criteria/components/criterion-preview.component";
import { DirectionLifecycleControl } from "@/features/direction/lifecycle/components/direction-lifecycle-control.component";
import { DirectionHistory } from "@/features/direction/history/components/direction-history.component";
import { ManualAssessment } from "@/features/direction/evidence/components/manual-assessment.component";
import type { ExperimentView } from "@/features/direction/types/direction.types";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function ExperimentDetail({
  experiment,
}: {
  experiment: ExperimentView;
}) {
  return (
    <article className="direction-experiment-detail">
      <header className="direction-goal-masthead">
        <div>
          <Link className="direction-back-link" href="/direction/experiments">
            <ArrowLeft aria-hidden="true" /> All experiments
          </Link>
          <p className="eyebrow">
            {experiment.status.toLowerCase()} experiment
          </p>
          <h1>{experiment.title}</h1>
          <p>{experiment.question}</p>
        </div>
        {experiment.status !== "CONCLUDED" ? (
          <Link
            className="direction-secondary-action"
            href={`/direction/experiments/${experiment.id}/edit`}
          >
            <Pencil aria-hidden="true" /> Edit experiment
          </Link>
        ) : (
          <Link
            className="direction-secondary-action"
            href={`/direction/experiments/new?repeatFrom=${encodeURIComponent(experiment.id)}`}
          >
            <FlaskConical aria-hidden="true" /> Repeat this attempt
          </Link>
        )}
      </header>

      <div className="direction-experiment-story">
        <section>
          <p className="eyebrow">The attempt</p>
          <h2>What you are doing</h2>
          <p>{experiment.approach}</p>
        </section>
        <dl>
          <div>
            <dt>
              <CalendarDays aria-hidden="true" /> Horizon
            </dt>
            <dd>
              {dateLabel(experiment.startOn)}
              {experiment.targetOn
                ? ` — ${dateLabel(experiment.targetOn)}`
                : " · open until condition"}
            </dd>
          </div>
          <div>
            <dt>
              <FlaskConical aria-hidden="true" /> Stop when
            </dt>
            <dd>
              {experiment.stoppingCondition ||
                `On ${dateLabel(experiment.targetOn!)}`}
            </dd>
          </div>
          {experiment.goal && (
            <div>
              <dt>
                <Link2 aria-hidden="true" /> Goal
              </dt>
              <dd>
                <Link href={`/direction/goals/${experiment.goal.id}`}>
                  {experiment.goal.name} <ArrowRight aria-hidden="true" />
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {experiment.status === "CONCLUDED" && (
        <section className="direction-conclusion-card">
          <p className="eyebrow">
            Conclusion ·{" "}
            {experiment.outcome?.replaceAll("_", " ").toLowerCase()}
          </p>
          <h2>{experiment.result}</h2>
          <p>{experiment.learning}</p>
          {experiment.liveChangedSinceConclusion && (
            <aside>
              Current source truth has changed since this conclusion. The dated
              snapshot remains preserved below.
            </aside>
          )}
        </section>
      )}

      <section
        className="direction-evidence-panel"
        aria-labelledby="experiment-evidence-title"
      >
        <div className="direction-section-heading">
          <div>
            <p className="eyebrow">Current evidence</p>
            <h2 id="experiment-evidence-title">
              {experiment.evaluation.progressSummary}
            </h2>
            <p>
              This live reading follows the definitions below. It never writes
              the conclusion for you.
            </p>
          </div>
        </div>
        {experiment.evaluation.criteria.length ? (
          <div className="direction-saved-criteria">
            {experiment.evaluation.criteria.map((criterion) => (
              <div key={criterion.id}>
                <CriterionPreview
                  criterion={criterion}
                  paginateSources
                  detailHref={`/direction/experiments/${experiment.id}/criteria/${criterion.id}`}
                />
                {criterion.metric === "MANUAL" && (
                  <ManualAssessment
                    criterion={criterion}
                    ownerVersion={experiment.version}
                    ownerStatus={experiment.status}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="direction-qualitative-empty">
            <span aria-hidden="true">
              <FlaskConical />
            </span>
            <div>
              <h3>No automatic success score.</h3>
              <p>
                Conclude this attempt from its result and learning when the
                stopping point arrives.
              </p>
            </div>
          </div>
        )}
      </section>

      {experiment.evaluation.contentCohort?.sources.length ? (
        <section
          className="direction-linked-sources direction-content-cohort"
          aria-labelledby="experiment-content-cohort-title"
        >
          <p className="eyebrow">Creative work cohort</p>
          <h2 id="experiment-content-cohort-title">
            Work deliberately included in this attempt
          </h2>
          <p>
            Content evidence marked “Only work selected for this experiment”
            reads this exact set. Each work remains one work even when it has
            several versions or releases.
          </p>
          <div>
            {experiment.evaluation.contentCohort.sources.map((source) => (
              <Link key={source.id} href={source.href}>
                <span>
                  {source.label}
                  {source.archived ? " · Archived" : ""}
                </span>
                <small>
                  {source.variantCount}{" "}
                  {source.variantCount === 1 ? "version" : "versions"} ·{" "}
                  {source.publicationCount}{" "}
                  {source.publicationCount === 1 ? "release" : "releases"} ·{" "}
                  {source.observationCount}{" "}
                  {source.observationCount === 1 ? "result" : "results"}
                  {source.latestObservedAt
                    ? ` · latest ${new Date(source.latestObservedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`
                    : ""}
                </small>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {experiment.sources.length > 0 && (
        <section
          className="direction-linked-sources"
          aria-labelledby="experiment-sources-title"
        >
          <p className="eyebrow">Selected outreach cohort</p>
          <h2 id="experiment-sources-title">Records chosen for this attempt</h2>
          <div>
            {experiment.sources.map((source) =>
              source.href ? (
                <Link key={source.id} href={source.href}>
                  <span>{source.label}</span>
                  <small>{source.note || "Current source"}</small>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <div key={source.id}>
                  <span>{source.label}</span>
                  <small>Historical reference</small>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <DirectionLifecycleControl kind="EXPERIMENT" view={experiment} />
      <DirectionHistory
        key={experiment.version}
        kind="EXPERIMENT"
        id={experiment.id}
        initialItems={experiment.history}
        initialCursor={experiment.historyNextCursor}
      />
    </article>
  );
}
