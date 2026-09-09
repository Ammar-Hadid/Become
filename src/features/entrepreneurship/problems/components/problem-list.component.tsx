import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ScanSearch, ArrowUpRight } from "lucide-react";
import {
  getProblems,
  evidenceCondition,
  evidenceCompanyCounts,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { ProblemForm } from "@/features/entrepreneurship/problems/components/problem-forms.component";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
export async function ProblemList({
  userId,
  cursor,
  archived = false,
  nicheId,
}: {
  userId: string;
  cursor?: string;
  archived?: boolean;
  nicheId?: string;
}) {
  const [data, options] = await Promise.all([
    getProblems(userId, cursor, archived, nicheId),
    getInteractionOptions(userId, nicheId),
  ]);
  return (
    <>
      <header className="business-section-heading">
        <div>
          <p className="eyebrow">Beliefs meet evidence</p>
          <h2>Hold the question open.</h2>
          <p>
            Keep the claim, the market’s words and your judgment distinct.
            Contradictions belong here too.
          </p>
        </div>
        <ProblemForm niches={options.niches} />
      </header>
      <div className="business-row-heading">
        <h3>{archived ? "Archived problems" : "Current problems"}</h3>
        <Link
          className="business-text-link"
          scroll={false}
          href={
            archived
              ? "/entrepreneurship/problems"
              : "/entrepreneurship/problems?archived=true"
          }
        >
          {archived ? "View current" : "View archived"}
        </Link>
      </div>
      {data.records.length ? (
        <div className="business-problem-list">
          {data.records.map((problem) => {
            const counts = evidenceCompanyCounts(problem.evidence);
            return (
              <Link
                key={problem.id}
                href={`/entrepreneurship/problems/${problem.id}`}
                className="business-problem-row"
              >
                <div className="business-meta">
                  <span>{problem.nicheSnapshot ?? "No niche"}</span>
                  <span>·</span>
                  <span>
                    {problem.assessments[0]
                      ? humanize(problem.assessments[0].state)
                      : "Not assessed"}
                  </span>
                </div>
                <h3>
                  {problem.title}
                  <ArrowUpRight aria-hidden="true" />
                </h3>
                <p>{problem.initialStatement}</p>
                <div className="business-evidence-counts">
                  <span>{counts.supporting} supporting companies</span>
                  <span>{counts.contradicting} contradicting companies</span>
                  <span>{counts.total} companies represented</span>
                  <span>{counts.sources} current source links</span>
                  {problem.evidence.some(
                    (e) => evidenceCondition(e) !== "CURRENT",
                  ) && <span>Source review needed</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="business-empty">
          <ScanSearch aria-hidden="true" />
          <h3>A useful problem starts as a question.</h3>
          <p>
            Write a belief worth testing. Evidence can support it, challenge it,
            or leave you uncertain.
          </p>
        </div>
      )}
      {data.next && (
        <Link
          className="business-text-link"
          scroll={false}
          href={`?cursor=${data.next}${archived ? "&archived=true" : ""}`}
        >
          More problems →
        </Link>
      )}
    </>
  );
}
