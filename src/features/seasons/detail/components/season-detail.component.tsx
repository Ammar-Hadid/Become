import Link from "next/link";
import { ArrowRight, BookOpen, Flag, FlaskConical, Pencil } from "lucide-react";
import { GoalSummary } from "@/features/direction/goals/components/goal-summary.component";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { SeasonCadence } from "@/features/seasons/cadence/components/season-cadence.component";
import { SeasonClosingCard } from "@/features/seasons/closing/components/season-closing-card.component";
import { SeasonInspirationEditor } from "@/features/seasons/media/components/season-inspiration-editor.component";

export function SeasonDetail({ season }: { season: SeasonView }) {
  const primary = season.goals.find(({ role }) => role === "PRIMARY");
  const supporting = season.goals.filter(({ role }) => role === "SUPPORTING");
  const openingHref = `/direction/seasons/${season.year}/${season.quarter}/opening`;

  return (
    <div className="season-detail">
      {!season.openingCompletedAt && (
        <section
          className="season-opening-invitation"
          aria-labelledby="opening-title"
        >
          <div>
            <p className="eyebrow">This chapter is already underway</p>
            <h2 id="opening-title">Give this season a shape.</h2>
            <p>
              A short opening ritual for what matters, what stays protected, and
              the character you want to bring to it. You can leave at any time.
            </p>
          </div>
          <Link className="season-primary-action" href={openingHref}>
            Open your season <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      <SeasonPoster season={season} />

      {season.closingCard && season.closingCard.outcomes.length > 0 && (
        <section
          className="season-captured-outcomes"
          aria-labelledby="season-captured-outcomes-title"
        >
          <div>
            <p className="eyebrow">Preserved at closing</p>
            <h2 id="season-captured-outcomes-title">
              The reading this chapter closed with
            </h2>
            <p>
              A dated memory from{" "}
              {new Date(season.closingCard.capturedAt).toLocaleDateString()}.
              Linked goals and evidence continue independently below.
            </p>
          </div>
          <ul>
            {season.closingCard.outcomes.map((outcome) => (
              <li key={`${outcome.kind}-${outcome.id}`}>
                <Link
                  href={
                    outcome.kind === "GOAL"
                      ? `/direction/goals/${outcome.id}`
                      : `/direction/experiments/${outcome.id}`
                  }
                >
                  <span>
                    <small>
                      {outcome.kind === "EXPERIMENT"
                        ? "Experiment"
                        : outcome.role === "PRIMARY"
                          ? "Main direction"
                          : "Supporting outcome"}
                    </small>
                    <strong>{outcome.title}</strong>
                  </span>
                  <span>
                    <small>{outcome.stateLabel}</small>
                    <em>{outcome.progressSummary}</em>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!season.openingCompletedAt ? (
        <section className="season-unopened-note">
          <span aria-hidden="true" />
          <p>
            Your goals, experiments, and chosen standards will gather here as
            the chapter takes shape.
          </p>
        </section>
      ) : (
        <>
          {!season.closedAt && (
            <div className="season-revisit-row">
              <p>
                Direction can change while the chapter is alive. Revisit the
                goals, character, and standards you chose.
              </p>
              <Link href={openingHref}>
                <Pencil aria-hidden="true" /> Revisit opening
              </Link>
            </div>
          )}
          <SeasonCadence season={season} />

          <section
            className="season-direction"
            aria-labelledby="season-direction-title"
          >
            <header className="direction-section-heading">
              <div>
                <p className="eyebrow">
                  {season.closedAt
                    ? "Current linked truth"
                    : "What matters now"}
                </p>
                <h2 id="season-direction-title">
                  {season.closedAt
                    ? "Where these goals stand now"
                    : "Direction for this chapter"}
                </h2>
                {season.closedAt && (
                  <p>
                    The preserved closing reading stays above. These are the
                    goals as they are today.
                  </p>
                )}
              </div>
              <Link href="/direction/goals/new" className="direction-text-link">
                New goal <ArrowRight aria-hidden="true" />
              </Link>
            </header>

            {primary ? (
              <div className="season-primary-goal">
                <span className="season-goal-role">
                  <Flag aria-hidden="true" /> Main direction
                </span>
                <GoalSummary goal={primary.goal} />
                {primary.note && (
                  <p className="season-goal-note">{primary.note}</p>
                )}
              </div>
            ) : (
              <div className="direction-empty-row">
                <Flag aria-hidden="true" />
                <div>
                  <h3>Your main direction can stay open.</h3>
                  <p>
                    Choose one when it becomes clear. The rest of Become remains
                    available either way.
                  </p>
                </div>
                <Link href={openingHref}>Choose direction</Link>
              </div>
            )}

            <div className="season-supporting-heading">
              <div>
                <p className="eyebrow">Supporting outcomes</p>
                <p>Each keeps its own horizon and evidence.</p>
              </div>
              <span>{supporting.length}</span>
            </div>
            {supporting.length ? (
              <div className="direction-goal-list">
                {supporting.map(({ goal, note }) => (
                  <div key={goal.id}>
                    <GoalSummary goal={goal} />
                    {note && <p className="season-goal-note">{note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="season-quiet-empty">
                No supporting goals yet. This does not make the season
                incomplete.
              </p>
            )}
          </section>

          <div className="season-detail-grid">
            <section aria-labelledby="season-standards-title">
              <p className="eyebrow">Character in practice</p>
              <h2 id="season-standards-title">Standards you chose</h2>
              {season.character.standards.length ? (
                <dl className="season-standard-list">
                  {season.character.standards.map((standard) => (
                    <div key={standard.key}>
                      <dt>{standard.trait}</dt>
                      <dd>{standard.behavior}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="season-quiet-empty">
                  Add a trait when you know how you want it to show up in real
                  life.
                </p>
              )}
            </section>

            <section aria-labelledby="season-experiments-title">
              <p className="eyebrow">Experiments in motion</p>
              <h2 id="season-experiments-title">What you are testing</h2>
              {season.experiments.length ? (
                <ul className="season-experiment-list">
                  {season.experiments.slice(0, 3).map((experiment) => (
                    <li key={experiment.id}>
                      <Link href={`/direction/experiments/${experiment.id}`}>
                        <FlaskConical aria-hidden="true" />
                        <span>
                          <strong>{experiment.title}</strong>
                          <small>{experiment.evaluation.progressSummary}</small>
                        </span>
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="season-quiet-empty">
                  No active experiment is tied to this season.
                </p>
              )}
            </section>
          </div>

          <section className="season-opening-notes">
            <details>
              <summary>
                <span>
                  <BookOpen aria-hidden="true" /> Opening notes
                </span>
                <small>What you carried, left, and protected</small>
              </summary>
              <dl>
                <div>
                  <dt>Carry forward</dt>
                  <dd>
                    {season.answers.carryForward || "Nothing recorded yet."}
                  </dd>
                </div>
                <div>
                  <dt>Leave behind</dt>
                  <dd>
                    {season.answers.leaveBehind || "Nothing recorded yet."}
                  </dd>
                </div>
                <div>
                  <dt>Protect</dt>
                  <dd>{season.answers.protect || "Nothing recorded yet."}</dd>
                </div>
              </dl>
            </details>
          </section>
          {!season.closedAt && <SeasonInspirationEditor season={season} />}
          <SeasonClosingCard season={season} />
        </>
      )}
    </div>
  );
}
