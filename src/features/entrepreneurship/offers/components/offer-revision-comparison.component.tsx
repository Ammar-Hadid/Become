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
    <details className="business-disclosure">
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
            <article key={next.id}>
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
                  <div className="business-detail-section" key={label}>
                    <h4>{label}</h4>
                    <p className="business-prose">
                      <strong>Previous: </strong>
                      {a || "Not specified"}
                    </p>
                    <p className="business-prose">
                      <strong>Revised: </strong>
                      {b || "Not specified"}
                    </p>
                  </div>
                ))}
              {[prior, next].map((revision) => (
                <details key={revision.id}>
                  <summary>
                    Complete terms · revision {revision.version}
                  </summary>
                  <h4>{revision.title}</h4>
                  <p>{quoteLabel(revision)}</p>
                  <p className="business-prose">{revision.scope}</p>
                  <p className="business-prose">
                    {revision.terms || "No additional terms"}
                  </p>
                  {revision.expiresOn && (
                    <p>Expires {businessDate(revision.expiresOn)}</p>
                  )}
                </details>
              ))}
            </article>
          );
        })}
      </div>
    </details>
  );
}
