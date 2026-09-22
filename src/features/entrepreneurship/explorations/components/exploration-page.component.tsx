import {
  getAudienceRecords,
  getAudienceDetail,
} from "@/features/entrepreneurship/audiences/queries/audience.query";
import { AudiencePage } from "@/features/entrepreneurship/audiences/components/audience-page.component";
import { AudienceDetail } from "@/features/entrepreneurship/audiences/components/audience-detail.component";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { EvidencePage } from "@/features/entrepreneurship/evidence/components/evidence-page.component";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { notFound, redirect } from "next/navigation";
import { MarketPage } from "@/features/entrepreneurship/market/components/market-page.component";
import { MarketDetail } from "@/features/entrepreneurship/market/components/market-detail.component";
import { ReachActivityDetail } from "@/features/entrepreneurship/reach/components/reach-activity-detail.component";
import { ProblemList } from "@/features/entrepreneurship/problems/components/problem-list.component";
import { ProblemDetail } from "@/features/entrepreneurship/problems/components/problem-detail.component";
import { OfferList } from "@/features/entrepreneurship/offers/components/offer-list.component";
import { OfferDetail } from "@/features/entrepreneurship/offers/components/offer-detail.component";
import { ObservationDetail } from "@/features/entrepreneurship/observations/components/observation-detail.component";
import { ExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot.component";
import { ExplorationSnapshotHistory } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-history.component";
import { ReachWorkspace } from "@/features/entrepreneurship/reach/components/reach-workspace.component";
import { LearnWorkspace } from "@/features/entrepreneurship/learn/components/learn-workspace.component";
import { LearnNavigation } from "@/features/entrepreneurship/learn/components/learn-navigation.component";
import { ConversationWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-workspace.component";
import { ConversationConductWorkspace } from "@/features/entrepreneurship/conversations/components/conversation-conduct-workspace.component";
import { InterviewGuideIndex } from "@/features/entrepreneurship/interview-guides/components/interview-guide-index.component";
import { InterviewGuideWorkspace } from "@/features/entrepreneurship/interview-guides/components/interview-guide-workspace.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { getInteractionDetail } from "@/features/entrepreneurship/interactions/queries/interaction.query";

export async function ExplorationPage({
  userId,
  nicheId,
  view = [],
  query,
}: {
  userId: string;
  nicheId: string;
  view?: string[];
  query: Record<string, string | string[] | undefined>;
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

  if (!section || section === "snapshot") {
    if (!subsection) return <ExplorationSnapshot {...common} />;
    if (subsection === "review")
      return <ExplorationSnapshot {...common} review />;
    if (subsection === "history")
      return <ExplorationSnapshotHistory {...common} />;
    notFound();
  }

  if (section === "scope" && !subsection) {
    const kind = value("kind") === "person" ? "person" : "segment";
    if (value("kind") === "business")
      return <MarketPage {...list} search={(value("q") ?? "").slice(0, 120)} />;
    const data = await getAudienceRecords(userId, {
      ...list,
      kind,
      search: value("q"),
    });
    return (
      <AudiencePage
        data={data}
        kind={kind}
        nicheId={nicheId}
        search={value("q")}
        archived={list.archived}
      />
    );
  }
  if (
    section === "scope" &&
    ["people", "segments"].includes(subsection ?? "") &&
    id
  ) {
    const kind = subsection === "people" ? "person" : "segment";
    const data = await getAudienceDetail(userId, kind, id, nicheId);
    if (!data) notFound();
    return <AudienceDetail data={data} kind={kind} nicheId={nicheId} />;
  }
  if (section === "scope" && subsection === "businesses")
    return id ? (
      <MarketDetail {...common} kind="companies" id={id} />
    ) : (
      <MarketPage {...list} search={(value("q") ?? "").slice(0, 120)} />
    );

  if (section === "reach") {
    if (subsection === "activity" && id)
      return <ReachActivityDetail {...common} activityId={id} />;
    if (!subsection) return <ReachWorkspace {...common} />;
    notFound();
  }

  if (section === "learn" && !subsection) return <LearnWorkspace {...common} />;
  if (section === "learn" && subsection === "conversations") {
    if (id && mode === "conduct")
      return <ConversationConductWorkspace {...common} conversationId={id} />;
    if (mode) notFound();
    return <ConversationWorkspace {...common} conversationId={id} />;
  }
  if (section === "learn" && subsection === "guides") {
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
  if (section === "learn" && subsection === "sources" && !id) {
    const filters = {
      nicheId,
      cursor: value("cursor"),
      sourceKind: value("sourceKind"),
      marketType: value("marketType"),
      segmentId: value("segmentId"),
      personId: value("personId"),
      companyId: value("companyId"),
    };
    const [data, options] = await Promise.all([
      getEvidenceJournal(userId, filters),
      getInteractionOptions(userId, nicheId),
    ]);
    return (
      <>
        <LearnNavigation nicheId={nicheId} active="sources" />
        <EvidencePage
          data={data}
          options={options}
          nicheId={nicheId}
          query={filters}
          mode="sources"
        />
      </>
    );
  }
  if (section === "learn" && subsection === "observations") {
    if (!id) {
      const filters = {
        nicheId,
        cursor: value("cursor"),
        sourceKind: value("sourceKind") ?? "OBSERVATION",
        marketType: value("marketType"),
        segmentId: value("segmentId"),
        personId: value("personId"),
        companyId: value("companyId"),
      };
      const [data, options] = await Promise.all([
        getEvidenceJournal(userId, filters),
        getInteractionOptions(userId, nicheId),
      ]);
      return (
        <>
          <LearnNavigation nicheId={nicheId} active="observations" />
          <EvidencePage
            data={data}
            options={options}
            nicheId={nicheId}
            query={filters}
            mode="observations"
          />
        </>
      );
    }
    return (
      <ObservationDetail
        userId={userId}
        id={id}
        nicheId={nicheId}
        revisionId={value("revision")}
      />
    );
  }

  if (section === "decide") {
    if (!subsection) return <ProblemList {...list} />;
    if (subsection === "problems" && id)
      return <ProblemDetail {...common} id={id} />;
    notFound();
  }

  if (section === "test") {
    if (!subsection) return <OfferList {...list} />;
    if (subsection === "offers" && id)
      return <OfferDetail {...common} id={id} />;
    notFound();
  }

  // Stable server redirects for bookmarks created before the journey refactor.
  const queryString = new URLSearchParams(
    Object.entries(query).flatMap(([key, raw]) =>
      typeof raw === "string" ? [[key, raw]] : [],
    ),
  ).toString();
  const withQuery = (href: string) =>
    `${href}${queryString ? `?${queryString}` : ""}`;
  if (section === "audience")
    redirect(withQuery(explorationHref(nicheId, "/scope")));
  if (section === "companies")
    redirect(
      withQuery(
        explorationHref(
          nicheId,
          `/scope/businesses${subsection ? `/${subsection}` : ""}`,
        ),
      ),
    );
  if (section === "segments" || section === "people")
    redirect(
      withQuery(
        explorationHref(
          nicheId,
          `/scope/${section}${subsection ? `/${subsection}` : ""}`,
        ),
      ),
    );
  if (section === "evidence")
    redirect(withQuery(explorationHref(nicheId, "/learn/sources")));
  if (section === "observations")
    redirect(
      withQuery(
        explorationHref(
          nicheId,
          `/learn/observations${subsection ? `/${subsection}` : ""}`,
        ),
      ),
    );
  if (section === "problems")
    redirect(
      withQuery(
        explorationHref(
          nicheId,
          `/decide${subsection ? `/problems/${subsection}` : ""}`,
        ),
      ),
    );
  if (section === "offers")
    redirect(
      withQuery(
        explorationHref(
          nicheId,
          `/test${subsection ? `/offers/${subsection}` : ""}`,
        ),
      ),
    );
  if (section === "interactions") {
    if (!subsection)
      redirect(withQuery(explorationHref(nicheId, "/learn/conversations")));
    const interaction = await getInteractionDetail(userId, subsection);
    if (!interaction || interaction.revisions[0]?.nicheId !== nicheId)
      notFound();
    const kind = interaction.revisions[0]?.kind;
    redirect(
      explorationHref(
        nicheId,
        ["OUTREACH_SENT", "REPLY_RECEIVED", "ATTEMPT_NO_CONTACT"].includes(kind)
          ? `/reach/activity/${subsection}`
          : `/learn/conversations/${subsection}`,
      ),
    );
  }
  notFound();
}
