import { WorkspaceLink } from "@/components/ui/workspace/workspace.component";
import Link from "next/link";
import { ArrowRight, Compass, Plus } from "lucide-react";
import { GoalSummary } from "@/features/direction/goals/components/goal-summary.component";
import { DirectionListFilters } from "@/features/direction/library/components/direction-list-filters.component";
import type {
  PageResult,
  GoalView,
} from "@/features/direction/types/direction.types";

export function GoalList({
  result,
  search,
  status,
  archived,
}: {
  result: PageResult<GoalView>;
  search: string;
  status: string;
  archived: boolean;
}) {
  return (
    <section className="direction-library" aria-labelledby="goal-list-title">
      <header className="direction-section-heading">
        <div>
          <p className="eyebrow">Across every season</p>
          <h1 id="goal-list-title">Goals</h1>
          <p>A clear outcome, connected to one or more domains.</p>
        </div>
        <WorkspaceLink
          variant="primary"
          href="/direction/goals/new"
        >
          <Plus aria-hidden="true" /> New goal
        </WorkspaceLink>
      </header>

      <DirectionListFilters
        action="/direction/goals"
        entity="goals"
        search={search}
        status={status}
        archived={archived}
      />

      {result.items.length ? (
        <div className="direction-goal-list direction-goal-list--library">
          {result.items.map((goal) => (
            <GoalSummary goal={goal} key={goal.id} />
          ))}
        </div>
      ) : (
        <div className="direction-library-empty">
          <Compass aria-hidden="true" />
          <h3>
            {search || status || archived
              ? "No goal matches those filters."
              : "What would you like to achieve?"}
          </h3>
          <p>
            {search || status || archived
              ? "Clear a filter to widen the view."
              : "Start with a simple goal and choose where it belongs."}
          </p>
          <Link
            href={
              search || status || archived
                ? "/direction/goals"
                : "/direction/goals/new"
            }
          >
            {search || status || archived
              ? "View current goals"
              : "Create your first goal"}{" "}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}

      {result.nextCursor && (
        <Link
          scroll={false}
          className="direction-next-page"
          href={`/direction/goals?${new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}), ...(archived ? { archived: "true" } : {}), cursor: result.nextCursor }).toString()}`}
        >
          More goals <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
