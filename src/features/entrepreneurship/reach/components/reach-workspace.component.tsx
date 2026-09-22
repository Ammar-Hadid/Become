import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Mail,
  MessageSquareText,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import {
  getReachActivityDetail,
  getReachWorkspace,
} from "@/features/entrepreneurship/reach/queries/reach-workspace.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { BatchOutreachForm } from "@/features/entrepreneurship/interactions/components/batch-outreach-form.component";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { FollowUpRecord } from "@/features/entrepreneurship/follow-ups/components/follow-up.component";

export async function ReachWorkspace({
  userId,
  nicheId,
  query,
  cursor,
  kind,
  view = "activity",
  selectedId,
}: {
  userId: string;
  nicheId: string;
  query?: string;
  cursor?: string;
  kind?: string;
  view?: "activity" | "follow-ups";
  selectedId?: string;
}) {
  const [workspace, options, selected] = await Promise.all([
    getReachWorkspace(userId, nicheId, {
      q: query,
      cursor,
      kind,
      view,
    }),
    getInteractionOptions(userId, nicheId),
    selectedId
      ? getReachActivityDetail(userId, nicheId, selectedId)
      : Promise.resolve(null),
  ]);
  if (!workspace) return null;
  const base = explorationWorkspaceHref(nicheId, "outreach");
  const params = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(kind ? { kind } : {}),
    ...(view === "follow-ups" ? { view } : {}),
    ...(cursor ? { cursor } : {}),
  });
  const hrefWith = (next: Record<string, string | undefined>) => {
    const value = new URLSearchParams(params);
    for (const [key, item] of Object.entries(next)) {
      if (item) value.set(key, item);
      else value.delete(key);
    }
    const suffix = value.toString();
    return `${base}${suffix ? `?${suffix}` : ""}`;
  };
  const targets = [
    ...workspace.targets.people.map((target) => ({
      id: target.id,
      kind: "Person",
      name: target.name,
      detail: target.email ?? "No contact detail",
      latest: target.latestActivity,
      icon: UserRound,
    })),
    ...workspace.targets.companies.map((target) => ({
      id: target.id,
      kind: "Business",
      name: target.name,
      detail: target.website ?? "No website",
      latest: target.latestActivity,
      icon: Building2,
    })),
  ];

  return (
    <div className="direct-workspace outreach-workspace">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Outreach</p>
          <h2>Move the next exchange forward.</h2>
          <p>Targets, replies and follow-ups in one working queue.</p>
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
              createdHrefPrefix={explorationWorkspaceHref(nicheId, "outreach")}
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

      <div className="workspace-toolbar">
        <form action={base} className="workspace-search">
          {view === "follow-ups" && (
            <input type="hidden" name="view" value="follow-ups" />
          )}
          <Search aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search targets and activity"
            aria-label="Search outreach"
          />
        </form>
        <nav className="workspace-view-switcher" aria-label="Outreach view">
          <Link
            href={hrefWith({ view: undefined, cursor: undefined })}
            aria-current={view === "activity" ? "page" : undefined}
          >
            Activity <span>{workspace.total}</span>
          </Link>
          <Link
            href={hrefWith({ view: "follow-ups", cursor: undefined })}
            aria-current={view === "follow-ups" ? "page" : undefined}
          >
            Follow-ups <span>{workspace.followUpTotal}</span>
          </Link>
        </nav>
      </div>

      <div
        className="outreach-layout"
        data-detail={selected ? "open" : undefined}
        data-targets={targets.length > 0 ? "present" : undefined}
      >
        <section className="workspace-collection outreach-queue">
          <header className="workspace-collection-heading">
            <div>
              <p className="eyebrow">
                {view === "activity" ? "Latest contact" : "Due and open"}
              </p>
              <h3>{view === "activity" ? "Contact activity" : "Follow-ups"}</h3>
            </div>
            {view === "activity" && targets.length === 0 ? (
              <Link
                className="workspace-inline-action"
                href={explorationWorkspaceHref(nicheId, "audience")}
              >
                Manage audience <ArrowRight aria-hidden="true" />
              </Link>
            ) : view === "activity" ? (
              <Send aria-hidden="true" />
            ) : (
              <CalendarClock aria-hidden="true" />
            )}
          </header>
          {view === "activity" ? (
            workspace.activity.length ? (
              <div className="workspace-record-list">
                {workspace.activity.map((activity) => {
                  const revision = activity.revisions[0];
                  return (
                    <article
                      className="workspace-record-row"
                      data-selected={selectedId === activity.id || undefined}
                      key={activity.id}
                    >
                      <Link
                        className="workspace-record-main"
                        scroll={false}
                        href={hrefWith({ selected: activity.id })}
                      >
                        <span className="workspace-record-kicker">
                          {humanize(revision.kind)} ·{" "}
                          {humanize(revision.channel)} ·{" "}
                          {businessDate(revision.occurredAt)}
                        </span>
                        <strong>{revision.summary}</strong>
                      </Link>
                      <Link
                        className="workspace-record-open"
                        href={withExplorationReturn(
                          explorationWorkspaceHref(
                            nicheId,
                            "outreach",
                            `/${activity.id}`,
                          ),
                          hrefWith({ selected: activity.id }),
                        )}
                        aria-label="Open outreach record"
                      >
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="workspace-empty-line">No outreach activity yet.</p>
            )
          ) : workspace.followUps.length ? (
            <div className="workspace-record-list">
              {workspace.followUps.map((followUp) => {
                const source = followUp.interaction?.revisions[0];
                const sourceHref = followUp.interactionId
                  ? explorationWorkspaceHref(
                      nicheId,
                      "outreach",
                      `/${followUp.interactionId}`,
                    )
                  : followUp.offerId
                    ? explorationWorkspaceHref(
                        nicheId,
                        "offers",
                        `/${followUp.offerId}`,
                      )
                    : followUp.companyId
                      ? explorationWorkspaceHref(
                          nicheId,
                          "audience",
                          `/businesses/${followUp.companyId}`,
                        )
                      : null;
                const sourceLabel =
                  source?.summary ??
                  followUp.offer?.revisions[0]?.title ??
                  followUp.company?.name ??
                  "Related record";
                return (
                  <div
                    className="outreach-follow-up"
                    key={followUp.id}
                    data-follow-up-id={followUp.id}
                  >
                    <FollowUpRecord record={followUp} />
                    {sourceHref && (
                      <Link
                        className="workspace-inline-action"
                        href={withExplorationReturn(sourceHref, hrefWith({}))}
                      >
                        {sourceLabel} <ArrowUpRight aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="workspace-empty-line">
              Nothing is waiting for follow-up.
            </p>
          )}
          {((view === "activity" && workspace.next) ||
            (view === "follow-ups" && workspace.followUpNext)) && (
            <Link
              className="workspace-pagination"
              href={hrefWith({
                cursor:
                  view === "activity"
                    ? (workspace.next ?? undefined)
                    : (workspace.followUpNext ?? undefined),
              })}
            >
              More {view === "activity" ? "activity" : "follow-ups"}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </section>

        {selected ? (
          <aside className="workspace-inspector outreach-inspector">
            <header className="workspace-inspector-heading">
              <div>
                <p className="eyebrow">
                  {humanize(selected.revisions[0].kind)}
                </p>
                <h3>{selected.revisions[0].summary}</h3>
              </div>
              <Link
                className="business-icon-button"
                href={hrefWith({ selected: undefined })}
                scroll={false}
                aria-label="Close details"
              >
                <X aria-hidden="true" />
              </Link>
            </header>
            <div className="workspace-inspector-body">
              <p>{selected.revisions[0].notes || "No additional notes."}</p>
              <dl className="workspace-inspector-facts">
                <div>
                  <dt>Channel</dt>
                  <dd>{humanize(selected.revisions[0].channel)}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{businessDate(selected.revisions[0].occurredAt)}</dd>
                </div>
              </dl>
              {selected.conversation ? (
                <Link
                  className="workspace-inline-action"
                  href={explorationWorkspaceHref(
                    nicheId,
                    "conversations",
                    `/${selected.conversation.conversationId}`,
                  )}
                >
                  <MessageSquareText aria-hidden="true" /> Open conversation
                </Link>
              ) : selected.revisions[0].kind === "REPLY_RECEIVED" ? (
                <Link
                  className="workspace-inline-action"
                  href={`${explorationWorkspaceHref(nicheId, "conversations")}?linkedInteractionId=${encodeURIComponent(selected.id)}`}
                >
                  <Mail aria-hidden="true" /> Start conversation
                </Link>
              ) : null}
            </div>
            <Link
              className="workspace-inspector-primary"
              href={withExplorationReturn(
                explorationWorkspaceHref(
                  nicheId,
                  "outreach",
                  `/${selected.id}`,
                ),
                hrefWith({ selected: selected.id }),
              )}
            >
              Open full record <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        ) : targets.length > 0 ? (
          <aside className="outreach-targets">
            <header className="workspace-collection-heading">
              <div>
                <p className="eyebrow">Reach next</p>
                <h3>Targets</h3>
              </div>
              <span>{targets.length}</span>
            </header>
            <div className="outreach-target-list">
              {targets.slice(0, 12).map((target) => {
                const Icon = target.icon;
                const revision = target.latest?.revisions[0];
                return (
                  <article key={`${target.kind}-${target.id}`}>
                    <Icon aria-hidden="true" />
                    <div>
                      <strong>{target.name}</strong>
                      <small>{target.detail}</small>
                    </div>
                    <span>
                      {revision ? businessDate(revision.occurredAt) : "New"}
                    </span>
                  </article>
                );
              })}
            </div>
            <Link
              className="workspace-inline-action"
              href={explorationWorkspaceHref(nicheId, "audience")}
            >
              Manage audience <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
