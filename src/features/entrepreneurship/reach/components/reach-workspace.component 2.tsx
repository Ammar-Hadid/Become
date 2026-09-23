import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Mail,
  MessageSquareText,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getReachWorkspace } from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { BatchOutreachForm } from "@/features/entrepreneurship/interactions/components/batch-outreach-form.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

export async function ReachWorkspace({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const [workspace, options] = await Promise.all([
    getReachWorkspace(userId, nicheId),
    getInteractionOptions(userId, nicheId),
  ]);
  if (!workspace) return null;
  const targets = [
    ...workspace.targets.people.map((target) => ({
      id: target.id,
      kind: "Person",
      name: target.name,
      detail: target.email ?? "No contact detail recorded",
      latest: target.latestActivity,
      icon: UserRound,
    })),
    ...workspace.targets.companies.map((target) => ({
      id: target.id,
      kind: "Business",
      name: target.name,
      detail: target.website ?? "No website recorded",
      latest: target.latestActivity,
      icon: Building2,
    })),
  ];

  return (
    <div className="exploration-stage exploration-reach">
      <header className="exploration-stage-heading">
        <div>
          <h2>Turn a useful target into a real exchange.</h2>
          <p>
            Outreach, replies and no-contact attempts stay operational here.
            Only an actual conversation moves into Learn.
          </p>
        </div>
        {!workspace.niche.archivedAt && (
          <div className="business-actions">
            <InteractionForm
              {...options}
              initialKind="OUTREACH_SENT"
              allowedKinds={[
                "OUTREACH_SENT",
                "REPLY_RECEIVED",
                "ATTEMPT_NO_CONTACT",
              ]}
              captureObservations={false}
              lockExploration={nicheId}
              createdHrefPrefix={explorationHref(nicheId, "/reach/activity")}
              triggerLabel="Record outreach"
            />
            <BatchOutreachForm
              companies={options.companies}
              people={options.people}
              segments={options.segments}
            />
          </div>
        )}
      </header>

      <section
        className="exploration-reach-queue"
        aria-labelledby="reach-queue-title"
      >
        <header>
          <div>
            <p className="eyebrow">Operational queue</p>
            <h3 id="reach-queue-title">Who deserves the next attempt?</h3>
          </div>
          <span>{targets.length} current targets</span>
        </header>
        {targets.length > 0 ? (
          <div className="exploration-ledger">
            {targets.map((target) => {
              const revision = target.latest?.revisions[0];
              const Icon = target.icon;
              return (
                <div
                  className="exploration-ledger-row"
                  key={`${target.kind}-${target.id}`}
                >
                  <Icon aria-hidden="true" />
                  <div className="exploration-ledger-primary">
                    <span>{target.kind}</span>
                    <strong>{target.name}</strong>
                    <small>{target.detail}</small>
                  </div>
                  <div className="exploration-ledger-secondary">
                    {revision ? (
                      <>
                        <span>{humanize(revision.kind)}</span>
                        <time dateTime={revision.occurredAt.toISOString()}>
                          {businessDate(revision.occurredAt)}
                        </time>
                      </>
                    ) : (
                      <span>Not contacted yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="exploration-stage-empty">
            <UsersRound aria-hidden="true" />
            <div>
              <h3>No reach targets yet.</h3>
              <p>
                Add a person or business in Scope before recording outreach.
              </p>
            </div>
            <Link
              className="business-text-link"
              href={explorationHref(nicheId, "/scope")}
            >
              Add a target <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <div className="exploration-stage-columns">
        <section className="exploration-stage-section">
          <header>
            <div>
              <p className="eyebrow">Due and open</p>
              <h3>Follow-ups</h3>
            </div>
            <CalendarClock aria-hidden="true" />
          </header>
          {workspace.followUps.length > 0 ? (
            <ol className="exploration-timeline">
              {workspace.followUps.map((followUp) => {
                const source = followUp.interaction?.revisions[0];
                return (
                  <li key={followUp.id}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{followUp.title}</strong>
                      <p>{source?.summary ?? "Related outreach"}</p>
                    </div>
                    {followUp.dueOn && (
                      <time dateTime={followUp.dueOn.toISOString()}>
                        {businessDate(followUp.dueOn)}
                      </time>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="exploration-inline-empty">
              Nothing is waiting for a follow-up.
            </p>
          )}
        </section>

        <section className="exploration-stage-section">
          <header>
            <div>
              <p className="eyebrow">What happened</p>
              <h3>Contact activity</h3>
            </div>
            <Send aria-hidden="true" />
          </header>
          {workspace.activity.length > 0 ? (
            <ol className="exploration-timeline">
              {workspace.activity.map((activity) => {
                const revision = activity.revisions[0];
                return (
                  <li key={activity.id}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{humanize(revision.kind)}</strong>
                      <p>{revision.summary}</p>
                      <small>{humanize(revision.channel)}</small>
                    </div>
                    <div className="exploration-timeline-action">
                      <time dateTime={revision.occurredAt.toISOString()}>
                        {businessDate(revision.occurredAt)}
                      </time>
                      {activity.conversation ? (
                        <Link
                          href={explorationHref(
                            nicheId,
                            `/learn/conversations/${activity.conversation.conversationId}`,
                          )}
                        >
                          <MessageSquareText aria-hidden="true" /> Open
                          conversation
                        </Link>
                      ) : revision.kind === "REPLY_RECEIVED" ? (
                        <Link
                          href={`${explorationHref(nicheId, "/learn/conversations")}?linkedInteractionId=${encodeURIComponent(activity.id)}`}
                        >
                          <Mail aria-hidden="true" /> Start conversation
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="exploration-inline-empty">
              No outreach activity has been recorded.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
