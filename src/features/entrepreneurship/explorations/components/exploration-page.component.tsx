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
