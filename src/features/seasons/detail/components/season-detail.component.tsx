import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Pencil,
  Plus,
  Target,
} from "lucide-react";
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
  WorkspaceMetric,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { CharacterBanner } from "@/components/ui/character-banner/character-banner.component";
import { GoalSummary } from "@/features/direction/goals/components/goal-summary.component";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { SeasonCadence } from "@/features/seasons/cadence/components/season-cadence.component";
import { SeasonClosingCard } from "@/features/seasons/closing/components/season-closing-card.component";

export function SeasonDetail({ season }: { season: SeasonView }) {
  const openingHref = `/direction/seasons/${season.year}/${season.quarter}/opening`;
  return (
    <div className="season-detail season-workspace workspace-stack">
      <WorkspaceHeader
        eyebrow={season.closedAt ? "Season archive" : "Direction"}
        title={season.title || season.calendar.label}
        description={
          season.closedAt
            ? "Your saved chapter, with links to the goals that continue."
            : "Your character, goals, and next steps for this Season."
        }
        actions={
          !season.closedAt && (
            <WorkspaceLink
              href={openingHref}
              variant={season.openingCompletedAt ? "secondary" : "primary"}
            >
              {season.openingCompletedAt ? (
                <Pencil aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {season.openingCompletedAt
                ? "Revisit opening"
                : "Open your season"}
            </WorkspaceLink>
          )
        }
      />
      {season.characterBanner ? (
        <CharacterBanner content={season.characterBanner} />
      ) : (
        <SeasonPoster season={season} />
      )}
      <div className="workspace-metrics">
        <WorkspaceMetric
          label="Season"
          value={`${season.quarter} / ${season.year}`}
          detail={season.calendar.timeLabel}
        />
        <WorkspaceMetric
          label="Goals"
          value={season.goals.length}
          detail="Connected to this Season"
          icon={<Target />}
        />
        <WorkspaceMetric
          label="Experiments"
          value={season.experiments.length}
          detail="Ideas you are putting into practice"
          icon={<FlaskConical />}
        />
      </div>
      {!season.openingCompletedAt && (
        <WorkspacePanel
          title="Make this Season yours"
          description="Choose a character and the world you want around you. Your opening saves as you go."
        >
          <WorkspaceLink href={openingHref} variant="secondary">
            Continue preparation <ArrowRight aria-hidden="true" />
          </WorkspaceLink>
        </WorkspacePanel>
      )}
      {season.closingCard && season.closingCard.outcomes.length > 0 && (
        <WorkspacePanel
          title="At the close of this Season"
          description={`Preserved on ${new Date(season.closingCard.capturedAt).toLocaleDateString()}.`}
        >
          <ul className="season-workspace-records">
            {season.closingCard.outcomes.map((outcome) => (
              <li key={`${outcome.kind}-${outcome.id}`}>
                <WorkspaceLink
                  href={
                    outcome.kind === "GOAL"
                      ? `/direction/goals/${outcome.id}`
                      : `/direction/experiments/${outcome.id}`
                  }
                  variant="ghost"
                >
                  {outcome.title}
                  <ArrowRight aria-hidden="true" />
                </WorkspaceLink>
                <span>
                  {outcome.stateLabel} · {outcome.progressSummary}
                </span>
              </li>
            ))}
          </ul>
        </WorkspacePanel>
      )}
      <div className="season-workspace-columns">
        <WorkspacePanel
          title="Goals"
          description="Simple goals, connected to the areas of your life."
          actions={
            <WorkspaceLink href="/direction/goals/new" variant="ghost">
              <Plus aria-hidden="true" /> New goal
            </WorkspaceLink>
          }
        >
          {season.goals.length ? (
            <div className="direction-goal-list">
              {season.goals.map(({ goal, note }) => (
                <div key={goal.id}>
                  <GoalSummary goal={goal} />
                  {note && <p className="season-goal-note">{note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="season-workspace-empty">
              <Target aria-hidden="true" />
              <p>No goals linked to this Season yet.</p>
              <WorkspaceLink href="/direction/goals" variant="secondary">
                View your goals
              </WorkspaceLink>
            </div>
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="Experiments"
          description="What you are trying and learning."
          actions={
            <WorkspaceLink href="/direction/experiments" variant="ghost">
              View all <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          }
        >
          {season.experiments.length ? (
            <ul className="season-workspace-records">
              {season.experiments.map((experiment) => (
                <li key={experiment.id}>
                  <WorkspaceLink
                    href={`/direction/experiments/${experiment.id}`}
                    variant="ghost"
                  >
                    {experiment.title}
                    <ArrowRight aria-hidden="true" />
                  </WorkspaceLink>
                  <span>{experiment.evaluation.progressSummary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="season-workspace-empty">
              <FlaskConical aria-hidden="true" />
              <p>No experiments linked yet.</p>
              <WorkspaceLink
                href="/direction/experiments/new"
                variant="secondary"
              >
                Start an experiment
              </WorkspaceLink>
            </div>
          )}
        </WorkspacePanel>
      </div>
      {season.openingCompletedAt && (
        <>
          <SeasonCadence season={season} />
          {season.character.standards.length > 0 && (
            <WorkspacePanel
              title="Standards you chose"
              description="How your character's qualities show up in daily life."
            >
              <dl className="season-standard-list">
                {season.character.standards.map((standard) => (
                  <div key={standard.key}>
                    <dt>{standard.trait}</dt>
                    <dd>{standard.behavior}</dd>
                  </div>
                ))}
              </dl>
            </WorkspacePanel>
          )}
          <WorkspaceDisclosure
            title="Opening notes"
            description="What you wanted to carry forward, leave behind, and protect."
          >
            <dl className="season-workspace-notes">
              <div>
                <dt>Carry forward</dt>
                <dd>{season.answers.carryForward || "Nothing recorded."}</dd>
              </div>
              <div>
                <dt>Leave behind</dt>
                <dd>{season.answers.leaveBehind || "Nothing recorded."}</dd>
              </div>
              <div>
                <dt>Protect</dt>
                <dd>{season.answers.protect || "Nothing recorded."}</dd>
              </div>
            </dl>
          </WorkspaceDisclosure>
          <SeasonClosingCard season={season} />
        </>
      )}
      <div className="workspace-actions">
        <WorkspaceLink href="/reviews" variant="ghost">
          <BookOpen aria-hidden="true" /> Review your progress
        </WorkspaceLink>
        <WorkspaceLink href="/direction/seasons" variant="ghost">
          Season library <ArrowRight aria-hidden="true" />
        </WorkspaceLink>
      </div>
    </div>
  );
}
