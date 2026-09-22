import { notFound } from "next/navigation";
import Link from "next/link";
import { Bookmark, MessageSquareDashed, NotebookPen } from "lucide-react";
import { getConversationWorkspace } from "@/features/entrepreneurship/conversations/queries/conversation.query";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { ConductGuidePane } from "@/features/entrepreneurship/conversations/components/conduct-guide-pane.component";
import { ConversationComposer } from "@/features/entrepreneurship/conversations/components/conversation-composer.component";
import { ConversationMessageMenu } from "@/features/entrepreneurship/conversations/components/conversation-message-menu.component";
import { ConversationStateControls } from "@/features/entrepreneurship/conversations/components/conversation-state-controls.component";
import type { InterviewGuideQuestionIndexItem } from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";

function questionIndex(value: unknown): InterviewGuideQuestionIndexItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.questionId !== "string" || typeof row.prompt !== "string")
      return [];
    return [
      {
        questionId: row.questionId,
        prompt: row.prompt,
        intent: typeof row.intent === "string" ? row.intent : null,
        probes: Array.isArray(row.probes) ? row.probes.map(String) : [],
        position: typeof row.position === "number" ? row.position : index,
      },
    ];
  });
}

export async function ConversationConductWorkspace({
  userId,
  nicheId,
  conversationId,
}: {
  userId: string;
  nicheId: string;
  conversationId: string;
}) {
  const conversation = await getConversationWorkspace(
    userId,
    conversationId,
    nicheId,
  );
  if (!conversation) notFound();
  const revision = conversation.revisions[0];
  const session = conversation.interviewSession;
  const guide = session?.guideRevision;
  if (!session || !guide) notFound();
  const questions = questionIndex(guide.questionIndex);
  const skipped = Array.isArray(session.skippedQuestionIds)
    ? session.skippedQuestionIds.map(String)
    : [];
  const participantName =
    revision.personSnapshot ??
    revision.companySnapshot ??
    revision.audienceLabel ??
    "Participant";
  const messages = conversation.conversationMessages.filter(
    (message) => !message.voidedAt,
  );
  const debriefMessages = messages
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
    <div className="conduct-workspace">
      <ConductGuidePane
        conversationId={conversation.id}
        guideTitle={guide.titleSnapshot}
        guideVersion={guide.version}
        questions={questions}
        currentQuestionId={session.currentQuestionId}
        skippedQuestionIds={skipped}
        guideCompleted={Boolean(session.guideCompletedAt)}
      />
      <section className="conduct-conversation" aria-labelledby="conduct-title">
        <header>
          <div>
            <Link
              href={explorationHref(
                nicheId,
                `/learn/conversations/${conversation.id}`,
              )}
            >
              ← Conversation workspace
            </Link>
            <p className="eyebrow">
              Guided interview · {humanize(conversation.status)}
            </p>
            <h1 id="conduct-title">{participantName}</h1>
          </div>
          <ConversationStateControls
            conversationId={conversation.id}
            status={conversation.status}
            observationMessages={debriefMessages}
          />
        </header>
        {messages.length > 0 ? (
          <ol
            className="conversation-message-list"
            aria-label="Interview messages"
          >
            {messages.map((message) => {
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
                    {current.guideQuestionId && (
                      <small className="conduct-question-link">
                        From guide question
                      </small>
                    )}
                    {message.observationRevisions.length > 0 && (
                      <div className="conversation-observation-links">
                        <NotebookPen aria-hidden="true" /> Observation kept
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="conversation-thread-empty">
            <MessageSquareDashed aria-hidden="true" />
            <h3>Begin with the guide or a free-form prompt.</h3>
            <p>
              Ask records your prompt, then focus returns to the participant
              response.
            </p>
          </div>
        )}
        {conversation.status !== "COMPLETED" &&
          conversation.status !== "CANCELLED" && (
            <ConversationComposer
              conversationId={conversation.id}
              participantName={participantName}
              defaultChannel={revision.channel}
            />
          )}
      </section>
    </div>
  );
}
