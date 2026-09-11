import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import { CotsImportController } from "@/features/seasons/discovery/components/cots-import-controller.component";
import { CotsPresentationProvider } from "@/features/seasons/presentation/components/cots-presentation-provider.component";
import { getSeasonLoadingSnapshot } from "@/features/seasons/presentation/queries/season-loading.query";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell/app-shell.component";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { getEngineeringProjectOptions } from "@/features/engineering/queries/engineering.query";
import { getAppSessionData } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureDefaultDomains(user.id);
  const [appData, engineeringProjects, financeOptions, seasonLoading] =
    await Promise.all([
      getAppSessionData(user.id),
      getEngineeringProjectOptions(user.id),
      getFinanceWorkOptions(user.id),
      getSeasonLoadingSnapshot(user.id),
    ]);
  return (
    <AppShell
      financeOptions={financeOptions}
      user={user}
      domains={appData.domains}
      activeSession={appData.activeSession}
      engineeringProjects={engineeringProjects}
    >
      <CotsPresentationProvider
        userId={user.id}
        year={seasonLoading.year}
        quarter={seasonLoading.quarter}
        initialMedia={seasonLoading.media}
      >
        <CotsImportController />
        {children}
      </CotsPresentationProvider>
    </AppShell>
  );
}
