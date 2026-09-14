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
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
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
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">Beliefs meet evidence</p>
          <h2>Hold the question open.</h2>
          <p>
            Keep the claim, the market’s words and your judgment distinct.
            Contradictions belong here too.
          </p>
        </div>
        <ProblemForm niches={options.niches} segments={options.segments} />
      </header>
      <section
        className={`business-zone business-zone--ledger${archived ? "business-zone--archived" : ""}`}
      >
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Claims under examination</p>
            <h3>{archived ? "Archived problems" : "Current problems"}</h3>
          </div>
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
                  className={`business-problem-row${archived ? "business-record--archived" : ""}`}
                >
                  <div className="business-record-heading">
                    <div>
                      <p className="business-meta">
                        <AudienceSummary {...problem} />
                      </p>
                      <h3>{problem.title}</h3>
                    </div>
                    <div className="business-record-status">
                      <span className="business-status-badge">
                        {problem.assessments[0]
                          ? humanize(problem.assessments[0].state)
                          : "Not assessed"}
                      </span>
                      <ArrowUpRight aria-hidden="true" />
                    </div>
                  </div>
                  <p>{problem.initialStatement}</p>
                  <dl className="business-record-facts">
                    <div>
                      <dd>{counts.supportingSources}</dd>
                      <dt>Supporting source links</dt>
                    </div>
                    <div>
                      <dd>{counts.contradictingSources}</dd>
                      <dt>Contradicting source links</dt>
                    </div>
                    <div>
                      <dd>{counts.people}</dd>
                      <dt>Identified people represented</dt>
                    </div>
                    <div>
                      <dd>{counts.sources}</dd>
                      <dt>Current source links</dt>
                    </div>
                  </dl>
                  <p className="business-hint">
                    {counts.businesses} businesses represented ·{" "}
                    {counts.anonymous} source links without identified people or
                    businesses · {counts.aggregate} aggregate sources. Several
                    links can come from one source.
                  </p>
                  {problem.evidence.some(
                    (e) => evidenceCondition(e) !== "CURRENT",
                  ) && (
                    <span className="business-review-flag">
                      Source review needed
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="business-empty">
            <ScanSearch aria-hidden="true" />
            <h3>A useful problem starts as a question.</h3>
            <p>
              Write a belief worth testing. Evidence can support it, challenge
              it, or leave you uncertain.
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
      </section>
    </>
  );
}
