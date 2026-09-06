"use client";

import type { FinanceWorkOptions } from "@/features/finance/sessions/types/finance-session.types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock3, Home, LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getDomainHref } from "@/features/domains/identity/utils/domain.util";
import type { EngineeringProjectOption } from "@/features/engineering/types/engineering.types";
import { ActiveTimerProvider } from "@/features/sessions/timer/components/active-timer-provider.component";
import { SessionDetailsProvider } from "@/features/sessions/details/components/session-details-provider.component";
import {
  TimerController,
  TimerTrigger,
} from "@/features/sessions/timer/components/timer-controller.component";
import type {
  ActiveSessionData,
  DomainOption,
} from "@/features/sessions/types/session.types";
import { authClient } from "@/lib/auth/config/auth-client.config";
import { cn } from "@/lib/styles/utils/class-name.util";

export function AppShell({
  children,
  user,
  domains,
  activeSession,
  engineeringProjects,
  financeOptions,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  domains: DomainOption[];
  activeSession: ActiveSessionData | null;
  engineeringProjects: EngineeringProjectOption[];
  financeOptions: FinanceWorkOptions;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const navigation = (
    <>
      <nav className="mt-4xl flex-1" aria-label="Primary navigation">
        <div className="nav-section" data-testid="nav-section-overview">
          <p className="nav-label">Overview</p>
          <Link
            className={cn("nav-link", pathname === "/" && "active")}
            href="/"
            onClick={() => setMobileOpen(false)}
          >
            <Home /> Home
          </Link>
          <Link
            className={cn("nav-link", pathname === "/sessions" && "active")}
            href="/sessions"
            onClick={() => setMobileOpen(false)}
          >
            <Clock3 /> Sessions
          </Link>
        </div>
        <div className="nav-section" data-testid="nav-section-domains">
          <p className="nav-label">Domains</p>
          {domains.map((domain) => {
            const href = getDomainHref(domain.slug);
            return (
              <Link
                key={domain.id}
                className={cn(
                  "nav-link",
                  (pathname === href ||
                    (["engineering", "finance"].includes(domain.slug) &&
                      pathname.startsWith(`${href}/`))) &&
                    "active",
                )}
                href={href}
                onClick={() => setMobileOpen(false)}
              >
                <DomainIcon slug={domain.slug} /> {domain.name}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="border-border pt-xl border-t">
        <SubMenu
          label="Account"
          placement="top-stretch"
          className="profile-row"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="profile-trigger"
              data-testid="user-identity"
            >
              <span className="avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="text-text-primary text-body block truncate font-medium">
                  {user.name}
                </span>
                <span className="profile-email text-text-muted block truncate">
                  {user.email}
                </span>
              </span>
            </button>
          )}
        >
          <MenuItem
            href="/settings"
            icon={<Settings />}
            onSelect={() => setMobileOpen(false)}
          >
            Settings
          </MenuItem>
          <MenuItem icon={<LogOut />} label="Sign out" onSelect={signOut}>
            Sign out
          </MenuItem>
        </SubMenu>
      </div>
    </>
  );

  return (
    <ActiveTimerProvider activeSession={activeSession}>
      <div className="bg-background text-text-primary min-h-screen">
        <aside className="sidebar hidden lg:flex">
          <BrandMark />
          {navigation}
          <div className="mt-xl">
            <TimerTrigger />
          </div>
        </aside>

        <header className="mobile-header lg:hidden">
          <BrandMark />
          <button
            className="icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            onMouseDown={() => setMobileOpen(false)}
          >
            <aside
              className="mobile-drawer"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <BrandMark />
                <button
                  className="icon-button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              {navigation}
            </aside>
          </div>
        )}

        <SessionDetailsProvider>
          <main className="lg:ml-shell-sidebar min-h-screen pb-24 lg:pb-0">
            {children}
          </main>
        </SessionDetailsProvider>

        <TimerController
          financeOptions={financeOptions}
          domains={domains}
          engineeringProjects={engineeringProjects}
        />

        <nav
          className="mobile-bottom-nav lg:hidden"
          aria-label="Quick navigation"
          data-testid="mobile-bottom-nav"
        >
          <Link href="/" className={cn(pathname === "/" && "active")}>
            <Home />
            <span>Home</span>
          </Link>
          <div className="mobile-timer-slot">
            <TimerTrigger compact />
          </div>
          <Link
            href="/sessions"
            className={cn(pathname === "/sessions" && "active")}
          >
            <Clock3 />
            <span>Sessions</span>
          </Link>
        </nav>
      </div>
    </ActiveTimerProvider>
  );
}
