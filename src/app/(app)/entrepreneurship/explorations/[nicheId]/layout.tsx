import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getExploration } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { ExplorationProvider } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ExplorationNavigation } from "@/features/entrepreneurship/explorations/components/exploration-navigation.component";
import {
  ExplorationDirectionForm,
  ExplorationTimer,
} from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import { MarketForm } from "@/features/entrepreneurship/market/components/market-form.component";
import { MarketMenu } from "@/features/entrepreneurship/market/components/market-menu.component";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ nicheId: string }>;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { nicheId } = await params;
  const niche = await getExploration(user.id, nicheId);
  if (!niche) notFound();
  return (
    <ExplorationProvider
      value={{
        id: niche.id,
        name: niche.name,
        archived: Boolean(niche.archivedAt),
      }}
    >
      <div className="business-row-heading">
        <Link href="/entrepreneurship" className="business-back">
          ← Explorations
        </Link>
        <Link href="/entrepreneurship/history" className="business-text-link">
          Global history ↗
        </Link>
      </div>
      <header className="business-masthead exploration-masthead">
        <div>
          <p className="eyebrow">
            {niche.archivedAt
              ? "Archived exploration"
              : humanize(niche.direction)}
          </p>
          <h1>{niche.name}</h1>
          <p className="exploration-scope">
            {niche.scope || "A market to get to know."}
          </p>
        </div>
        <div className="business-actions">
          {!niche.archivedAt && (
            <>
              <ExplorationTimer nicheId={niche.id} />
              <ExplorationDirectionForm
                id={niche.id}
                direction={niche.direction}
                updatedAt={niche.updatedAt.toISOString()}
              />
            </>
          )}
          <MarketForm kind="niche" record={niche} />
          <MarketMenu
            kind="niche"
            id={niche.id}
            archived={Boolean(niche.archivedAt)}
          />
        </div>
      </header>
      {!niche.archivedAt && ["PAUSED", "STOPPED"].includes(niche.direction) && (
        <p className="business-hint mb-xl">
          This exploration is {niche.direction.toLowerCase()}. Its history is
          here whenever you need it. Resume when you’re ready to continue.
        </p>
      )}
      <ExplorationNavigation nicheId={niche.id} />
      {children}
    </ExplorationProvider>
  );
}
