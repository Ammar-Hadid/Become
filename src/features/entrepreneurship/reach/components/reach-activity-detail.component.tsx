import Link from "next/link";
import { Card } from "@/components/ui/cards/card.component";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { ArrowLeft, ArrowRight, MessageSquareText } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  getReachActivityDetail,
  getReachWorkspace,
} from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import {
  getInteractionOptions,
  getLinkedReplies,
} from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { voidInteractionAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
import {
  FollowUpForm,
  FollowUpRecord,
} from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { BusinessBackLink } from "@/features/entrepreneurship/explorations/components/business-back-link.component";

const reachKinds = [
  "OUTREACH_SENT",
  "REPLY_RECEIVED",
  "ATTEMPT_NO_CONTACT",
] as const;

export async function ReachActivityDetail({
  userId,
  nicheId,
  activityId,
  returnTo,
}: {
  userId: string;
  nicheId: string;
  activityId: string;
  returnTo?: string;
}) {
  const [record, options, replies, workspace] = await Promise.all([
    getReachActivityDetail(userId, nicheId, activityId),
    getInteractionOptions(userId, nicheId),
    getLinkedReplies(userId, activityId),
    getReachWorkspace(userId, nicheId),
  ]);
  if (!record || !workspace) notFound();
  const revision = record.revisions[0];
  const archived = Boolean(workspace.niche.archivedAt);
  const readOnly = archived || Boolean(record.voidedAt);
  const bridge = record.conversation;
  const participants = Array.isArray(revision.participants)
    ? revision.participants.flatMap((participant) => {
        if (
          !participant ||
          typeof participant !== "object" ||
          !("name" in participant)
        )
          return [];
        return [
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
        ];
      })
    : [];
  const participantName =
    revision.personSnapshot ??
    revision.companySnapshot ??
    revision.audienceLabel ??
    "Unspecified recipient";

  return (
    <div className="exploration-stage reach-activity-detail">
      <BusinessBackLink
        returnTo={returnTo}
        fallbackHref={explorationWorkspaceHref(nicheId, "outreach")}
        className="business-back"
      >
        <ArrowLeft aria-hidden="true" /> Reach activity
      </BusinessBackLink>
      <header className="exploration-stage-heading">
        <div>
          <p className="eyebrow">
            Reach · {record.voidedAt ? "withdrawn · " : ""}
            {humanize(revision.kind)}
          </p>
          <h2>{participantName}</h2>
          <p>
            {businessDate(revision.occurredAt)} · {humanize(revision.channel)}
            {revision.platform ? ` · ${humanize(revision.platform)}` : ""}
          </p>
        </div>
        {!readOnly && (
          <div className="business-actions">
            <InteractionForm
              {...options}
              allowedKinds={reachKinds}
              captureObservations={false}
              lockExploration={nicheId}
              value={{
                ...revision,
                id: activityId,
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
            {bridge ? (
              <Link
                className="become-button become-button--primary become-button--md"
                href={explorationWorkspaceHref(
                  nicheId,
                  "conversations",
                  `/${bridge.conversationId}`,
                )}
              >
                <MessageSquareText aria-hidden="true" /> Open conversation
              </Link>
            ) : revision.kind === "REPLY_RECEIVED" ? (
              <Link
                className="become-button become-button--primary become-button--md"
                href={`${explorationWorkspaceHref(nicheId, "conversations")}?linkedInteractionId=${encodeURIComponent(activityId)}`}
              >
                <MessageSquareText aria-hidden="true" /> Start conversation
              </Link>
            ) : null}
          </div>
        )}
      </header>

      <div className="business-detail-grid">
        <div className="business-detail-main">
          <Card className="business-detail-section">
            <header className="business-section-heading">
              <div>
                <p className="eyebrow">Recorded event</p>
                <h3>What happened</h3>
              </div>
              {!readOnly && (
                <CorrectionMenu
                  label="Reach record actions"
                  title="Withdraw Reach record"
                  description="Use this when the operational event should no longer count. Earlier history remains traceable."
                  action={voidInteractionAction.bind(null, activityId)}
                />
              )}
            </header>
            <p className="business-prose">{revision.summary}</p>
            <p className="business-hint">
              <AudienceSummary {...revision} />
            </p>
            {revision.notes && (
              <p className="business-prose">{revision.notes}</p>
            )}
          </Card>

          <Card className="business-detail-section">
            <header className="business-section-heading">
              <div>
                <p className="eyebrow">Contact trail</p>
                <h3>Replies</h3>
              </div>
              {!readOnly && (
                <InteractionForm
                  {...options}
                  allowedKinds={["REPLY_RECEIVED"]}
                  captureObservations={false}
                  lockExploration={nicheId}
                  companyId={revision.companyId ?? undefined}
                  companyName={revision.companySnapshot ?? undefined}
                  respondsTo={activityId}
                  sourceNicheId={revision.nicheId}
                  initialKind="REPLY_RECEIVED"
                  createdHrefPrefix={explorationWorkspaceHref(
                    nicheId,
                    "outreach",
                  )}
                  triggerLabel="Record reply"
                />
              )}
            </header>
            {replies.length > 0 ? (
              <ol className="exploration-timeline">
                {replies.map((reply) => (
                  <li key={reply.id}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{reply.summary}</strong>
                      <small>{reply.companySnapshot ?? participantName}</small>
                    </div>
                    <Link
                      href={explorationWorkspaceHref(
                        nicheId,
                        "outreach",
                        `/${reply.id}`,
                      )}
                    >
                      {businessDate(reply.occurredAt)}{" "}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="exploration-inline-empty">
                No reply has been recorded yet.
              </p>
            )}
          </Card>

          {record.revisions.length > 1 && (
            <details className="business-disclosure">
              <summary>
                Correction history · {record.revisions.length - 1} earlier
                {record.revisions.length === 2 ? " version" : " versions"}
              </summary>
              <div>
                {record.revisions.slice(1).map((earlier) => (
                  <article key={earlier.id}>
                    <p className="business-meta">
                      Recorded {businessDate(earlier.createdAt)}
                    </p>
                    <p className="business-prose">{earlier.summary}</p>
                    {earlier.correctionReason && (
                      <p className="business-hint">
                        {earlier.correctionReason}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </details>
          )}
        </div>

        <aside className="business-aside">
          <Card spacing="dense" className="business-aside-section">
            <p className="eyebrow">Contact context</p>
            <h3>{participantName}</h3>
            <p>
              {revision.nicheSnapshot ?? workspace.niche.name} ·{" "}
              {humanize(revision.audienceContext?.marketType ?? "UNKNOWN")}
            </p>
          </Card>
          <Card
            spacing="dense"
            className="business-aside-section reach-next-action"
          >
            <p className="eyebrow">Next action</p>
            {!readOnly && (
              <FollowUpForm target={{ interactionId: activityId }} />
            )}
            {record.followUps.length > 0 ? (
              record.followUps.map((followUp) => (
                <FollowUpRecord
                  key={followUp.id}
                  record={followUp}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <p className="reach-next-action-empty">
                No next action chosen yet.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
