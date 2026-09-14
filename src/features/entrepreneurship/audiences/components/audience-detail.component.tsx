import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  AudienceForm,
  AudienceMenu,
} from "@/features/entrepreneurship/audiences/components/audience-forms.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import { EvidenceJournal } from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import type { getAudienceDetail } from "@/features/entrepreneurship/audiences/queries/audience.query";

export function AudienceDetail({
  data,
  kind,
  nicheId,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getAudienceDetail>>>;
  kind: "person" | "segment";
  nicheId?: string;
}) {
  const { record } = data;
  return (
    <>
      <Link
        className="business-back"
        href={`/entrepreneurship/audience${kind === "person" ? "?kind=person" : ""}`}
      >
        ← {kind === "segment" ? "Segments" : "People"}
      </Link>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {record.archivedAt ? "Archived · " : ""}
            {kind === "segment" ? "Audience segment" : "Person"}
          </p>
          <h2>{record.name}</h2>
          {"marketType" in record && (
            <p>{marketTypeLabel(record.marketType)}</p>
          )}
        </div>
        <div className="business-actions">
          <AudienceForm kind={kind} record={record} />
          <AudienceMenu
            kind={kind}
            id={record.id}
            archived={Boolean(record.archivedAt)}
          />
        </div>
      </header>
      <section className="business-zone">
        <div className="business-row-heading">
          <h3>
            {kind === "segment"
              ? "Current segment definition"
              : "Useful context"}
          </h3>
        </div>
        <p className="business-prose">
          {"description" in record
            ? record.description
            : record.notes || "No extra context recorded."}
        </p>
        {"email" in record && record.email && (
          <p className="business-hint mt-lg">{record.email}</p>
        )}
        <p className="business-hint mt-lg">
          {kind === "segment"
            ? "Sources and judgments preserve the audience definition captured at the time."
            : "A person’s role and buying context belong to each recorded event."}
        </p>
      </section>
      <section className="business-zone business-zone--ledger">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">
              {nicheId ? "In this exploration" : "Across explorations"}
            </p>
            <h3>Evidence</h3>
          </div>
          <Link
            className="business-text-link"
            href={`/entrepreneurship/evidence?${kind === "segment" ? "segmentId" : "personId"}=${record.id}`}
          >
            Open journal ↗
          </Link>
        </div>
        <EvidenceJournal
          data={data.evidence}
          paginationHref={
            data.evidence.next
              ? `/entrepreneurship/evidence?${new URLSearchParams({ [kind === "segment" ? "segmentId" : "personId"]: record.id, cursor: data.evidence.next })}`
              : undefined
          }
        />
      </section>
      <div className="business-overview-grid">
        <section className="business-zone">
          <div className="business-row-heading">
            <h3>Problems being examined</h3>
          </div>
          {data.problems.length ? (
            data.problems.map((problem) => (
              <article className="business-record-row" key={problem.id}>
                <Link
                  className="business-text-link"
                  href={`/entrepreneurship/problems/${problem.id}`}
                >
                  {problem.title}
                </Link>
                <p className="business-hint mt-sm">
                  <AudienceSummary {...problem} />
                </p>
              </article>
            ))
          ) : (
            <p className="business-inline-empty">
              No scoped problems linked here yet.
            </p>
          )}
        </section>
        <section className="business-zone">
          <div className="business-row-heading">
            <h3>Offers</h3>
          </div>
          {data.offers.length ? (
            data.offers.map((offer) => (
              <article className="business-record-row" key={offer.id}>
                <Link
                  className="business-text-link"
                  href={`/entrepreneurship/offers/${offer.id}`}
                >
                  {offer.revisions[0]?.title || "Offer"}
                </Link>
                <p className="business-hint mt-sm">
                  {offer.mode === "AUDIENCE_TEST"
                    ? "Audience test"
                    : "Specific proposal"}
                </p>
              </article>
            ))
          ) : (
            <p className="business-inline-empty">No offers linked here yet.</p>
          )}
        </section>
      </div>
      <details className="business-disclosure business-zone">
        <summary>Shared identity & exploration links</summary>
        <div>
          <p className="business-hint">
            Added {businessDate(record.createdAt)}. Attaching this record does
            not import past evidence.
          </p>
          {record.niches.map(({ niche }) => (
            <Link
              key={niche.id}
              className="business-text-link"
              href={`/entrepreneurship/explorations/${niche.id}`}
            >
              {niche.name}
              {niche.archivedAt ? " · archived" : ""}
            </Link>
          ))}
        </div>
      </details>
    </>
  );
}
