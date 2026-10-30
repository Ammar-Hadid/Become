"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { FinanceWorkOptions } from "@/features/finance/sessions/types/finance-session.types";
import { AppHeader } from "@/components/layout/header/app-header.component";
import { DesktopAreaNavigation } from "@/components/layout/navigation/desktop-area-navigation.component";
import { ActiveTimerProvider } from "@/features/sessions/timer/components/active-timer-provider.component";
import { SessionDetailsProvider } from "@/features/sessions/details/components/session-details-provider.component";
import { TimerController } from "@/features/sessions/timer/components/timer-controller.component";
import { InterfaceSoundProvider } from "@/components/ui/sound/components/interface-sound-provider.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { soundForAreaChange } from "./area-sound.util";
import type {
  TimerSnapshot,
  DomainOption,
} from "@/features/sessions/types/session.types";
import type { EngineeringProjectOption } from "@/features/engineering/types/engineering.types";

function AppShellContent({
  children,
  user,
  domains,
  timerSnapshot,
  engineeringProjects,
  financeOptions,
  seasonDaysLeft,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  domains: DomainOption[];
  timerSnapshot: TimerSnapshot;
  engineeringProjects: EngineeringProjectOption[];
  financeOptions: FinanceWorkOptions;
  seasonDaysLeft: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { play } = useInterfaceSound();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const event = soundForAreaChange(previousPath.current, pathname);
    previousPath.current = pathname;
    if (event) play(event);
  }, [pathname, play]);

  return (
    <ActiveTimerProvider timerSnapshot={timerSnapshot}>
      <div className="app-shell">
        <AppHeader user={user} daysLeft={seasonDaysLeft} />
        <DesktopAreaNavigation
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
        />
        <SessionDetailsProvider>
          <main className="app-shell-main" data-dashboard={pathname === "/"}>
            {children}
          </main>
        </SessionDetailsProvider>
        <TimerController
          financeOptions={financeOptions}
          domains={domains}
          engineeringProjects={engineeringProjects}
        />
      </div>
    </ActiveTimerProvider>
  );
}

export function AppShell(props: Parameters<typeof AppShellContent>[0]) {
  return (
    <InterfaceSoundProvider>
      <AppShellContent {...props} />
    </InterfaceSoundProvider>
  );
}
