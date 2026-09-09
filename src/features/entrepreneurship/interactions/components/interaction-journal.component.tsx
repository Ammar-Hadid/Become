import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  ArrowUpRight,
  MessageSquare,
  ArrowUpRight as Outbound,
  CornerDownLeft,
} from "lucide-react";
import { getInteractionJournal } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
export async function InteractionJournal({
  userId,
  kind,
  companyId,
  cursor,
  nicheId,
}: {
  userId: string;
  kind?: string;
  companyId?: string;
  cursor?: string;
  nicheId?: string;
}) {
  const data = await getInteractionJournal(userId, {
    kind,
    companyId,
    cursor,
    nicheId,
  });
  return (
    <>
      {data.records.length ? (
        <div className="business-journal">
          {data.records.map((record) => {
            const revision = record.revisions[0];
            const observations = record.revisions
              .flatMap((entry) => entry.observations)
              .filter(
                (entry) =>
                  !entry.observation.voidedAt &&
                  entry.version === entry.observation.version,
              );
            const Icon =
              revision.kind === "OUTREACH_SENT"
                ? Outbound
                : revision.kind === "REPLY_RECEIVED"
                  ? CornerDownLeft
                  : MessageSquare;
            return (
              <article key={record.id} className="business-journal-entry">
                <div className="business-journal-marker">
                  <Icon aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="business-meta">
                    <span>{humanize(revision.kind)}</span>
                    <span>·</span>
                    <time>{businessDate(revision.occurredAt)}</time>
                    <span>·</span>
                    <span>
                      {revision.companySnapshot ?? "No company recorded"}
                    </span>
                  </div>
                  <Link
                    className="business-journal-title"
                    href={`/entrepreneurship/interactions/${record.id}`}
                  >
                    {revision.summary}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  {observations.length > 0 && (
                    <div className="business-journal-excerpt">
                      <p>
                        {observations[0].wordingMode === "QUOTE" ? "“" : ""}
                        {observations[0].statement}
                        {observations[0].wordingMode === "QUOTE" ? "”" : ""}
                      </p>
                      <span>
                        {observations.length}{" "}
                        {observations.length === 1
                          ? "observation"
                          : "observations"}{" "}
                        kept
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="business-empty">
          <MessageSquare aria-hidden="true" />
          <h3>No interactions recorded here yet.</h3>
          <p>
            A conversation, a sent message, a reply. Start with what actually
            happened.
          </p>
        </div>
      )}
      {data.next && (
        <Link
          className="business-text-link"
          href={`?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(companyId ? { companyId } : {}), cursor: data.next })}`}
        >
          Earlier interactions →
        </Link>
      )}
    </>
  );
}
