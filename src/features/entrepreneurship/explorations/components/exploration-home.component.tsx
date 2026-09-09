import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { getExplorations } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import {
  currentExplorations,
  explorationHref,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { StartExplorationForm } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
export async function ExplorationHome({ userId }: { userId: string }) {
  const { current, alsoActive, past } = currentExplorations(
    await getExplorations(userId),
  );
  return (
    <>
      <div className="business-row-heading">
        <p className="eyebrow">Your explorations</p>
        <Link className="business-text-link" href="/entrepreneurship/history">
          Global history ↗
        </Link>
      </div>
      <section className="exploration-current" aria-label="Current exploration">
        <p className="business-kicker">
          <Compass aria-hidden="true" /> Current exploration
        </p>
        {current ? (
          <>
            <h2>
              <Link href={explorationHref(current.id)}>
                {current.name}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </h2>
            <p className="exploration-scope">
              {current.scope ||
                "Get to know the people. Find a question worth pursuing."}
            </p>
            <p className="exploration-summary">
              {current.summary.companies} companies ·{" "}
              {current.summary.contacted} contacted ·{" "}
              {current.summary.conversations} conversations
              <br />
              {current.summary.problems} problems · {current.summary.offers}{" "}
              offers
            </p>
            <Link
              href={explorationHref(current.id)}
              className="exploration-continue"
            >
              Continue exploring <ArrowUpRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <h2>What are you curious about?</h2>
            <p className="exploration-scope">
              Pick a corner of the market. Meet the people in it.
              <br />
              Let what you learn shape your next move.
            </p>
          </>
        )}
      </section>
      <div className="exploration-start">
        <StartExplorationForm />
        <p className="business-hint">
          A fresh space for the next market. Everything you’ve learned stays
          with you.
        </p>
      </div>
      {alsoActive.length > 0 && (
        <section className="exploration-history" aria-label="Also active">
          <h2>Also active</h2>
          <p className="business-hint">
            Your most recently started or resumed exploration appears above.
            These remain open until you choose to pause or stop them.
          </p>
          {alsoActive.map((n) => (
            <Link
              key={n.id}
              href={explorationHref(n.id)}
              className="exploration-history-row"
            >
              <div>
                <h3>{n.name}</h3>
                <p>{n.scope}</p>
              </div>
              <span>{humanize(n.direction)}</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
      <section className="exploration-history" aria-label="Past explorations">
        <h2>
          Past explorations{" "}
          <span className="business-count">{past.length}</span>
        </h2>
        {past.length ? (
          past.map((n) => (
            <Link
              key={n.id}
              href={explorationHref(n.id)}
              className="exploration-history-row"
            >
              <div>
                <h3>{n.name}</h3>
                <p>
                  {n.summary.companies} companies · {n.summary.conversations}{" "}
                  conversations
                </p>
              </div>
              <span>
                {n.archivedAt ? "Archived" : humanize(n.direction)}{" "}
                {businessDate(
                  n.archivedAt ?? n.decisions[0]?.createdAt ?? n.createdAt,
                )}
              </span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))
        ) : (
          <p className="business-inline-empty">
            When you pause or stop an exploration, you can return to it here.
          </p>
        )}
      </section>
    </>
  );
}
