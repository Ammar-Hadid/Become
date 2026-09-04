import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell.component";
import { ensureDefaultDomains } from "@/features/domains/ensure-default-domains.service";
import { getAppSessionData } from "@/features/sessions/session.query";
import { getCurrentUser } from "@/lib/auth/current-user.query";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureDefaultDomains(user.id);
  const appData = await getAppSessionData(user.id);
  return (
    <AppShell
      user={user}
      domains={appData.domains}
      activeSession={appData.activeSession}
    >
      {children}
    </AppShell>
  );
}
