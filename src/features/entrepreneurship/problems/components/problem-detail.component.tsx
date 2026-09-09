import { evidenceWords } from "@/features/entrepreneurship/problems/utils/evidence-source.util";
import { ArchiveBusinessRecord } from "@/features/entrepreneurship/shared/components/archive-business-record.component";
import { formatMoney } from "@/lib/money/utils/money.util";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { withdrawEvidenceAction } from "@/features/entrepreneurship/problems/actions/problem.action";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  getProblemDetail,
  getObservationChoices,
  evidenceCondition,
  evidenceCompanyCounts,
} from "@/features/entrepreneurship/problems/queries/problem.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import {
  LinkEvidenceForm,
  ReceiptEvidenceForm,
  ObservationForm,
  AssessmentForm,
  ReconfirmEvidenceForm,
} from "@/features/entrepreneurship/problems/components/problem-forms.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
export async function ProblemDetail({
  userId,
  id,
  nicheId,
}: {
  userId: string;
  id: string;
  nicheId?: string;
}) {
  const [problem, observations, options, interactions] = await Promise.all([
    getProblemDetail(userId, id),
    getObservationChoices(userId),
    getInteractionOptions(userId, nicheId),
    prisma.interaction.findMany({
      where: { userId: userId, voidedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    }),
  ]);
  if (!problem) notFound();
  const receipts = await prisma.businessReceiptAllocation.findMany({
    where: {
      userId: userId,
      withdrawnAt: null,
      needsReviewAt: null,
      transactionId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const active = problem.evidence.filter((e) => !e.withdrawnAt);
  const review = active.filter((e) => evidenceCondition(e) === "REVIEW");
  const groups = Map.groupBy(
    active,
    (e) =>
      e.observationRevision?.companyId ??
      e.receiptAllocation?.companyId ??
      "unattributed",
  );
  const counts = evidenceCompanyCounts(problem.evidence);
  const latest = problem.assessments[0];
  return (
    <>
      {nicheId && (
        <p className="business-hint mb-xl">
          This problem can span markets. Its source histories and evidence below
          retain their original contexts.
        </p>
      )}
      <Link className="business-back" href="/entrepreneurship/problems">
        ← Problems
      </Link>
      <header className="business-section-heading">
        <div>
          <p className="eyebrow">
            {humanize(problem.origin)} · {problem.nicheSnapshot ?? "No niche"}
          </p>
          <h2>{problem.title}</h2>
          <p>{latest ? humanize(latest.state) : "Not assessed"}</p>
        </div>
        <div className="business-actions">
          <AssessmentForm
            problemId={id}
            evidence={active.map((e) => ({
              id: e.id,
              name: evidenceWords(e),
              company:
                e.observationRevision?.companySnapshot ??
                e.receiptAllocation?.companySnapshot ??
                "No company",
              source:
                e.observationRevision?.sourceDescription ??
                "Actual Finance receipt",
              href: e.observationRevision
                ? `/entrepreneurship/observations/${e.observationId}?revision=${e.observationRevisionId}`
                : e.receiptAllocation?.transactionId
                  ? `/finance/transactions/${e.receiptAllocation.transactionId}`
                  : undefined,
              stance: e.stance,
              review: evidenceCondition(e) !== "CURRENT",
            }))}
          />
          <ArchiveBusinessRecord
            kind="problem"
            id={id}
            archived={Boolean(problem.archivedAt)}
          />
        </div>
      </header>
      <section className="business-original-claim">
        <p className="eyebrow">
          Original belief · {businessDate(problem.formulatedAt)}
        </p>
        <p>{problem.initialStatement}</p>
        <span className="business-hint">This is the claim being examined.</span>
      </section>
      <section className="business-detail-section">
        <div className="business-row-heading">
          <div>
            <h3>Evidence, with its source</h3>
            <p className="business-hint">
              {counts.sources} source links · {counts.total} companies
              represented · {counts.supporting} supporting companies ·{" "}
              {counts.contradicting} contradicting companies. Several
              observations from one company are still one company.
            </p>
          </div>
          <div className="business-actions">
            <LinkEvidenceForm problemId={id} observations={observations} />
            {receipts.length > 0 && (
              <ReceiptEvidenceForm
                problemId={id}
                receipts={receipts.map((receipt) => ({
                  id: receipt.id,
                  name: `${receipt.companySnapshot} · ${formatMoney(receipt.amountMinor, receipt.currencySnapshot)}`,
                }))}
              />
            )}
            <ObservationForm
              problemId={id}
              companies={options.companies}
              interactions={interactions.map((i) => ({
                id: i.id,
                revisionId: i.revisions[0].id,
                name: `${i.revisions[0].companySnapshot ?? "No company"} · ${i.revisions[0].summary.slice(0, 80)}`,
              }))}
            />
          </div>
        </div>
        {review.length > 0 && (
          <div className="business-review-notice">
            <p>
              {review.length} source interpretations need review after a factual
              correction.
            </p>
            <ReconfirmEvidenceForm
              problemId={id}
              evidence={review.map((e) => ({
                id: e.id,
                name: evidenceWords(e),
                current: [
                  e.observation?.revisions.toSorted(
                    (a, b) => b.version - a.version,
                  )[0]?.statement,
                  e.observation?.revisions.toSorted(
                    (a, b) => b.version - a.version,
                  )[0]?.sourceDescription,
                  e.observationRevision?.interactionRevision?.interaction.revisions.toSorted(
                    (a, b) => b.version - a.version,
                  )[0]?.summary,
                  e.receiptAllocation
                    ? "Review the current Finance receipt and attribution before confirming."
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              }))}
            />
          </div>
        )}
        {active.length ? (
          [...groups].map(([companyId, entries]) => (
            <section key={companyId} className="business-company-evidence">
              <h4>
                {entries[0].observationRevision?.companySnapshot ??
                  entries[0].receiptAllocation?.companySnapshot ??
                  "Company not recorded"}
              </h4>
              {entries.map((evidence) => {
                const source = evidence.observationRevision;
                return (
                  <article
                    key={evidence.id}
                    className="business-evidence-entry"
                    data-stance={evidence.stance}
                  >
                    <div className="business-meta">
                      <strong>{humanize(evidence.stance)}</strong>
                      <span>
                        {source ? humanize(source.wordingMode) : "Receipt"}
                      </span>
                      {evidenceCondition(evidence) !== "CURRENT" && (
                        <span>{humanize(evidenceCondition(evidence))}</span>
                      )}
                    </div>
                    <blockquote className="business-prose">
                      {evidenceWords(evidence)}
                    </blockquote>
                    {evidence.receiptAllocation?.transactionId && (
                      <Link
                        className="business-text-link"
                        href={`/finance/transactions/${evidence.receiptAllocation.transactionId}`}
                      >
                        Open Finance source ↗
                      </Link>
                    )}
                    <p className="business-hint">
                      Source: {source?.sourceDescription}
                    </p>
                    {source?.interactionId && (
                      <Link
                        className="business-text-link"
                        href={`/entrepreneurship/interactions/${source.interactionId}`}
                      >
                        Read source interaction ↗
                      </Link>
                    )}
                    {source?.sourceUrl && (
                      <a
                        className="business-text-link"
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read public source ↗
                      </a>
                    )}
                    <div className="business-actions mt-lg">
                      {source && (
                        <Link
                          className="business-text-link"
                          href={`/entrepreneurship/observations/${source.observationId}`}
                        >
                          Source versions & corrections ↗
                        </Link>
                      )}
                      <CorrectionMenu
                        label="Evidence actions"
                        title="Withdraw interpretation"
                        description="Keep the historical basis, but stop using this interpretation as current evidence."
                        action={withdrawEvidenceAction.bind(
                          null,
                          id,
                          evidence.id,
                        )}
                      />
                    </div>
                    <div className="business-interpretation">
                      <p className="eyebrow">Your interpretation</p>
                      <p className="business-prose">{evidence.explanation}</p>
                    </div>
                  </article>
                );
              })}
            </section>
          ))
        ) : (
          <div className="business-empty">
            <h3>No evidence linked yet.</h3>
            <p>
              The claim remains open. Keep the first source, including anything
              that challenges it.
            </p>
          </div>
        )}
      </section>
      <section className="business-detail-section">
        <h3>Judgments over time</h3>
        {problem.assessments.length ? (
          problem.assessments.map((assessment) => {
            const changed = assessment.basis.some(
              (b) =>
                evidenceCondition(b.evidence, assessment.createdAt) !==
                "CURRENT",
            );
            return (
              <article className="business-assessment" key={assessment.id}>
                <div className="business-meta">
                  <strong>{humanize(assessment.state)}</strong>
                  <span>{businessDate(assessment.assessedAt)}</span>
                  <span>{assessment.basis.length} sources used</span>
                </div>
                <h4>For this scope</h4>
                <p className="business-prose">{assessment.scope}</p>
                <h4>Reasoning</h4>
                <p className="business-prose">{assessment.rationale}</p>
                {changed && (
                  <p className="business-review-notice">
                    Part of this judgment’s basis has changed. This remains the
                    judgment you recorded at the time.
                  </p>
                )}
                <details className="business-disclosure mt-xl">
                  <summary>Sources used at the time</summary>
                  <div>
                    {assessment.basis.map(({ evidence }) => (
                      <article key={evidence.id}>
                        <p className="business-meta">
                          {humanize(evidence.stance)}
                        </p>
                        <p className="business-prose">
                          {evidenceWords(evidence)}
                        </p>
                        <p className="business-hint">{evidence.explanation}</p>
                      </article>
                    ))}
                  </div>
                </details>
              </article>
            );
          })
        ) : (
          <p className="business-inline-empty">
            No judgment recorded. Evidence and uncertainty can sit together for
            a while.
          </p>
        )}
      </section>
    </>
  );
}
