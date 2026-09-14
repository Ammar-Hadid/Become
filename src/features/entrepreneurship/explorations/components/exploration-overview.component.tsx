import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  getExploration,
  getExplorationSummary,
  getExplorationSignals,
} from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import { EvidenceJournal } from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import { FollowUpRecord } from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { SessionRow } from "@/features/sessions/components/session-row.component";
import { ExplorationDirectionSummary } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import { AudienceMetrics } from "@/features/entrepreneurship/analytics/components/audience-metrics.component";
import { formatMoney } from "@/lib/money/utils/money.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
export async function ExplorationOverview({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const [niche, summary, signals, options] = await Promise.all([
    getExploration(userId, nicheId),
    getExplorationSummary(userId, nicheId),
    getExplorationSignals(userId, nicheId),
    getInteractionOptions(userId, nicheId),
  ]);
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">The exploration so far</p>
          <h2>What are you learning?</h2>
          <p>All recorded activity in this exploration.</p>
        </div>
        {!niche?.archivedAt && <EvidenceCapture {...options} />}
      </header>
      <div className="business-overview-grid">
        <section className="business-zone business-zone--primary">
          <div className="business-row-heading">
            <h3>Recent evidence</h3>
            <Link
              href="/entrepreneurship/evidence"
              className="business-text-link"
            >
              Open journal ↗
            </Link>
          </div>
          <EvidenceJournal
            data={{ entries: signals.recentEvidence, next: null }}
          />
        </section>
        <aside className="business-next-actions">
          <p className="eyebrow">The next chosen step</p>
          {signals.nextActions.length ? (
            signals.nextActions.map((f) => (
              <FollowUpRecord key={f.id} record={f} />
            ))
          ) : (
            <>
              <h3>Room to choose.</h3>
              <p>
                Talk to someone, follow a question, or look at how this works in
                practice. Keep the details that help you understand it.
              </p>
            </>
          )}
        </aside>
      </div>
      <section className="business-zone">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Taking shape</p>
            <h3>Audiences, problems & offers</h3>
          </div>
        </div>
        {signals.audienceSegments.length > 0 && (
          <div className="gap-sm mb-xl flex flex-wrap">
            {signals.audienceSegments.map((segment) => (
              <Link
                key={segment.id}
                className="rounded-control border-border px-lg py-md text-body hover:bg-surface-elevated border"
                href={`/entrepreneurship/segments/${segment.id}`}
              >
                <span className="font-medium">{segment.name}</span>
                <span className="ml-sm text-body-sm text-text-secondary">
                  {marketTypeLabel(segment.marketType)}
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="business-evidence-counts">
          <Link href="/entrepreneurship/audience">
            {summary.segments} attached segments
          </Link>
          <Link href="/entrepreneurship/problems">
            {summary.problems} scoped problems
          </Link>
          <Link href="/entrepreneurship/offers">{summary.offers} offers</Link>
        </div>
        {(signals.investigateProblems.length > 0 ||
          signals.testedOffers.length > 0) && (
          <div className="gap-lg mt-xl grid sm:grid-cols-2">
            {signals.investigateProblems.length > 0 && (
              <div>
                <h4 className="text-body mb-md font-medium">
                  Problems you are investigating
                </h4>
                {signals.investigateProblems.map((problem) => (
                  <article
                    key={problem.id}
                    className="border-border py-md border-t"
                  >
                    <Link
                      className="text-body hover:text-primary font-medium"
                      href={`/entrepreneurship/problems/${problem.id}`}
                    >
                      {problem.title} →
                    </Link>
                    <p className="text-body-sm text-text-secondary mt-sm">
                      {humanize(problem.status)} ·{" "}
                      <AudienceSummary
                        audienceContext={problem.audienceContext}
                      />
                    </p>
                  </article>
                ))}
              </div>
            )}
            {signals.testedOffers.length > 0 && (
              <div>
                <h4 className="text-body mb-md font-medium">
                  Offers you are trying
                </h4>
                {signals.testedOffers.map((offer) => (
                  <article
                    key={offer.id}
                    className="border-border py-md border-t"
                  >
                    <Link
                      className="text-body hover:text-primary font-medium"
                      href={`/entrepreneurship/offers/${offer.id}`}
                    >
                      {offer.title} →
                    </Link>
                    <p className="text-body-sm text-text-secondary mt-sm">
                      {offer.mode === "AUDIENCE_TEST"
                        ? "Audience test"
                        : "Individual proposal"}{" "}
                      ·{" "}
                      <AudienceSummary
                        audienceContext={offer.audienceContext}
                      />
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
        {!summary.problems && !summary.offers && (
          <p className="business-hint mt-lg">
            When a need starts repeating, keep it as a scoped problem. Try an
            offer when you have a useful promise to test.
          </p>
        )}
      </section>
      <section className="business-zone business-summary-zone">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Exploration pulse</p>
            <h3>The work you have kept</h3>
          </div>
          <p className="business-hint">
            Recorded activity; each source keeps its context.
          </p>
        </div>
        <AudienceMetrics facts={summary} />
      </section>
      {summary.receipts.length > 0 && (
        <section className="business-zone">
          <div className="business-row-heading">
            <h3>Actual receipts</h3>
          </div>
          {summary.receipts.map((receipt) => (
            <p key={receipt.currency} className="text-body-lg font-medium">
              {formatMoney(receipt.amount, receipt.currency)}
              <span className="ml-sm text-body text-text-secondary">
                · {receipt.receiptCount} Finance receipts represented
              </span>
            </p>
          ))}
          <p className="business-hint mt-lg">
            Confirmed attributed income by cash-received date and currency.
            Accepted offers and linked work sources do not create payments.
          </p>
        </section>
      )}
      <section className="business-zone">
        <div className="business-row-heading">
          <div>
            <h3>Time behind the exploration</h3>
            <p className="business-hint">
              Sessions recorded with this exploration context.
            </p>
          </div>
          <strong className="business-time-total">
            {formatDuration(summary.seconds, true)}
          </strong>
        </div>
        {signals.sessions.length ? (
          signals.sessions.map((s) => <SessionRow key={s.id} session={s} />)
        ) : (
          <p className="business-inline-empty">
            No session time recorded here yet.
          </p>
        )}
      </section>
      <section className="business-zone">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Decision trail</p>
            <h3>Direction & decisions</h3>
          </div>
        </div>
        <div className="business-record-list">
          {niche?.decisions.map((d) => (
            <article className="business-record-row" key={d.id}>
              <p className="business-meta">
                {businessDate(d.createdAt)} · {humanize(d.direction)}
              </p>
              <p className="business-prose">{d.rationale}</p>
              {(d.marketFocus || d.marketConclusion) && (
                <p className="business-hint mt-lg">
                  <ExplorationDirectionSummary
                    marketFocus={d.marketFocus}
                    marketConclusion={d.marketConclusion}
                  />
                </p>
              )}
              {d.conclusionScope && (
                <p className="business-hint mt-sm">
                  Conclusion scope: {d.conclusionScope}
                </p>
              )}
              {d.scopeSnapshot && (
                <p className="business-hint">
                  Scope at the time: {d.scopeSnapshot}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
