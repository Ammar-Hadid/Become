import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { voidInteractionAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
import {
  FollowUpForm,
  FollowUpRecord,
} from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { notFound } from "next/navigation";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  getInteractionDetail,
  getInteractionOptions,
  getLinkedReplies,
} from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

export async function InteractionDetail({
  userId,
  id,
  nicheId,
}: {
  userId: string;
  id: string;
  nicheId?: string;
}) {
  const [record, options, replies] = await Promise.all([
    getInteractionDetail(userId, id),
    getInteractionOptions(userId, nicheId),
    getLinkedReplies(userId, id),
  ]);
  if (!record) notFound();
  const revision = record.revisions[0];
  const keptObservations = record.revisions.flatMap((r) => r.observations);
  const participants = Array.isArray(revision.participants)
    ? revision.participants.flatMap((p) =>
        p && typeof p === "object" && "name" in p
          ? [
              {
                name: String(p.name),
                role: typeof p.role === "string" ? p.role : null,
                email: typeof p.email === "string" ? p.email : undefined,
              },
            ]
          : [],
      )
    : [];
  return (
    <>
      <Link href="/entrepreneurship/interactions" className="business-back">
        ← Interactions
      </Link>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {record.voidedAt ? "Withdrawn · " : ""}
            {humanize(revision.kind)}
          </p>
          <h2>{revision.companySnapshot ?? "Interaction"}</h2>
          <p>
            {businessDate(revision.occurredAt)} · {humanize(revision.channel)}
          </p>
        </div>
        <div className="business-actions">
          <InteractionForm
            {...options}
            value={{
              id,
              version: record.version,
              kind: revision.kind,
              channel: revision.channel,
              date: DateTime.fromJSDate(revision.occurredAt, {
                zone: APP_TIMEZONE,
              }).toISODate()!,
              summary: revision.summary,
              notes: revision.notes,
              companyId: revision.companyId,
              companyName: revision.companySnapshot,
              nicheId: revision.nicheId,
              respondsToInteractionId: revision.respondsToInteractionId,
              participants,
            }}
          />
        </div>
      </header>
      <div className="business-detail-grid">
        <div className="business-detail-main">
          <section className="business-detail-section">
            <div className="business-row-heading">
              <h3>What happened</h3>{" "}
              <CorrectionMenu
                label="Interaction actions"
                title="Withdraw interaction"
                description="Use this only to correct an event that should not count. Its source history remains in previous assessments."
                action={voidInteractionAction.bind(null, id)}
              />
            </div>
            <p className="business-prose">{revision.summary}</p>
            {revision.notes && (
              <p className="business-prose mt-xl">{revision.notes}</p>
            )}
            {revision.respondsToInteractionId && (
              <Link
                className="business-text-link mt-xl inline-block"
                href={`/entrepreneurship/interactions/${revision.respondsToInteractionId}`}
              >
                ↳ Reply to an earlier interaction
              </Link>
            )}
          </section>
          <section className="business-detail-section">
            <h3>Observations · {keptObservations.length}</h3>
            {keptObservations.length ? (
              keptObservations.map((observation) => (
                <article key={observation.id} className="business-observation">
                  <p className="business-meta">
                    {humanize(observation.kind)} ·{" "}
                    {humanize(observation.wordingMode)}
                  </p>
                  <blockquote className="business-prose">
                    {observation.statement}
                  </blockquote>
                  <p className="business-hint">
                    Source: {observation.sourceDescription}
                  </p>
                  <Link
                    className="business-text-link"
                    href={`/entrepreneurship/observations/${observation.observationId}`}
                  >
                    Observation details & versions ↗
                  </Link>
                  {observation.evidence.map((evidence) => (
                    <p key={evidence.id} className="business-hint">
                      {humanize(evidence.stance)} ·{" "}
                      <Link
                        className="business-text-link"
                        href={`/entrepreneurship/problems/${evidence.problemId}`}
                      >
                        {evidence.problem.title}
                      </Link>
                    </p>
                  ))}
                </article>
              ))
            ) : (
              <p className="business-inline-empty">
                No observation was added. An interaction stands on its own.
              </p>
            )}
          </section>
          <section className="business-detail-section">
            <div className="business-row-heading">
              <h3>Linked replies</h3>
              <InteractionForm
                {...options}
                companyId={revision.companyId ?? undefined}
                companyName={revision.companySnapshot ?? undefined}
                respondsTo={id}
                sourceNicheId={revision.nicheId}
                triggerLabel="Log a reply"
              />
            </div>
            {replies.length ? (
              replies.map((reply) => (
                <article key={reply.id} className="business-record-row">
                  <p className="business-meta">
                    {businessDate(reply.occurredAt)}
                  </p>
                  <Link
                    className="business-text-link"
                    href={`/entrepreneurship/interactions/${reply.id}`}
                  >
                    {reply.summary}
                  </Link>
                </article>
              ))
            ) : (
              <p className="business-inline-empty">No linked reply recorded.</p>
            )}
          </section>
          {record.revisions.length > 1 && (
            <details className="business-disclosure">
              <summary>
                Earlier versions · {record.revisions.length - 1}
              </summary>
              <div>
                {record.revisions.slice(1).map((old) => (
                  <article key={old.id}>
                    <p className="business-meta">
                      Recorded {businessDate(old.createdAt)}
                    </p>
                    <p className="business-prose">{old.summary}</p>
                    <p className="business-hint">
                      {old.companySnapshot} · {businessDate(old.occurredAt)}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          )}
        </div>
        <aside className="business-aside">
          <section className="business-aside-section">
            <p className="eyebrow">Context at the time</p>
            {revision.companyId && (
              <Link
                className="business-text-link mt-lg inline-block"
                href={`/entrepreneurship/market/companies/${revision.companyId}`}
              >
                {revision.companySnapshot}
              </Link>
            )}
            <p className="mt-lg">
              {revision.nicheSnapshot ?? "No niche recorded"}
            </p>
            <p className="mt-lg">
              {participants.length
                ? participants
                    .map(
                      (p) =>
                        `${p.name}${p.role ? ` (${p.role})` : ""}${p.email ? ` · ${p.email}` : ""}`,
                    )
                    .join(", ")
                : "No participants recorded"}
            </p>
          </section>
          <section className="business-detail-section mt-xl">
            <h3>Next actions</h3>
            <FollowUpForm target={{ interactionId: id }} />
            {record.followUps.length ? (
              record.followUps.map((followUp) => (
                <FollowUpRecord key={followUp.id} record={followUp} />
              ))
            ) : (
              <p>No follow-up chosen.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
