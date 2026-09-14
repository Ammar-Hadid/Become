import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import type { getAudienceMetrics } from "@/features/entrepreneurship/analytics/queries/audience-metrics.query";

export type AudienceMetricsView = Awaited<
  ReturnType<typeof getAudienceMetrics>
>;

export function AudienceMetrics({ facts }: { facts: AudienceMetricsView }) {
  return (
    <>
      <div className="business-facts exploration-facts">
        <Link href="/entrepreneurship/evidence">
          <strong>{facts.evidenceEntries}</strong>
          <span>Evidence entries</span>
          <small>Interactions & standalone observations</small>
        </Link>
        <Link href="/entrepreneurship/evidence?sourceKind=INTERACTION">
          <strong>{facts.conversations}</strong>
          <span>Conversations</span>
          <small>Actual recorded conversations</small>
        </Link>
        <div>
          <strong>{facts.peopleContacted}</strong>
          <span>Identified people contacted</span>
          <small>Across recorded contact events</small>
        </div>
        <Link href="/entrepreneurship/offers">
          <strong>{facts.responses}</strong>
          <span>Recipient responses</span>
          <small>Recipients with interest, acceptance, or rejection</small>
        </Link>
      </div>
      <details className="business-disclosure mt-xl">
        <summary>Audience context & source coverage</summary>
        <div>
          <p className="business-hint">{facts.qualification}</p>
          <div className="business-evidence-counts">
            <span>{facts.businessesContacted} businesses contacted</span>
            <span>
              {facts.anonymousEntries} entries without identified sources
            </span>
            <span>{facts.aggregateSources} aggregate sources</span>
          </div>
          {facts.byMarket.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-body-sm w-full text-left">
                <caption className="sr-only">
                  Evidence by the buying context recorded on each source
                </caption>
                <thead>
                  <tr className="border-border text-text-muted border-b">
                    {[
                      "Saved context",
                      "Entries",
                      "Conversations",
                      "People",
                      "Businesses",
                      "Unnamed",
                      "Aggregate",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-md py-md font-medium whitespace-nowrap first:pl-0"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facts.byMarket.map((row) => (
                    <tr
                      key={row.marketType}
                      className="border-border border-b last:border-0"
                    >
                      <th
                        scope="row"
                        className="py-md pr-md font-medium whitespace-nowrap"
                      >
                        {marketTypeLabel(row.marketType)}
                      </th>
                      {[
                        row.evidenceEntries,
                        row.conversations,
                        row.people,
                        row.businesses,
                        row.anonymousEntries,
                        row.aggregateSources,
                      ].map((value, index) => (
                        <td key={index} className="px-md py-md tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
