import { notFound, redirect } from "next/navigation";
import {
  getAudienceDetail,
  getAudienceRecords,
} from "@/features/entrepreneurship/audiences/queries/audience.query";
import { AudienceDetail } from "@/features/entrepreneurship/audiences/components/audience-detail.component";
import { AudiencePage } from "@/features/entrepreneurship/audiences/components/audience-page.component";
import { ConversationConductWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-conduct-workspace.component";
import { ConversationWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-workspace.component";
import { EvidencePage } from "@/features/entrepreneurship/evidence/components/evidence-page.component";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { ExplorationSnapshotHistory } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-history.component";
import { ExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot.component";
import { ExplorationOverview } from "@/features/entrepreneurship/explorations/components/exploration-overview.component";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  getInteractionDetail,
  getInteractionOptions,
} from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InterviewGuideIndex } from "@/features/entrepreneurship/interview-guides/components/interview-guide-index.component";
import { InterviewGuideWorkspace } from "@/features/entrepreneurship/interview-guides/components/interview-guide-workspace.component";
import { MarketDetail } from "@/features/entrepreneurship/market/components/market-detail.component";
import { MarketPage } from "@/features/entrepreneurship/market/components/market-page.component";
import { ObservationDetail } from "@/features/entrepreneurship/observations/components/observation-detail.component";
import { OfferDetail } from "@/features/entrepreneurship/offers/components/offer-detail.component";
import { OfferList } from "@/features/entrepreneurship/offers/components/offer-list.component";
import { ProblemDetail } from "@/features/entrepreneurship/problems/components/problem-detail.component";
import { ProblemList } from "@/features/entrepreneurship/problems/components/problem-list.component";
import { ReachActivityDetail } from "@/features/entrepreneurship/reach/components/reach-activity-detail.component";
import { ReachWorkspace } from "@/features/entrepreneurship/reach/components/reach-workspace.component";

type Query = Record<string, string | string[] | undefined>;

function queryString(query: Query) {
  const result = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (typeof raw === "string") result.set(key, raw);
  }
  const value = result.toString();
  return value ? `?${value}` : "";
}

export async function ExplorationPage({
  userId,
  nicheId,
  view = [],
  query,
}: {
  userId: string;
  nicheId: string;
  view?: string[];
  query: Query;
}) {
  if (view.length > 4) notFound();
  const [section, subsection, id, mode] = view;
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const common = { userId, nicheId };
  const list = {
    ...common,
    cursor: value("cursor"),
    archived: value("archived") === "true",
  };

  if (!section) redirect(explorationWorkspaceHref(nicheId, "overview"));

  if (section === "overview" && !subsection)
    return <ExplorationOverview {...common} />;

  if (section === "so-far-we-know") {
    if (!subsection) return <ExplorationSnapshot {...common} />;
    if (subsection === "review" && !id)
      return <ExplorationSnapshot {...common} review />;
    if (subsection === "history" && !id)
      return <ExplorationSnapshotHistory {...common} />;
    if (subsection === "problems" && !id) return <ProblemList {...list} />;
    if (subsection === "problems" && id)
      return <ProblemDetail {...common} id={id} />;
    notFound();
  }

  if (section === "audience") {
    if (["people", "segments"].includes(subsection ?? "") && id) {
      const kind = subsection === "people" ? "person" : "segment";
      const data = await getAudienceDetail(userId, kind, id, nicheId);
      if (!data) notFound();
      return (
        <AudienceDetail
          data={data}
          kind={kind}
          nicheId={nicheId}
          returnTo={value("returnTo")}
        />
      );
    }
    if (subsection === "businesses" && id)
      return (
        <MarketDetail
          {...common}
          kind="companies"
          id={id}
          returnTo={value("returnTo")}
        />
      );
    if (subsection) notFound();

    const kind =
      value("kind") === "person"
        ? "person"
        : value("kind") === "business"
          ? "business"
          : "segment";
    if (kind === "business")
      return (
        <MarketPage
          {...list}
          search={(value("q") ?? "").slice(0, 120)}
          selectedId={value("selected")}
        />
      );
    const data = await getAudienceRecords(userId, {
      ...list,
      kind,
      search: value("q"),
    });
    const selectedId = value("selected");
    const selected = selectedId
      ? await getAudienceDetail(userId, kind, selectedId, nicheId)
      : null;
    return (
      <AudiencePage
        data={data}
        kind={kind}
        nicheId={nicheId}
        search={value("q")}
        archived={list.archived}
        selected={selected}
        cursor={list.cursor}
      />
    );
  }

  if (section === "outreach") {
    if (subsection === "activity" && id)
      return (
        <ReachActivityDetail
          {...common}
          activityId={id}
          returnTo={value("returnTo")}
        />
      );
    if (subsection && !id)
      return (
        <ReachActivityDetail
          {...common}
          activityId={subsection}
          returnTo={value("returnTo")}
        />
      );
    if (subsection) notFound();
    return (
      <ReachWorkspace
        {...common}
        query={value("q")}
        cursor={value("cursor")}
        kind={value("kind")}
        view={value("view") === "follow-ups" ? "follow-ups" : "activity"}
        selectedId={value("selected")}
      />
    );
  }

  if (section === "conversations") {
    if (subsection === "guides") {
      if (!id) return <InterviewGuideIndex {...common} />;
      if (mode === "edit" || mode === "preview")
        return (
          <InterviewGuideWorkspace
            {...common}
            guideId={id}
            preview={mode === "preview"}
          />
        );
      notFound();
    }
    if (subsection && id === "conduct" && !mode)
      return (
        <ConversationConductWorkspace {...common} conversationId={subsection} />
      );
    if (mode) notFound();
    return (
      <ConversationWorkspace
        {...common}
        conversationId={subsection ?? value("selected")}
        initialLinkedInteractionId={value("linkedInteractionId")}
        fullDetail={Boolean(subsection)}
        query={value("q")}
        status={value("status")}
        cursor={value("cursor")}
        before={value("before")}
        history={value("history") === "true"}
        message={value("message")}
        returnTo={value("returnTo")}
      />
    );
  }

  if (section === "evidence") {
    if (subsection === "observations" && id)
      return (
        <ObservationDetail
          {...common}
          id={id}
          revisionId={value("revision")}
          returnTo={value("returnTo")}
        />
      );
    if (subsection) notFound();
    const filters = {
      nicheId,
      cursor: value("cursor"),
      sourceKind: value("sourceKind"),
      marketType: value("marketType"),
      segmentId: value("segmentId"),
      personId: value("personId"),
      companyId: value("companyId"),
      q: value("q"),
      expandedInteractionId:
        value("expandedInteractionId") ?? value("selected"),
    };
    const [data, options] = await Promise.all([
      getEvidenceJournal(userId, filters),
      getInteractionOptions(userId, nicheId),
    ]);
    return (
      <EvidencePage
        data={data}
        options={options}
        nicheId={nicheId}
        query={filters}
      />
    );
  }

  if (section === "offers") {
    if (subsection)
      return (
        <OfferDetail {...common} id={subsection} returnTo={value("returnTo")} />
      );
    return (
      <OfferList
        {...list}
        selectedId={value("selected")}
        query={value("q")}
        mode={
          value("mode") === "SPECIFIC" || value("mode") === "AUDIENCE_TEST"
            ? (value("mode") as "SPECIFIC" | "AUDIENCE_TEST")
            : undefined
        }
      />
    );
  }

  const suffix = queryString(query);
  if (section === "companies")
    redirect(
      subsection
        ? `${explorationWorkspaceHref(nicheId, "audience", `/businesses/${subsection}`)}${suffix}`
        : `${explorationWorkspaceHref(nicheId, "audience")}${queryString({ ...query, kind: "business" })}`,
    );
  if (section === "segments")
    redirect(
      `${explorationWorkspaceHref(nicheId, "audience", subsection ? `/segments/${subsection}` : "")}${suffix}`,
    );
  if (section === "people")
    redirect(
      subsection
        ? `${explorationWorkspaceHref(nicheId, "audience", `/people/${subsection}`)}${suffix}`
        : `${explorationWorkspaceHref(nicheId, "audience")}${queryString({ ...query, kind: "person" })}`,
    );
  if (section === "observations")
    redirect(
      subsection
        ? `${explorationWorkspaceHref(nicheId, "evidence", `/observations/${subsection}`)}${suffix}`
        : `${explorationWorkspaceHref(nicheId, "evidence")}${queryString({ ...query, sourceKind: "OBSERVATION" })}`,
    );
  if (section === "problems")
    redirect(
      `${explorationWorkspaceHref(nicheId, "so-far-we-know", subsection ? `/problems/${subsection}` : "/problems")}${suffix}`,
    );
  if (section === "interactions") {
    if (!subsection)
      redirect(
        `${explorationWorkspaceHref(nicheId, "conversations")}${suffix}`,
      );
    const interaction = await getInteractionDetail(userId, subsection);
    if (!interaction || interaction.revisions[0]?.nicheId !== nicheId)
      notFound();
    const interactionKind = interaction.revisions[0]?.kind;
    redirect(
      `${explorationWorkspaceHref(
        nicheId,
        ["OUTREACH_SENT", "REPLY_RECEIVED", "ATTEMPT_NO_CONTACT"].includes(
          interactionKind,
        )
          ? "outreach"
          : "conversations",
        `/${subsection}`,
      )}${suffix}`,
    );
  }
  if (section === "snapshot")
    redirect(
      `${explorationWorkspaceHref(nicheId, "so-far-we-know", subsection ? `/${subsection}` : "")}${suffix}`,
    );
  if (section === "scope") {
    if (subsection === "businesses")
      redirect(
        id
          ? `${explorationWorkspaceHref(nicheId, "audience", `/businesses/${id}`)}${suffix}`
          : `${explorationWorkspaceHref(nicheId, "audience")}${queryString({ ...query, kind: "business" })}`,
      );
    const next = subsection ? `/${subsection}${id ? `/${id}` : ""}` : "";
    redirect(`${explorationWorkspaceHref(nicheId, "audience", next)}${suffix}`);
  }
  if (section === "reach")
    redirect(
      `${explorationWorkspaceHref(nicheId, "outreach", subsection === "activity" && id ? `/${id}` : subsection ? `/${subsection}${id ? `/${id}` : ""}` : "")}${suffix}`,
    );
  if (section === "learn") {
    if (subsection === "conversations" || subsection === "guides") {
      const next = `${subsection === "guides" ? "/guides" : ""}${id ? `/${id}` : ""}${mode ? `/${mode}` : ""}`;
      redirect(
        `${explorationWorkspaceHref(nicheId, "conversations", next)}${suffix}`,
      );
    }
    if (
      !subsection ||
      subsection === "sources" ||
      subsection === "observations"
    )
      redirect(
        subsection === "observations" && id
          ? `${explorationWorkspaceHref(nicheId, "evidence", `/observations/${id}`)}${suffix}`
          : `${explorationWorkspaceHref(nicheId, "evidence")}${queryString({
              ...query,
              ...(subsection === "observations"
                ? { sourceKind: "OBSERVATION" }
                : {}),
            })}`,
      );
  }
  if (section === "decide")
    redirect(
      `${explorationWorkspaceHref(nicheId, "so-far-we-know", id ? `/problems/${id}` : "/problems")}${suffix}`,
    );
  if (section === "test")
    redirect(
      `${explorationWorkspaceHref(nicheId, "offers", id || subsection ? `/${id ?? subsection}` : "")}${suffix}`,
    );
  notFound();
}
