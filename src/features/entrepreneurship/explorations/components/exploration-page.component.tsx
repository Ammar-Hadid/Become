import {
  getAudienceRecords,
  getAudienceDetail,
} from "@/features/entrepreneurship/audiences/queries/audience.query";
import { AudiencePage } from "@/features/entrepreneurship/audiences/components/audience-page.component";
import { AudienceDetail } from "@/features/entrepreneurship/audiences/components/audience-detail.component";
import { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { EvidencePage } from "@/features/entrepreneurship/evidence/components/evidence-page.component";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { notFound } from "next/navigation";
import { getExploration } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { ExplorationOverview } from "@/features/entrepreneurship/explorations/components/exploration-overview.component";
import { MarketPage } from "@/features/entrepreneurship/market/components/market-page.component";
import { MarketDetail } from "@/features/entrepreneurship/market/components/market-detail.component";
import { InteractionDetail } from "@/features/entrepreneurship/interactions/components/interaction-detail.component";
import { InteractionPage } from "@/features/entrepreneurship/interactions/components/interaction-page.component";
import { ProblemList } from "@/features/entrepreneurship/problems/components/problem-list.component";
import { ProblemDetail } from "@/features/entrepreneurship/problems/components/problem-detail.component";
import { OfferList } from "@/features/entrepreneurship/offers/components/offer-list.component";
import { OfferDetail } from "@/features/entrepreneurship/offers/components/offer-detail.component";
import { ObservationDetail } from "@/features/entrepreneurship/observations/components/observation-detail.component";

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
  if (!(await getExploration(userId, nicheId)) || view.length > 2) notFound();

  const [section, id] = view;

  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;

  const common = { userId, nicheId };

  const list = {
    ...common,
    cursor: value("cursor"),
    archived: value("archived") === "true",
  };

  if (!section) return <ExplorationOverview {...common} />;
  if (section === "audience" && !id) {
    const kind = value("kind") === "person" ? "person" : "segment";
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
  if ((section === "people" || section === "segments") && id) {
    const kind = section === "people" ? "person" : "segment";
    const data = await getAudienceDetail(userId, kind, id, nicheId);
    if (!data) notFound();
    return <AudienceDetail data={data} kind={kind} nicheId={nicheId} />;
  }
  if (section === "evidence" && !id) {
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
      <EvidencePage
        data={data}
        options={options}
        nicheId={nicheId}
        query={filters}
      />
    );
  }

  if (section === "companies")
    return id ? (
      <MarketDetail {...common} kind="companies" id={id} />
    ) : (
      <MarketPage {...list} search={(value("q") ?? "").slice(0, 120)} />
    );

  if (section === "interactions")
    return id ? (
      <InteractionDetail {...common} id={id} />
    ) : (
      <InteractionPage
        {...common}
        query={{
          kind: value("kind"),
          companyId: value("companyId"),
          cursor: value("cursor"),
        }}
      />
    );

  if (section === "problems")
    return id ? (
      <ProblemDetail {...common} id={id} />
    ) : (
      <ProblemList {...list} />
    );

  if (section === "offers")
    return id ? <OfferDetail {...common} id={id} /> : <OfferList {...list} />;

  if (section === "observations" && id)
    return (
      <ObservationDetail
        userId={userId}
        id={id}
        revisionId={value("revision")}
      />
    );
  notFound();
}
