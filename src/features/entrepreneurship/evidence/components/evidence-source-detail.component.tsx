import {
  ArrowUpRight,
  CalendarDays,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { EvidenceSourceObservations } from "@/features/entrepreneurship/evidence/components/evidence-source-observations.component";
import type { getEvidenceSourceDetail } from "@/features/entrepreneurship/evidence/queries/evidence-source.query";
import { BusinessBackLink } from "@/features/entrepreneurship/explorations/components/business-back-link.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

export type EvidenceSourceDetailData = NonNullable<
  Awaited<ReturnType<typeof getEvidenceSourceDetail>>
>;

type Participant = { name: string; role: string | null; email?: string };

function sourceParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((participant) =>
    participant && typeof participant === "object" && "name" in participant
      ? [
          {
            name: String(participant.name),
            role:
              "role" in participant && typeof participant.role === "string"
                ? participant.role
                : null,
            email:
              "email" in participant && typeof participant.email === "string"
                ? participant.email
                : undefined,
          },
        ]
      : [],
  );
}

export function EvidenceSourceDetail({
  data,
  nicheId,
  returnTo,
}: {
  data: EvidenceSourceDetailData;
  nicheId?: string;
  returnTo?: string;
}) {
  const { source, observations } = data;
  const participants = sourceParticipants(source.participants);
  const subject =
    source.personSnapshot ??
    source.companySnapshot ??
    source.audienceLabel ??
    "Conversation source";
  const rawSourceHref = nicheId
    ? explorationWorkspaceHref(nicheId, "evidence", `/sources/${source.id}`)
    : `/entrepreneurship/evidence/sources/${source.id}`;
  const sourceHref =
    nicheId && returnTo
      ? withExplorationReturn(rawSourceHref, returnTo)
      : rawSourceHref;
  const conversationHref = nicheId
    ? withExplorationReturn(
        explorationWorkspaceHref(nicheId, "conversations", `/${source.id}`),
        sourceHref,
      )
    : `/entrepreneurship/interactions/${source.id}`;

  return (
    <>
      <BusinessBackLink
        className="business-back"
        returnTo={returnTo}
        fallbackHref="/entrepreneurship/evidence"
      >
        ← Evidence journal
      </BusinessBackLink>

      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {humanize(source.kind)} source · revision {source.version}
          </p>
          <h2>{subject}</h2>
          <p>
            {businessDate(source.occurredAt)} · {humanize(source.channel)}
            {source.platform ? ` · ${humanize(source.platform)}` : ""}
          </p>
        </div>
        <div className="business-actions">
          <p className="business-count">
            {observations.length} kept{" "}
            {observations.length === 1 ? "observation" : "observations"}
          </p>
          <Link className="business-text-link" href={conversationHref}>
            Open full conversation
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>

      <div className="business-detail-grid">
        <div className="business-detail-main">
          <section className="business-detail-section">
            <div className="business-row-heading">
              <div>
                <p className="eyebrow">Source record</p>
                <h3>What happened</h3>
              </div>
              <MessageSquareText aria-hidden="true" />
            </div>
            <p className="business-prose text-text-primary">{source.summary}</p>
            {source.notes && (
              <div className="border-border mt-xl pt-xl border-t">
                <p className="eyebrow">Notes</p>
                <p className="business-prose mt-md">{source.notes}</p>
              </div>
            )}
            {source.correctionReason && (
              <div className="border-border mt-xl rounded-control p-lg border">
                <p className="eyebrow">Correction note</p>
                <p className="business-hint mt-sm">{source.correctionReason}</p>
              </div>
            )}
            <dl className="business-record-facts">
              <div>
                <dd>{humanize(source.channel)}</dd>
                <dt>Channel</dt>
              </div>
              <div>
                <dd>
                  {source.platform ? humanize(source.platform) : "Unrecorded"}
                </dd>
                <dt>Platform</dt>
              </div>
              <div>
                <dd>{humanize(source.datePrecision)}</dd>
                <dt>Date precision</dt>
              </div>
              <div>
                <dd>{observations.length}</dd>
                <dt>Observations kept</dt>
              </div>
            </dl>
          </section>

          <EvidenceSourceObservations
            key={source.id}
            observations={observations}
            nicheId={nicheId}
            returnTo={sourceHref}
            sourceAudienceContextId={source.audienceContext?.id ?? null}
          />
        </div>

        <aside className="business-aside" aria-label="Source context">
          <section className="business-aside-section">
            <div className="gap-sm flex items-center">
              <CalendarDays
                aria-hidden="true"
                className="text-text-muted size-4"
              />
              <h3 className="text-h5">Record details</h3>
            </div>
            <dl className="mt-xl gap-lg grid">
              <div>
                <dt className="eyebrow">Occurred</dt>
                <dd className="text-body text-text-secondary mt-xs">
                  <time dateTime={source.occurredAt.toISOString()}>
                    {businessDate(source.occurredAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Revision recorded</dt>
                <dd className="text-body text-text-secondary mt-xs">
                  <time dateTime={source.createdAt.toISOString()}>
                    {businessDate(source.createdAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Identity</dt>
                <dd className="text-body text-text-secondary mt-xs">
                  {humanize(source.identityKind)}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Exploration</dt>
                <dd className="text-body text-text-secondary mt-xs">
                  {source.nicheId && source.nicheSnapshot ? (
                    <Link
                      className="business-text-link"
                      href={`/entrepreneurship/market/niches/${source.nicheId}`}
                    >
                      {source.nicheSnapshot}
                    </Link>
                  ) : (
                    "No exploration recorded"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="business-aside-section">
            <div className="gap-sm flex items-center">
              <UsersRound
                aria-hidden="true"
                className="text-text-muted size-4"
              />
              <h3 className="text-h5">Audience at the time</h3>
            </div>
            <p className="text-body text-text-secondary mt-lg">
              <AudienceSummary {...source} />
            </p>
            {source.audienceContext?.description && (
              <p className="business-hint mt-md">
                {source.audienceContext.description}
              </p>
            )}
            {(source.personId || source.companyId) && (
              <div className="mt-lg gap-sm flex flex-wrap">
                {source.personId && (
                  <Link
                    className="business-text-link"
                    href={`/entrepreneurship/people/${source.personId}`}
                  >
                    Open person ↗
                  </Link>
                )}
                {source.companyId && (
                  <Link
                    className="business-text-link"
                    href={`/entrepreneurship/market/companies/${source.companyId}`}
                  >
                    Open company ↗
                  </Link>
                )}
              </div>
            )}
            <div className="business-aside-divider">
              <h3>Participants · {participants.length}</h3>
              {participants.length ? (
                <ul className="gap-md grid">
                  {participants.map((participant, index) => (
                    <li
                      key={`${participant.name}-${index}`}
                      className="text-body"
                    >
                      <span className="text-text-primary">
                        {participant.name}
                      </span>
                      {participant.role && (
                        <span className="text-text-secondary">
                          {" "}
                          · {participant.role}
                        </span>
                      )}
                      {participant.email && (
                        <span className="text-text-muted block">
                          {participant.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No additional participants recorded.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
