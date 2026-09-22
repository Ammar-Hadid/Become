import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock3,
  FileText,
  MessageSquareDashed,
  NotebookPen,
} from "lucide-react";
import {
  getConversationIndex,
  getConversationWorkspace,
} from "@/features/entrepreneurship/conversations/queries/conversation.query";
import { getInterviewGuideOptions } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { LearnNavigation } from "@/features/entrepreneurship/learn/components/learn-navigation.component";
import { ConversationStartForm } from "@/features/entrepreneurship/conversations/components/conversation-start-form.component";
import { ConversationComposer } from "@/features/entrepreneurship/conversations/components/conversation-composer.component";
import { ConversationMessageMenu } from "@/features/entrepreneurship/conversations/components/conversation-message-menu.component";
import { ConversationStateControls } from "@/features/entrepreneurship/conversations/components/conversation-state-controls.component";
import { ExplorationFieldNotes } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-field-notes.component";

function participant(revision: {
  personSnapshot?: string | null;
  companySnapshot?: string | null;
  audienceLabel?: string | null;
}) {
  return (
    [revision.personSnapshot, revision.companySnapshot]
      .filter(Boolean)
      .join(" · ") ||
    revision.audienceLabel ||
    "Participant"
  );
}

export async function ConversationWorkspace({
  userId,
  nicheId,
  conversationId,
  initialLinkedInteractionId,
}: {
  userId: string;
  nicheId: string;
  conversationId?: string;
  initialLinkedInteractionId?: string;
}) {
  const [conversations, guides, interactionOptions, conversation] =
    await Promise.all([
      getConversationIndex(userId, nicheId),
      getInterviewGuideOptions(userId, nicheId),
      getInteractionOptions(userId, nicheId),
      conversationId
        ? getConversationWorkspace(userId, conversationId, nicheId)
        : Promise.resolve(null),
    ]);
  const guideOptions = guides.flatMap((guide) =>
    guide.revisions[0]
      ? [
          {
            id: guide.id,
            title: guide.title,
            revisionId: guide.revisions[0].id,
            version: guide.revisions[0].version,
          },
        ]
      : [],
  );

  return (
    <div className="exploration-stage conversation-page">
      <header className="exploration-stage-heading">
        <div>
          <h2>Preserve the two-sided exchange.</h2>
          <p>
            Messages are the conversation. Observations are separate records you
            deliberately keep from an exact message.
          </p>
        </div>
        <ConversationStartForm
          nicheId={nicheId}
          guides={guideOptions}
          reachRecords={interactionOptions.replies}
          initialLinkedInteractionId={initialLinkedInteractionId}
        />
      </header>
      <LearnNavigation nicheId={nicheId} active="conversations" />

      <div
        className="conversation-workspace"
        data-empty={!conversation || undefined}
      >
        <aside className="conversation-index" aria-label="Conversations">
          <header>
            <span>{conversations.length} conversations</span>
          </header>
          {conversations.length > 0 ? (
            <ol>
              {conversations.map((item) => {
                const revision = item.revisions[0];
                const latest = item.conversationMessages[0]?.revisions[0];
                const active = item.id === conversationId;
                return (
                  <li key={item.id}>
                    <Link
                      href={explorationHref(
                        nicheId,
                        `/learn/conversations/${item.id}`,
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <div>
                        <strong>{participant(revision)}</strong>
                        <span data-status={item.status.toLowerCase()}>
                          {humanize(item.status)}
                        </span>
                      </div>
                      <p>
                        {latest?.body ??
                          revision.summary ??
                          "Historical summary"}
                      </p>
                      <small>{item._count.conversationMessages} messages</small>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="conversation-index-empty">
              <MessageSquareDashed aria-hidden="true" />
              <p>No conversations yet.</p>
            </div>
          )}
        </aside>

        {conversation ? (
          <ConversationDetail nicheId={nicheId} conversation={conversation} />
        ) : (
          <section className="conversation-welcome">
            <MessageSquareDashed aria-hidden="true" />
            <h3>Open a conversation.</h3>
            <p>
              Choose an exchange from the index, or begin with someone who
              replied in Reach.
            </p>
            {conversations[0] && (
              <Link
                href={explorationHref(
                  nicheId,
                  `/learn/conversations/${conversations[0].id}`,
                )}
              >
                Open latest conversation <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ConversationDetail({
  nicheId,
  conversation,
}: {
  nicheId: string;
  conversation: NonNullable<
    Awaited<ReturnType<typeof getConversationWorkspace>>
  >;
}) {
  const revision = conversation.revisions[0];
  const participantName = participant(revision);
  const currentMessages = conversation.conversationMessages.filter(
    (message) => !message.voidedAt,
  );
  const debriefMessages = currentMessages
    .flatMap((message) => {
      const current = message.revisions[0];
      if (
        !current ||
        current.speakerRole !== "PARTICIPANT" ||
        message.observationRevisions.length > 0
      )
        return [];
      return [
        {
          id: message.id,
          version: message.version,
          body: current.body,
          speakerName: current.speakerNameSnapshot,
          bookmarked: Boolean(message.bookmarkedAt),
        },
      ];
    })
    .toSorted(
      (left, right) => Number(right.bookmarked) - Number(left.bookmarked),
    );
  return (
    <>
      <section
        className="conversation-thread"
        aria-labelledby="conversation-title"
      >
        <header className="conversation-thread-heading">
          <div>
            <Link
              className="conversation-back"
              href={explorationHref(nicheId, "/learn/conversations")}
            >
              <ArrowLeft aria-hidden="true" /> Conversations
            </Link>
            <p className="eyebrow">
              {humanize(revision.channel)} · {humanize(conversation.status)}
            </p>
            <h3 id="conversation-title">{participantName}</h3>
            {revision.summary && <p>{revision.summary}</p>}
          </div>
          <ConversationStateControls
            conversationId={conversation.id}
            status={conversation.status}
            observationMessages={debriefMessages}
          />
        </header>

        {conversation.historicalSummaryOnly ? (
          <div className="conversation-historical-summary" role="note">
            <FileText aria-hidden="true" />
            <div>
              <strong>This conversation was captured as a summary.</strong>
              <p>
                The original exchange was not recorded message by message, so
                Become does not invent a transcript.
              </p>
              {revision.notes && <blockquote>{revision.notes}</blockquote>}
            </div>
          </div>
        ) : currentMessages.length > 0 ? (
          <ol
            className="conversation-message-list"
            aria-label="Conversation messages"
          >
            {currentMessages.map((message) => {
              const current = message.revisions[0];
              if (!current) return null;
              return (
                <li
                  key={message.id}
                  data-speaker={current.speakerRole.toLowerCase()}
                >
                  <article>
                    <header>
                      <div>
                        <strong>{current.speakerNameSnapshot}</strong>
                        <span>
                          {current.speakerRole === "ME"
                            ? "Interviewer"
                            : "Participant"}
                        </span>
                      </div>
                      <div>
                        {message.bookmarkedAt && (
                          <Bookmark aria-label="Bookmarked" />
                        )}
                        <time dateTime={current.occurredAt.toISOString()}>
                          {businessDate(current.occurredAt)}
                        </time>
                        <ConversationMessageMenu
                          message={{
                            id: message.id,
                            version: message.version,
                            bookmarked: Boolean(message.bookmarkedAt),
                            speakerRole: current.speakerRole,
                            speakerName: current.speakerNameSnapshot,
                            body: current.body,
                            occurredAt: current.occurredAt.toISOString(),
                            channel: current.channel,
                            guideQuestionId: current.guideQuestionId,
                            hasObservation:
                              message.observationRevisions.length > 0,
                          }}
                        />
                      </div>
                    </header>
                    <p>{current.body}</p>
                    {message.observationRevisions.length > 0 && (
                      <div className="conversation-observation-links">
                        <NotebookPen aria-hidden="true" />
                        {message.observationRevisions.map((observation) => (
                          <Link
                            key={observation.id}
                            href={explorationHref(
                              nicheId,
                              `/learn/observations/${observation.observationId}`,
                            )}
                          >
                            Observation kept
                          </Link>
                        ))}
                      </div>
                    )}
                    {message.sourceOutdated && (
                      <p className="conversation-source-review" role="note">
                        This message changed after an observation was kept.
                        Review the linked observation before relying on it.
                      </p>
                    )}
                    {message.revisions.length > 1 && (
                      <details className="conversation-correction-history">
                        <summary>
                          {message.revisions.length - 1} earlier{" "}
                          {message.revisions.length === 2
                            ? "version"
                            : "versions"}
                        </summary>
                        {message.revisions.slice(1).map((earlier) => (
                          <div key={earlier.id}>
                            <p>{earlier.body}</p>
                            {earlier.correctionReason && (
                              <small>{earlier.correctionReason}</small>
                            )}
                          </div>
                        ))}
                      </details>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="conversation-thread-empty">
            <MessageSquareDashed aria-hidden="true" />
            <h3>The exchange starts with a message.</h3>
            <p>
              Choose the speaker every time. A participant’s words and your
              prompts remain visibly distinct.
            </p>
          </div>
        )}

        {!conversation.historicalSummaryOnly &&
          conversation.status !== "COMPLETED" &&
          conversation.status !== "CANCELLED" && (
            <ConversationComposer
              conversationId={conversation.id}
              participantName={participantName}
              defaultChannel={revision.channel}
            />
          )}
      </section>

      <ExplorationFieldNotes label="Conversation context">
        {conversation.interviewSession?.guideRevision && (
          <section className="exploration-field-note exploration-field-note--major">
            <p className="eyebrow">Pinned guide</p>
            <h3>{conversation.interviewSession.guideRevision.titleSnapshot}</h3>
            <p>
              Revision {conversation.interviewSession.guideRevision.version}{" "}
              stays attached to this exchange.
            </p>
            <Link
              href={explorationHref(
                nicheId,
                `/learn/conversations/${conversation.id}/conduct`,
              )}
            >
              Conduct with guide <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        )}
        {conversation.linkedReach?.revisions[0] && (
          <section className="exploration-field-note">
            <p className="eyebrow">Came from Reach</p>
            <h3>{humanize(conversation.linkedReach.revisions[0].kind)}</h3>
            <p>{conversation.linkedReach.revisions[0].summary}</p>
          </section>
        )}
        <section className="exploration-field-note">
          <p className="eyebrow">Observations</p>
          <h3>
            {conversation.conversationMessages.reduce(
              (sum, message) => sum + message.observationRevisions.length,
              0,
            )}{" "}
            kept from messages
          </h3>
          <p>
            Promotion is explicit. The originating message and exact revision
            remain traceable.
          </p>
        </section>
        {conversation.followUps.length > 0 && (
          <section className="exploration-field-note">
            <p className="eyebrow">Follow-up</p>
            {conversation.followUps.map((followUp) => (
              <p key={followUp.id}>
                <Clock3 aria-hidden="true" /> {followUp.title}
                {followUp.dueOn ? ` · ${businessDate(followUp.dueOn)}` : ""}
              </p>
            ))}
          </section>
        )}
      </ExplorationFieldNotes>
    </>
  );
}
