import { quoteLabel } from "@/features/entrepreneurship/offers/utils/offer.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { OfferRevision } from "@/generated/prisma/client";
export function OfferRevisionComparison({
  revisions,
  events,
}: {
  revisions: OfferRevision[];
  events: { offerRevisionId: string; kind: string; retractedAt: Date | null }[];
}) {
  if (revisions.length < 2) return null;
  return (
    <details className="business-disclosure business-revision-comparison">
      <summary>Earlier quoted terms · {revisions.length - 1}</summary>
      <div>
        {revisions.slice(0, -1).map((next, i) => {
          const prior = revisions[i + 1];
          const fields = [
            ["Title", prior.title, next.title],
            ["Scope", prior.scope, next.scope],
            ["Price", quoteLabel(prior), quoteLabel(next)],
            ["Currency", prior.currency, next.currency],
            [
              "Price basis",
              humanize(prior.priceBasis),
              humanize(next.priceBasis),
            ],
            [
              "Unit / interval",
              `${prior.unitLabel ?? "—"} / ${prior.intervalCount ?? "—"} ${prior.intervalUnit ?? ""}`,
              `${next.unitLabel ?? "—"} / ${next.intervalCount ?? "—"} ${next.intervalUnit ?? ""}`,
            ],
            ["Terms", prior.terms, next.terms],
            [
              "Expiry",
              prior.expiresOn ? businessDate(prior.expiresOn) : null,
              next.expiresOn ? businessDate(next.expiresOn) : null,
            ],
          ];
          return (
            <article className="business-revision-card" key={next.id}>
              <h3>
                Revision {prior.version} → {next.version}
              </h3>
              <p className="business-meta">
                {humanize(
                  events.find(
                    (e) => e.offerRevisionId === prior.id && !e.retractedAt,
                  )?.kind ?? "DRAFT",
                )}{" "}
                · {businessDate(prior.createdAt)} →{" "}
                {businessDate(next.createdAt)} ·{" "}
                {humanize(
                  events.find(
                    (e) => e.offerRevisionId === next.id && !e.retractedAt,
                  )?.kind ?? "DRAFT",
                )}
              </p>
              {fields
                .filter(([, a, b]) => a !== b)
                .map(([label, a, b]) => (
                  <div className="business-revision-change" key={label}>
                    <h4>{label}</h4>
                    <div className="business-revision-values">
                      <div className="business-revision-value business-revision-value--previous">
                        <p className="eyebrow">Previous</p>
                        <p className="business-prose">{a || "Not specified"}</p>
                      </div>
                      <div className="business-revision-value business-revision-value--revised">
                        <p className="eyebrow">Revised</p>
                        <p className="business-prose">{b || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {[prior, next].map((revision, revisionIndex) => (
                <details
                  className={`business-nested-disclosure business-nested-disclosure--${revisionIndex === 0 ? "previous" : "revised"}`}
                  key={revision.id}
                >
                  <summary>
                    Complete terms · revision {revision.version}
                  </summary>
                  <dl className="business-revision-terms">
                    <div>
                      <dt>Offer</dt>
                      <dd>{revision.title}</dd>
                    </div>
                    <div>
                      <dt>Price</dt>
                      <dd>{quoteLabel(revision)}</dd>
                    </div>
                    <div className="business-revision-term--wide">
                      <dt>Scope</dt>
                      <dd>{revision.scope}</dd>
                    </div>
                    <div className="business-revision-term--wide">
                      <dt>Terms</dt>
                      <dd>{revision.terms || "No additional terms"}</dd>
                    </div>
                    <div>
                      <dt>Expiry</dt>
                      <dd>
                        {revision.expiresOn
                          ? businessDate(revision.expiresOn)
                          : "No expiry"}
                      </dd>
                    </div>
                  </dl>
                </details>
              ))}
            </article>
          );
        })}
      </div>
    </details>
  );
}
