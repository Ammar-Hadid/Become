import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock3,
  FileText,
  MessageSquareDashed,
  NotebookPen,
  Search,
} from "lucide-react";
import {
  getConversationPage,
  getConversationWorkspace,
} from "@/features/entrepreneurship/conversations/queries/conversation.query";
import { getInterviewGuideOptions } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { BusinessBackLink } from "@/features/entrepreneurship/explorations/components/business-back-link.component";
import { searchBusinessRecords } from "@/features/entrepreneurship/shared/queries/business-record-search.query";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { ConversationStartForm } from "@/features/entrepreneurship/conversations/components/conversation-start-form.component";
import { ConversationComposer } from "@/features/entrepreneurship/conversations/components/conversation-composer.component";
import { ConversationMessageMenu } from "@/features/entrepreneurship/conversations/components/conversation-message-menu.component";
import { ConversationStateControls } from "@/features/entrepreneurship/conversations/components/conversation-state-controls.component";

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

function conversationStatus(status: string, interviewSession: boolean) {
  return status === "CANCELLED" && interviewSession
    ? "Paused"
    : humanize(status);
}

function conversationsHref(
  nicheId: string,
  query: Record<string, string | undefined> = {},
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value) search.set(key, value);
  const suffix = search.toString();
  return `${explorationWorkspaceHref(nicheId, "conversations")}${suffix ? `?${suffix}` : ""}`;
}

export async function ConversationWorkspace({
  userId,
  nicheId,
  conversationId,
  initialLinkedInteractionId,
  query,
  status,
  cursor,
  before,
  history = false,
  message,
  fullDetail = false,
  returnTo,
}: {
  userId: string;
  nicheId: string;
  conversationId?: string;
  initialLinkedInteractionId?: string;
  query?: string;
  status?: string;
  cursor?: string;
  before?: string;
  history?: boolean;
  message?: string;
  fullDetail?: boolean;
  returnTo?: string;
}) {
  const beforePosition = Number(before);
  const [page, guides, reachRecords, conversation] = await Promise.all([
    getConversationPage(userId, nicheId, { q: query, status, cursor }),
    getInterviewGuideOptions(userId, nicheId),
    searchBusinessRecords(userId, {
      kind: "interaction",
      nicheId,
      interactionKinds: ["OUTREACH_SENT", "REPLY_RECEIVED"],
      selectedIds: initialLinkedInteractionId
        ? [initialLinkedInteractionId]
        : [],
    }),
    conversationId
      ? getConversationWorkspace(userId, conversationId, nicheId, {
          before: Number.isSafeInteger(beforePosition)
            ? beforePosition
            : undefined,
          history,
          message,
        })
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
    <div className="direct-workspace conversation-page">
      <header className="workspace-heading conversation-page-heading">
        <div>
          <p className="eyebrow">Conversations</p>
          <h2>Keep the exchange intact.</h2>
          <p>Review the words, context, and observations in one place.</p>
        </div>
        <div className="business-actions">
          <Link
            className="finance-dialog-trigger finance-dialog-trigger--secondary"
            href={explorationWorkspaceHref(nicheId, "conversations", "/guides")}
          >
            Interview guides
          </Link>
          <ConversationStartForm
            nicheId={nicheId}
            guides={guideOptions}
            reachRecords={reachRecords.items}
            initialLinkedInteractionId={initialLinkedInteractionId}
          />
        </div>
      </header>

      <form className="workspace-toolbar conversation-toolbar">
        <label className="workspace-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search conversations</span>
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search people, businesses, or summaries"
          />
        </label>
        <label className="workspace-filter">
          <span className="sr-only">Conversation status</span>
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <button className="workspace-filter-button" type="submit">
          Filter
        </button>
        {(query || status) && (
          <Link
            className="business-text-link"
            href={explorationWorkspaceHref(nicheId, "conversations")}
          >
            Clear
          </Link>
        )}
        <span className="workspace-toolbar-count">{page.total} total</span>
      </form>

      <div
        className="conversation-workspace"
        data-empty={!conversation || undefined}
      >
        <aside className="conversation-index" aria-label="Conversations">
          <header>
            <span>{page.items.length} shown</span>
          </header>
          {page.items.length > 0 ? (
            <ol>
              {page.items.map((item) => {
                const revision = item.revisions[0];
                const latest = item.conversationMessages[0]?.revisions[0];
                const active = item.id === conversationId;
                return (
                  <li key={item.id}>
                    <Link
                      scroll={false}
                      href={conversationsHref(nicheId, {
                        selected: item.id,
                        q: query,
                        status,
                        cursor,
                      })}
                      aria-current={active ? "page" : undefined}
                    >
                      <div>
                        <strong>{participant(revision)}</strong>
                        <span data-status={item.status.toLowerCase()}>
                          {conversationStatus(
                            item.status,
                            Boolean(item.interviewSession),
                          )}
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
              <p>No conversations match these filters.</p>
            </div>
          )}
          {page.next && (
            <Link
              className="conversation-index-more"
              href={conversationsHref(nicheId, {
                cursor: page.next,
                q: query,
                status,
              })}
            >
              More conversations <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </aside>

        {conversation ? (
          <ConversationDetail
            nicheId={nicheId}
            conversation={conversation}
            fullDetail={fullDetail}
            showHistory={history}
            requestedMessageId={message}
            returnTo={
              returnTo ??
              (fullDetail
                ? undefined
                : conversationsHref(nicheId, {
                    selected: conversation.id,
                    q: query,
                    status,
                    cursor,
                  }))
            }
          />
        ) : (
          <section className="conversation-welcome">
            <MessageSquareDashed aria-hidden="true" />
            <h3>Open a conversation.</h3>
            <p>
              Choose an exchange to inspect the thread without leaving the list.
            </p>
            {page.items[0] && (
              <Link
                scroll={false}
                href={conversationsHref(nicheId, {
                  selected: page.items[0].id,
                  q: query,
                  status,
                  cursor,
                })}
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
  fullDetail,
  showHistory,
  requestedMessageId,
  returnTo,
}: {
  nicheId: string;
  conversation: NonNullable<
    Awaited<ReturnType<typeof getConversationWorkspace>>
  >;
  fullDetail: boolean;
  showHistory: boolean;
  requestedMessageId?: string;
  returnTo?: string;
}) {
  const revision = conversation.revisions[0];
  const participantName = participant(revision);
  const currentMessages = conversation.conversationMessages.filter(
    (entry) => !entry.voidedAt,
  );
  const detailHref = explorationWorkspaceHref(
    nicheId,
    "conversations",
    `/${conversation.id}`,
  );
  const fullDetailHref = returnTo
    ? withExplorationReturn(detailHref, returnTo)
    : detailHref;

  return (
    <>
      <section
        className="conversation-thread"
        aria-labelledby="conversation-title"
      >
        <header className="conversation-thread-heading">
          <div>
            {fullDetail && (
              <BusinessBackLink
                className="conversation-back"
                returnTo={returnTo}
                fallbackHref={explorationWorkspaceHref(
                  nicheId,
                  "conversations",
                )}
              >
                <ArrowLeft aria-hidden="true" /> Conversations
              </BusinessBackLink>
            )}
            <p className="eyebrow">
              {humanize(revision.channel)}
              {revision.platform
                ? ` · ${humanize(revision.platform)}`
                : ""} ·{" "}
              {conversationStatus(
                conversation.status,
                Boolean(conversation.interviewSession),
              )}
            </p>
            <h3 id="conversation-title">{participantName}</h3>
            {revision.summary && <p>{revision.summary}</p>}
          </div>
          <div className="conversation-heading-actions">
            {!fullDetail && (
              <Link className="business-text-link" href={fullDetailHref}>
                Open full record <ArrowRight aria-hidden="true" />
              </Link>
            )}
            <ConversationStateControls
              conversationId={conversation.id}
              status={conversation.status}
              observationMessages={conversation.debriefMessages}
              observationMessagesNext={conversation.debriefNext}
              observationMessagesTotal={conversation.debriefTotal}
            />
          </div>
        </header>

        {conversation.historicalSummaryOnly ? (
          <div className="conversation-historical-summary" role="note">
            <FileText aria-hidden="true" />
            <div>
              <strong>Captured as a summary.</strong>
              <p>The original exchange was not recorded message by message.</p>
              {revision.notes && <blockquote>{revision.notes}</blockquote>}
            </div>
          </div>
        ) : currentMessages.length > 0 ? (
          <>
            {conversation.hasEarlier && conversation.earlierCursor !== null && (
              <Link
                className="conversation-load-earlier"
                href={`${detailHref}?${new URLSearchParams({
                  before: String(conversation.earlierCursor),
                  ...(showHistory ? { history: "true" } : {}),
                  ...(returnTo ? { returnTo } : {}),
                })}`}
              >
                Load earlier messages
              </Link>
            )}
            <ol
              className="conversation-message-list"
              aria-label="Conversation messages"
            >
              {currentMessages.map((entry) => {
                const current = entry.revisions[0];
                if (!current) return null;
                const speakerRole =
                  current.speakerRole === "ME" ? "Interviewer" : "Participant";
                const showSpeakerRole = !current.speakerNameSnapshot
                  .toLocaleLowerCase()
                  .includes(speakerRole.toLocaleLowerCase());
                return (
                  <li
                    key={entry.id}
                    id={`message-${entry.id}`}
                    data-speaker={current.speakerRole.toLowerCase()}
                    data-requested={
                      entry.id === requestedMessageId || undefined
                    }
                  >
                    <article>
                      <header>
                        <div>
                          <strong>{current.speakerNameSnapshot}</strong>
                          {showSpeakerRole && <span>{speakerRole}</span>}
                        </div>
                        <div>
                          {entry.bookmarkedAt && (
                            <Bookmark aria-label="Bookmarked" />
                          )}
                          <time dateTime={current.occurredAt.toISOString()}>
                            {businessDate(current.occurredAt)}
                          </time>
                          <ConversationMessageMenu
                            message={{
                              id: entry.id,
                              version: entry.version,
                              bookmarked: Boolean(entry.bookmarkedAt),
                              speakerRole: current.speakerRole,
                              speakerName: current.speakerNameSnapshot,
                              body: current.body,
                              occurredAt: current.occurredAt.toISOString(),
                              channel: current.channel,
                              platform: current.platform,
                              guideQuestionId: current.guideQuestionId,
                              hasObservation:
                                entry.observationRevisions.length > 0,
                            }}
                          />
                        </div>
                      </header>
                      <p>{current.body}</p>
                      {entry.observationRevisions.length > 0 && (
                        <div className="conversation-observation-links">
                          <NotebookPen aria-hidden="true" />
                          {entry.observationRevisions.map((observation) => (
                            <Link
                              key={observation.id}
                              href={explorationWorkspaceHref(
                                nicheId,
                                "evidence",
                                `/observations/${observation.observationId}`,
                              )}
                            >
                              Observation kept
                            </Link>
                          ))}
                        </div>
                      )}
                      {entry.sourceOutdated && (
                        <p className="conversation-source-review" role="note">
                          This message changed after an observation was kept.
                        </p>
                      )}
                      {showHistory && entry.revisions.length > 1 && (
                        <details className="conversation-correction-history">
                          <summary>
                            {entry.revisions.length - 1} earlier{" "}
                            {entry.revisions.length === 2
                              ? "version"
                              : "versions"}
                          </summary>
                          {entry.revisions.slice(1).map((earlier) => (
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
          </>
        ) : (
          <div className="conversation-thread-empty">
            <MessageSquareDashed aria-hidden="true" />
            <h3>The exchange starts with a message.</h3>
            <p>
              Choose the speaker each time so the transcript stays reliable.
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
              defaultPlatform={revision.platform}
            />
          )}
      </section>

      <aside className="conversation-context" aria-label="Conversation context">
        <header>
          <span>Context</span>
          <Link
            href={`${detailHref}?${new URLSearchParams({
              ...(showHistory ? {} : { history: "true" }),
              ...(returnTo ? { returnTo } : {}),
            })}`}
            className="business-text-link"
          >
            {showHistory ? "Current only" : "Revision history"}
          </Link>
        </header>
        {conversation.interviewSession?.guideRevision && (
          <section>
            <p className="eyebrow">Pinned guide</p>
            <h3>{conversation.interviewSession.guideRevision.titleSnapshot}</h3>
            <p>
              Revision {conversation.interviewSession.guideRevision.version}
            </p>
            <Link
              href={explorationWorkspaceHref(
                nicheId,
                "conversations",
                `/${conversation.id}/conduct`,
              )}
            >
              Conduct with guide <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        )}
        {conversation.linkedReach?.revisions[0] && (
          <section>
            <p className="eyebrow">From outreach</p>
            <h3>{humanize(conversation.linkedReach.revisions[0].kind)}</h3>
            <p>{conversation.linkedReach.revisions[0].summary}</p>
            <Link
              href={explorationWorkspaceHref(
                nicheId,
                "outreach",
                `/${conversation.linkedReach.id}`,
              )}
            >
              Open activity <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        )}
        <section>
          <p className="eyebrow">Messages</p>
          <h3>{conversation.totalMessages} in this exchange</h3>
          <p>
            {conversation.conversationMessages.reduce(
              (sum, entry) => sum + entry.observationRevisions.length,
              0,
            )}{" "}
            observations kept from this page.
          </p>
        </section>
        {conversation.followUps.length > 0 && (
          <section>
            <p className="eyebrow">Follow-up</p>
            {conversation.followUps.map((followUp) => (
              <p key={followUp.id}>
                <Clock3 aria-hidden="true" /> {followUp.title}
                {followUp.dueOn ? ` · ${businessDate(followUp.dueOn)}` : ""}
              </p>
            ))}
          </section>
        )}
      </aside>
    </>
  );
}
