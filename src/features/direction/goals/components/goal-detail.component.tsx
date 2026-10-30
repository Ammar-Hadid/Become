import { ArrowLeft, CalendarDays, Pencil, Target } from "lucide-react";
import type { GoalView } from "@/features/direction/types/direction.types";
import {
  WorkspaceHeader,
  WorkspaceLink,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { CriterionPreview } from "@/features/direction/criteria/components/criterion-preview.component";
import { DirectionHistory } from "@/features/direction/history/components/direction-history.component";
import { DirectionLifecycleControl } from "@/features/direction/lifecycle/components/direction-lifecycle-control.component";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function GoalDetail({ goal }: { goal: GoalView }) {
  return (
    <article className="direction-goal-detail simple-goal-detail workspace-stack">
      <WorkspaceLink href="/direction/goals" variant="ghost">
        <ArrowLeft aria-hidden="true" /> All goals
      </WorkspaceLink>
      <WorkspaceHeader
        eyebrow={
          goal.archivedAt
            ? "Archived goal"
            : `${goal.status.toLowerCase()} goal`
        }
        title={goal.title}
        description={goal.description}
        actions={
          <WorkspaceLink href={`/direction/goals/${goal.id}/edit`}>
            <Pencil aria-hidden="true" /> Edit goal
          </WorkspaceLink>
        }
      />
      <div className="workspace-grid">
        <WorkspacePanel
          title={
            <>
              <Target aria-hidden="true" /> Domains
            </>
          }
          spacing="dense"
        >
          {goal.domains.length ? (
            <div className="simple-goal-domains">
              {goal.domains.map((domain) => (
                <span key={domain.id}>{domain.name}</span>
              ))}
            </div>
          ) : (
            <p className="type-body-sm">No domains assigned yet.</p>
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title={
            <>
              <CalendarDays aria-hidden="true" /> Timeframe
            </>
          }
          spacing="dense"
        >
          <p>
            {formatDate(goal.startOn)}
            {goal.targetOn
              ? ` — ${formatDate(goal.targetOn)}`
              : " · No target date"}
          </p>
        </WorkspacePanel>
      </div>
      {goal.status === "CONCLUDED" && (
        <WorkspacePanel
          title={
            goal.outcome?.replaceAll("_", " ").toLowerCase() ?? "Conclusion"
          }
        >
          <p>{goal.conclusion}</p>
          {goal.liveChangedSinceConclusion && (
            <p className="type-body-sm">
              Linked evidence has changed since this saved conclusion. The
              original record is preserved.
            </p>
          )}
        </WorkspacePanel>
      )}
      <WorkspacePanel
        title="Manage this goal"
        description="Keep going, pause, or record how it turned out."
      >
        <DirectionLifecycleControl kind="GOAL" view={goal} compact />
      </WorkspacePanel>
      {goal.seasons.length > 0 && (
        <WorkspaceDisclosure
          title="Linked Seasons"
          description={`${goal.seasons.length} recorded Season ${goal.seasons.length === 1 ? "link" : "links"}`}
        >
          <div className="simple-goal-season-links">
            {goal.seasons.map((season) => (
              <WorkspaceLink
                key={`${season.year}-${season.quarter}`}
                href={season.href}
                variant="ghost"
              >
                Season {season.quarter}, {season.year}
              </WorkspaceLink>
            ))}
          </div>
        </WorkspaceDisclosure>
      )}
      {goal.criteria.length > 0 && (
        <WorkspaceDisclosure
          title="Earlier evidence definitions"
          description="Saved records from the previous goal system. New goals use the simple flow."
        >
          <div className="workspace-stack">
            {goal.evaluation.criteria.map((criterion) => (
              <CriterionPreview
                key={criterion.id}
                criterion={criterion}
                paginateSources
                detailHref={`/direction/goals/${goal.id}/criteria/${criterion.id}`}
              />
            ))}
          </div>
        </WorkspaceDisclosure>
      )}
      <WorkspaceDisclosure
        title="History"
        description="Changes and conclusions stay attached to this goal."
      >
        <DirectionHistory
          key={goal.version}
          kind="GOAL"
          id={goal.id}
          initialItems={goal.history}
          initialCursor={goal.historyNextCursor}
        />
      </WorkspaceDisclosure>
    </article>
  );
}
