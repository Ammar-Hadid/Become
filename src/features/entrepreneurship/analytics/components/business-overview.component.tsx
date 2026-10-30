import { Card } from "@/components/ui/cards/card.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ViewTransition } from "react";
import { DateTime } from "luxon";
import { ArrowUpRight, Compass, Quote } from "lucide-react";
import { getBusinessOverview } from "@/features/entrepreneurship/analytics/queries/business-overview.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import { AudienceMetrics } from "@/features/entrepreneurship/analytics/components/audience-metrics.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { ExplorationDirectionSummary } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import { FollowUpRecord } from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { BusinessPeriodControl } from "@/features/entrepreneurship/analytics/components/business-period-control.component";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration, type Timeframe } from "@/lib/dates/utils/period.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { formatMoney } from "@/lib/money/utils/money.util";
export async function BusinessOverview({
  userId,
  timeframe,
  date,
}: {
  userId: string;
  timeframe: Timeframe;
  date?: string;
}) {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const parsed = date ? DateTime.fromISO(date, { zone: APP_TIMEZONE }) : now;
  const reference = parsed.isValid && parsed <= now ? parsed : now;
  const [data, options] = await Promise.all([
    getBusinessOverview(userId, timeframe, reference),
    getInteractionOptions(userId),
  ]);
  const outbound = data.facts.interactions.find(
    (i) => i.kind === "OUTREACH_SENT",
  );
  const conversations = data.facts.interactions.find(
    (i) => i.kind === "CONVERSATION",
  );
  const total = data.facts.time.reduce((sum, item) => sum + item.seconds, 0);
  const external =
    data.facts.time.find((t) => t.kind === "EXTERNAL_CONTACT")?.seconds ?? 0;
  const preparation =
    data.facts.time.find((t) => t.kind === "PREPARATION")?.seconds ?? 0;
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">Direction, grounded</p>
          <h2>Your learning at a glance</h2>
          <p>
            Explorations, real conversations and the next actions you chose.
          </p>
        </div>
        <EvidenceCapture {...options} />
      </header>
      <div className="business-overview-grid business-dashboard-grid">
        <Card
          material="glass"
          spacing="dense"
          className="business-zone business-zone--primary"
        >
          <div className="business-row-heading">
            <h3>
              <Compass aria-hidden="true" />
              In exploration
            </h3>
            <Link className="business-text-link" href="/entrepreneurship">
              Open explorations ↗
            </Link>
          </div>
          {data.niches.length ? (
            data.niches.map((niche) => (
              <Link
                className="business-exploration"
                href={`/entrepreneurship/explorations/${niche.id}`}
                key={niche.id}
              >
                <span className="business-kicker">
                  {humanize(niche.direction)}
                </span>
                <h3>
                  {niche.name}
                  <ArrowUpRight aria-hidden="true" />
                </h3>
                <p>{niche.scope ?? "The scope is still taking shape."}</p>
                <span className="business-meta">
                  <ExplorationDirectionSummary
                    marketFocus={niche.marketFocus}
                    marketConclusion={niche.marketConclusion}
                  />
                </span>
              </Link>
            ))
          ) : (
            <div className="business-exploration">
              <h3>Begin with a question.</h3>
              <p>
                An exploration gives your questions a setting. Start narrow
                enough to meet the people in it.
              </p>
              <Link className="business-text-link" href="/entrepreneurship">
                Begin an exploration →
              </Link>
            </div>
          )}
        </Card>
        <Card
          material="glass"
          spacing="dense"
          className="business-next-actions"
        >
          <p className="eyebrow">The next chosen step</p>
          {data.nextActions.length ? (
            data.nextActions.map((followUp) => (
              <FollowUpRecord key={followUp.id} record={followUp} />
            ))
          ) : (
            <>
              <h3>Room to choose.</h3>
              <p>
                No scheduled next action. A follow-up only appears here when you
                choose one.
              </p>
            </>
          )}
          {data.attention.length > 0 && (
            <details className="business-disclosure mt-xl">
              <summary>{data.attention.length} items to review</summary>
              <div>
                {data.attention.slice(0, 10).map((item) => (
                  <Link
                    className="business-text-link"
                    key={item.id}
                    href={item.href}
                  >
                    {item.text}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </Card>
      </div>
      <Card
        material="glass"
        spacing="dense"
        className="business-market-voice business-zone"
      >
        <div className="business-row-heading">
          <h3>
            <Quote aria-hidden="true" />
            From the market
          </h3>
          <Link
            href="/entrepreneurship/evidence"
            className="business-text-link"
          >
            Read the journal ↗
          </Link>
        </div>
        {data.voice.length ? (
          <div className="business-voice-grid">
            {data.voice.map((observation) => (
              <article key={observation.id}>
                <p className="business-meta">
                  <AudienceSummary {...observation} /> ·{" "}
                  {humanize(observation.wordingMode)}
                </p>
                <blockquote>{observation.statement}</blockquote>
                <p className="business-meta">
                  {businessDate(observation.observedAt)}
                </p>
                <Link
                  className="business-text-link"
                  href={`/entrepreneurship/observations/${observation.id}`}
                >
                  Read source →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="business-inline-empty">
            No observations in this period. Your next conversation may give you
            something worth keeping.
          </p>
        )}
      </Card>
      <Card
        material="glass"
        spacing="dense"
        className="business-zone business-period-zone"
      >
        <div className="business-row-heading">
          <div>
            <h3>
              {data.period.label}
              {data.toDate ? " · so far" : ""}
            </h3>
            <p className="business-hint">
              {data.period.start.toFormat("d MMM yyyy")}–
              {data.period.end.minus({ days: 1 }).toFormat("d MMM yyyy")} ·
              Europe/Amsterdam
            </p>
          </div>
          <BusinessPeriodControl
            timeframe={timeframe}
            date={reference.toISODate()!}
            max={now.toISODate()!}
          />
        </div>
        <ViewTransition
          name="business-period-facts"
          default="motion-data-recompose"
        >
          <div>
            <AudienceMetrics facts={data.facts.audience} />
            <details className="business-disclosure mt-xl">
              <summary>
                Business outreach & individual proposal measures
              </summary>
              <div>
                <div className="business-facts">
                  <div>
                    <strong>{outbound?.companies ?? 0}</strong>
                    <span>Businesses sent outreach</span>
                    <small>
                      {outbound?.count ?? 0} actual outbound interactions
                    </small>
                  </div>
                  <div>
                    <strong>{conversations?.count ?? 0}</strong>
                    <span>Conversations recorded</span>
                    <small>
                      {conversations?.companies ?? 0} businesses represented
                    </small>
                  </div>
                  <div>
                    <strong>{data.facts.offersProposed}</strong>
                    <span>Individual offers proposed</span>
                    <small>Distinct offers, not revision count</small>
                  </div>
                  <div>
                    <strong>{data.facts.companiesAdded}</strong>
                    <span>Businesses added</span>
                    <small>By record creation date</small>
                  </div>
                </div>
              </div>
            </details>
            <div className="business-supporting-grid">
              <section>
                <h3>Time behind the work</h3>
                <strong className="business-time-total">
                  {formatDuration(total, true)}
                </strong>
                {data.facts.time.length ? (
                  data.facts.time.map((item) => (
                    <div className="business-time-row" key={item.kind}>
                      <span>{humanize(item.kind)}</span>
                      <strong>{formatDuration(item.seconds, true)}</strong>
                      <span className="business-time-track">
                        <span
                          style={{
                            width: `${total ? (item.seconds / total) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="business-inline-empty">
                    No session time recorded for this period.
                  </p>
                )}
                <p className="business-hint">
                  {external + preparation
                    ? `${Math.round((external / (external + preparation)) * 100)}% external-contact activity time within preparation + external contact.`
                    : "External-contact share is unknown without preparation or contact time."}{" "}
                  Delivery and unknown classifications are excluded. Session
                  categories do not prove a contact occurred.
                </p>
              </section>
              <section>
                <h3>Received, through Finance</h3>
                {data.facts.receipts.length ? (
                  data.facts.receipts.map((receipt) => (
                    <div
                      className="business-receipt-total"
                      key={`${receipt.currency}-${receipt.inflowKind}`}
                    >
                      <strong>
                        {formatMoney(receipt.amount, receipt.currency)}
                      </strong>
                      <p>
                        {humanize(receipt.inflowKind)} · {receipt.receiptCount}{" "}
                        receipts represented
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="business-inline-empty">
                    No confirmed Entrepreneurship receipt attribution in this
                    period.
                  </p>
                )}
                <p className="business-hint">
                  Confirmed attributed amounts, by cash-received date and
                  currency. One receipt may span recipients. No projected
                  income, currency conversion or added session-attribution
                  totals.
                </p>
              </section>
            </div>
            <details className="business-disclosure">
              <summary>
                Previous full {timeframe} · {data.previous.label}
              </summary>
              <div>
                <p className="business-hint">
                  {data.toDate
                    ? "Current period to date compared with the previous full calendar period."
                    : "Two full calendar periods."}{" "}
                  Manually recorded history can be incomplete.
                </p>
                <div className="business-evidence-counts">
                  <span>
                    {data.previousFacts.audience.evidenceEntries} evidence
                    entries
                  </span>
                  <span>
                    {data.previousFacts.audience.peopleContacted} identified
                    people contacted
                  </span>
                  <span>
                    {data.previousFacts.audience.responses} recipient responses
                  </span>
                  <span>
                    {data.previousFacts.interactions.find(
                      (i) => i.kind === "OUTREACH_SENT",
                    )?.companies ?? 0}{" "}
                    businesses sent outreach
                  </span>
                  <span>
                    {data.previousFacts.interactions.find(
                      (i) => i.kind === "CONVERSATION",
                    )?.count ?? 0}{" "}
                    conversations
                  </span>
                  <span>
                    {data.previousFacts.offersProposed} offers proposed
                  </span>
                  <span>
                    {formatDuration(
                      data.previousFacts.time.reduce(
                        (sum, item) => sum + item.seconds,
                        0,
                      ),
                      true,
                    )}{" "}
                    session time
                  </span>
                </div>
              </div>
            </details>
          </div>
        </ViewTransition>
      </Card>
    </>
  );
}
