import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  getExploration,
  getExplorationSummary,
  getExplorationSignals,
} from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { FollowUpRecord } from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { formatDuration } from "@/lib/dates/utils/period.util";
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
        {!niche?.archivedAt && <InteractionForm {...options} />}
      </header>
      <section className="business-zone business-summary-zone">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Exploration pulse</p>
            <h3>The work you have kept</h3>
          </div>
          <p className="business-hint">
            {summary.contacted} companies contacted · {summary.conversations}{" "}
            conversations recorded
          </p>
        </div>
        <div className="business-facts exploration-facts">
          {(
            [
              ["Companies", summary.companies, "/market"],
              ["Interactions", summary.interactions, "/interactions"],
              ["Problems", summary.problems, "/problems"],
              ["Offers", summary.offers, "/offers"],
            ] as const
          ).map(([label, count, path]) => (
            <Link href={`/entrepreneurship${path}`} key={label}>
              <strong>{count}</strong>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="business-overview-grid">
        <section className="business-zone business-zone--primary">
          <div className="business-row-heading">
            <h3>From the market</h3>
            <Link
              href="/entrepreneurship/interactions"
              className="business-text-link"
            >
              Open journal ↗
            </Link>
          </div>
          {signals.voice.length ? (
            signals.voice.map((v) => (
              <article className="business-detail-section" key={v.id}>
                <p className="business-meta">
                  {v.companySnapshot ?? "Company not recorded"} ·{" "}
                  {humanize(v.wordingMode)}
                </p>
                <p className="business-prose mt-lg">{v.statement}</p>
                <Link
                  className="business-text-link"
                  href={`/entrepreneurship/observations/${v.id}`}
                >
                  Read source →
                </Link>
              </article>
            ))
          ) : (
            <p className="business-inline-empty">
              No observations here yet. Your next conversation may give you
              something worth keeping.
            </p>
          )}
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
                Keep a question in mind. Pick a company. Start a conversation.
              </p>
            </>
          )}
        </aside>
      </div>
      <section className="business-zone">
        <div className="business-row-heading">
          <div>
            <h3>Time behind the exploration</h3>
            <p className="business-hint">
              Sessions recorded with this niche context.
            </p>
          </div>
          <strong className="business-time-total">
            {formatDuration(summary.seconds, true)}
          </strong>
        </div>
        {signals.sessions.length ? (
          signals.sessions.map((s) => (
            <article key={s.id} className="business-record-row">
              <Link
                href={`/sessions?session=${s.id}`}
                className="business-text-link"
              >
                {s.description || "Focused session"} ↗
              </Link>
              <span className="business-meta">
                {businessDate(s.startedAt)}
                {!s.endedAt ? " · running" : ""}
              </span>
            </article>
          ))
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
