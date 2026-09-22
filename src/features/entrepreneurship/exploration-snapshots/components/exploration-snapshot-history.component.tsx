import Link from "next/link";
import { Archive, ArrowLeft } from "lucide-react";
import { getExplorationSnapshotHistory } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

export async function ExplorationSnapshotHistory({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const editions = await getExplorationSnapshotHistory(userId, nicheId);
  return (
    <section className="exploration-history">
      <header className="business-page-heading business-section-heading">
        <div>
          <p className="eyebrow">Historical truth</p>
          <h2>What you knew at the time.</h2>
          <p>
            Published editions do not change when the living evidence is
            corrected. Each one preserves the understanding you chose to act on.
          </p>
        </div>
        <Link
          className="business-text-link"
          href={explorationHref(nicheId, "/snapshot")}
        >
          <ArrowLeft aria-hidden="true" /> Current snapshot
        </Link>
      </header>
      {editions.length > 0 ? (
        <ol className="exploration-history-list">
          {editions.map((edition) => (
            <li key={edition.id}>
              <header>
                <div>
                  <span>Edition {edition.number}</span>
                  <h3>{businessDate(edition.publishedAt)}</h3>
                </div>
                <time dateTime={edition.publishedAt.toISOString()}>
                  Published {businessDate(edition.publishedAt)}
                </time>
              </header>
              <div className="exploration-history-findings">
                {edition.claims.map((claim) => (
                  <article key={claim.claimId}>
                    <span>
                      {humanize(claim.claimRevision.lane)} ·{" "}
                      {humanize(claim.claimRevision.kind)}
                    </span>
                    <p>{claim.claimRevision.statement}</p>
                  </article>
                ))}
              </div>
              {edition.uncertainties.length > 0 && (
                <div className="exploration-history-unknowns">
                  <strong>Open questions</strong>
                  {edition.uncertainties.map((item) => (
                    <p key={item.uncertaintyId}>
                      {item.uncertaintyRevision.statement}
                    </p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="business-empty">
          <Archive aria-hidden="true" />
          <h3>No published snapshot yet.</h3>
          <p>
            Review the living record and publish an edition when it is useful
            enough to return to later.
          </p>
          <Link
            className="business-text-link"
            href={explorationHref(nicheId, "/snapshot/review")}
          >
            Review the snapshot →
          </Link>
        </div>
      )}
    </section>
  );
}
