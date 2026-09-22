import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import {
  getExplorationDirectionEditor,
  getExplorationShell,
} from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { ExplorationProvider } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ExplorationNavigation } from "@/features/entrepreneurship/explorations/components/exploration-navigation.component";
import {
  ExplorationDirectionForm,
  ExplorationTimer,
} from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import { MarketForm } from "@/features/entrepreneurship/market/components/market-form.component";
import { MarketMenu } from "@/features/entrepreneurship/market/components/market-menu.component";
import { ExplorationHeader } from "@/features/entrepreneurship/explorations/components/exploration-header.component";
import { ExplorationDirectionSummary } from "@/features/entrepreneurship/explorations/components/exploration-forms.component";

async function ExplorationDirectionAction({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const niche = await getExplorationDirectionEditor(userId, nicheId);
  if (!niche || niche.archivedAt) return null;
  return (
    <ExplorationDirectionForm
      id={niche.id}
      direction={niche.direction}
      updatedAt={niche.updatedAt.toISOString()}
      marketFocus={niche.marketFocus}
      marketConclusion={niche.marketConclusion}
      sourceOptions={niche.sourceOptions}
      initialSourceKeys={niche.initialSourceKeys}
      conclusionScope={niche.decisions[0]?.conclusionScope}
    />
  );
}

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ nicheId: string }>;
  children: React.ReactNode;
}) {
  const [user, { nicheId }] = await Promise.all([getCurrentUser(), params]);
  if (!user) return null;
  const niche = await getExplorationShell(user.id, nicheId);
  if (!niche) notFound();
  return (
    <ExplorationProvider
      value={{
        id: niche.id,
        name: niche.name,
        archived: Boolean(niche.archivedAt),
      }}
    >
      <ExplorationHeader
        name={niche.name}
        scope={niche.scope}
        direction={niche.direction}
        archived={Boolean(niche.archivedAt)}
        audienceSummary={
          <ExplorationDirectionSummary
            marketFocus={niche.marketFocus}
            marketConclusion={niche.marketConclusion}
          />
        }
        actions={
          <>
            {!niche.archivedAt && (
              <>
                <ExplorationTimer nicheId={niche.id} />
                <Suspense
                  fallback={
                    <span className="exploration-header-action-loading">
                      Loading direction…
                    </span>
                  }
                >
                  <ExplorationDirectionAction
                    userId={user.id}
                    nicheId={niche.id}
                  />
                </Suspense>
              </>
            )}
            <MarketForm kind="niche" record={niche} />
            <MarketMenu
              kind="niche"
              id={niche.id}
              archived={Boolean(niche.archivedAt)}
            />
          </>
        }
      />
      {niche.archivedAt && (
        <p className="exploration-archived-note" role="note">
          This exploration is archived. Its journey and historical records are
          available as a read-only reference.
        </p>
      )}
      <div className="exploration-workspace">
        <ExplorationNavigation nicheId={niche.id} />
        <main className="exploration-workspace-main">{children}</main>
      </div>
    </ExplorationProvider>
  );
}
