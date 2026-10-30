import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import { CotsPresentationProvider } from "@/features/seasons/presentation/components/cots-presentation-provider.component";
import { getSeasonLoadingSnapshot } from "@/features/seasons/presentation/queries/season-loading.query";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell/app-shell.component";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { getEngineeringProjectOptions } from "@/features/engineering/queries/engineering.query";
import { getAppSessionData } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { seasonCalendar } from "@/features/seasons/utils/season-calendar.util";

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
      timerSnapshot={appData.timerSnapshot}
      engineeringProjects={engineeringProjects}
      seasonDaysLeft={
        seasonCalendar(seasonLoading.year, seasonLoading.quarter).daysAfterToday
      }
    >
      <CotsPresentationProvider
        userId={user.id}
        year={seasonLoading.year}
        quarter={seasonLoading.quarter}
        initialMedia={seasonLoading.media}
      >
        {children}
      </CotsPresentationProvider>
    </AppShell>
  );
}
