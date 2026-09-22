import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { PastExplorations } from "@/features/entrepreneurship/explorations/components/past-explorations.component";
import { getExplorations } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import {
  currentExplorations,
  explorationWorkspaceHref,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { StartExplorationForm } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import { ExplorationDirectionSummary } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
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
      <div className="business-row-heading exploration-home-heading">
        <p className="eyebrow">Your explorations</p>
        <Link className="business-text-link" href="/entrepreneurship/history">
          Global history ↗
        </Link>
      </div>
      <section className="exploration-current" aria-label="Current exploration">
        <div className="exploration-current-copy">
          <p className="business-kicker">
            <Compass aria-hidden="true" /> Current exploration
          </p>
          {current ? (
            <>
              <h2>
                <Link href={explorationWorkspaceHref(current.id, "overview")}>
                  {current.name}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </h2>
              <p className="exploration-scope">
                {current.scope ||
                  "Learn who needs this and whether there is a path worth pursuing."}
              </p>
              <p className="text-body-sm text-text-muted">
                <ExplorationDirectionSummary
                  marketFocus={current.marketFocus}
                  marketConclusion={current.marketConclusion}
                />
              </p>
              <Link
                href={explorationWorkspaceHref(current.id, "overview")}
                className="exploration-continue"
              >
                Continue exploring <ArrowUpRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <h2>What are you curious about?</h2>
              <p className="exploration-scope">
                Begin with a question. Learn from people and businesses. Let
                their experience shape what comes next.
              </p>
            </>
          )}
        </div>
        {current ? (
          <aside
            className="exploration-current-pulse"
            aria-label="Recorded activity"
          >
            <p className="eyebrow">What you’ve recorded</p>
            <dl className="exploration-current-facts">
              <div>
                <dd>{current.summary.evidenceEntries}</dd>
                <dt>Evidence entries</dt>
              </div>
              <div>
                <dd>{current.summary.conversations}</dd>
                <dt>Conversations</dt>
              </div>
              <div>
                <dd>{current.summary.problems}</dd>
                <dt>Problems</dt>
              </div>
              <div>
                <dd>{current.summary.offers}</dd>
                <dt>Offers</dt>
              </div>
            </dl>
          </aside>
        ) : (
          <aside className="exploration-current-guide">
            <p className="eyebrow">A useful starting point</p>
            <p>
              You can begin without choosing a customer. Explore consumers,
              businesses, or both in the same workspace.
            </p>
          </aside>
        )}
      </section>
      <section className="exploration-start" aria-label="Start an exploration">
        <div>
          <p className="eyebrow">Open a new path</p>
          <h2>Begin somewhere specific.</h2>
          <p>
            A fresh workspace for a different market or question. Everything you
            have already learned stays with you.
          </p>
        </div>
        <StartExplorationForm />
      </section>
      {alsoActive.length > 0 && (
        <section
          className="exploration-active"
          aria-labelledby="also-active-title"
        >
          <header className="exploration-section-heading">
            <div>
              <p className="eyebrow">Still in motion</p>
              <h2 id="also-active-title">
                Also active{" "}
                <span className="business-count">{alsoActive.length}</span>
              </h2>
              <p>
                The exploration above is your current focus. These paths stay
                open until you choose to pause or stop them.
              </p>
            </div>
          </header>
          <div className="exploration-active-grid">
            {alsoActive.map((n) => (
              <Link
                key={n.id}
                href={explorationWorkspaceHref(n.id, "overview")}
                className="exploration-active-card"
              >
                <div className="exploration-active-title">
                  <span className="exploration-direction-badge">
                    {humanize(n.direction)}
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </div>
                <h3>{n.name}</h3>
                <p>{n.scope || "No scope was recorded."}</p>
                <span className="exploration-active-meta">
                  {n.summary.problems}{" "}
                  {n.summary.problems === 1 ? "problem" : "problems"}
                  <span aria-hidden="true">·</span>
                  {n.summary.conversations}{" "}
                  {n.summary.conversations === 1
                    ? "conversation"
                    : "conversations"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <PastExplorations
        explorations={past.map((exploration) => {
          const statusDate =
            exploration.archivedAt ??
            exploration.decisions[0]?.createdAt ??
            exploration.createdAt;
          return {
            id: exploration.id,
            href: explorationWorkspaceHref(exploration.id, "overview"),
            name: exploration.name,
            scope: exploration.scope ?? "",
            evidenceEntries: exploration.summary.evidenceEntries,
            conversations: exploration.summary.conversations,
            direction: humanize(exploration.direction),
            statusDate: businessDate(statusDate),
            statusDateIso: statusDate.toISOString(),
            archived: Boolean(exploration.archivedAt),
          };
        })}
      />
    </>
  );
}
