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
  const [appData, engineeringProjects] = await Promise.all([
    getAppSessionData(user.id),
    getEngineeringProjectOptions(user.id),
  ]);
  return (
    <AppShell
      user={user}
      domains={appData.domains}
      activeSession={appData.activeSession}
      engineeringProjects={engineeringProjects}
    >
      {children}
    </AppShell>
  );
}
