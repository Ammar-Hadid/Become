import { WorkspaceLink } from "@/components/ui/workspace/workspace.component";
import Link from "next/link";
import { ArrowRight, FlaskConical, Plus } from "lucide-react";
import { DirectionListFilters } from "@/features/direction/library/components/direction-list-filters.component";
import type {
  PageResult,
  ExperimentView,
} from "@/features/direction/types/direction.types";

export function ExperimentList({
  result,
  search,
  status,
  archived,
}: {
  result: PageResult<ExperimentView>;
  search: string;
  status: string;
  archived: boolean;
}) {
  const stateLabel = (experiment: ExperimentView) => {
    if (experiment.archivedAt) return "Archived";
    if (experiment.status === "PAUSED") return "Paused";
    if (experiment.status === "CONCLUDED")
      return (
        experiment.outcome?.replaceAll("_", " ").toLowerCase() ?? "Concluded"
      );
    return "Active attempt";
  };
  return (
    <section
      className="direction-library"
      aria-labelledby="experiment-list-title"
    >
      <header className="direction-section-heading">
        <div>
          <p className="eyebrow">Questions in motion</p>
          <h1 id="experiment-list-title">Experiments</h1>
          <p>Test an idea, record what happens, and decide what to try next.</p>
        </div>
        <WorkspaceLink
          variant="primary"
          href="/direction/experiments/new"
        >
          <Plus aria-hidden="true" /> New experiment
        </WorkspaceLink>
      </header>
      <DirectionListFilters
        action="/direction/experiments"
        entity="experiments"
        search={search}
        status={status}
        archived={archived}
      />
      {result.items.length ? (
        <div className="direction-experiment-library">
          {result.items.map((experiment) => (
            <Link
              key={experiment.id}
              href={`/direction/experiments/${experiment.id}`}
            >
              <FlaskConical aria-hidden="true" />
              <span>
                <strong>{experiment.title}</strong>
                <small>{experiment.question}</small>
                <em>
                  <b>{stateLabel(experiment)}</b> ·{" "}
                  {experiment.evaluation.progressSummary}
                </em>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="direction-library-empty">
          <FlaskConical aria-hidden="true" />
          <h3>
            {search || status || archived
              ? "No experiment matches those filters."
              : "No experiment is running."}
          </h3>
          <p>
            {search || status || archived
              ? "Clear a filter to widen the view."
              : "Turn one uncertain idea into a bounded attempt when you are ready."}
          </p>
          <Link
            href={
              search || status || archived
                ? "/direction/experiments"
                : "/direction/experiments/new"
            }
          >
            {search || status || archived
              ? "View current experiments"
              : "Create an experiment"}{" "}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}
      {result.nextCursor && (
        <Link
          scroll={false}
          className="direction-next-page"
          href={`/direction/experiments?${new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}), ...(archived ? { archived: "true" } : {}), cursor: result.nextCursor }).toString()}`}
        >
          More experiments <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
