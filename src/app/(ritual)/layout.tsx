import { redirect } from "next/navigation";
import { CotsImportController } from "@/features/seasons/discovery/components/cots-import-controller.component";
import { CotsPresentationProvider } from "@/features/seasons/presentation/components/cots-presentation-provider.component";
import { getSeasonLoadingSnapshot } from "@/features/seasons/presentation/queries/season-loading.query";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export default async function RitualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureDefaultDomains(user.id);
  const seasonLoading = await getSeasonLoadingSnapshot(user.id);

  return (
    <CotsPresentationProvider
      userId={user.id}
      year={seasonLoading.year}
      quarter={seasonLoading.quarter}
      initialMedia={seasonLoading.media}
    >
      <CotsImportController />
      {children}
    </CotsPresentationProvider>
  );
}
