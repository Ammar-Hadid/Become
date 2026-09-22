"use client";

import type { FinanceWorkOptions } from "@/features/finance/sessions/types/finance-session.types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Clock3,
  Compass,
  Home,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { Fragment, useRef, useState, ViewTransition } from "react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { getDomainHref } from "@/features/domains/identity/utils/domain.util";
import type { EngineeringProjectOption } from "@/features/engineering/types/engineering.types";
import { EXPLORATION_WORKSPACES } from "@/features/entrepreneurship/explorations/constants/exploration-workspace.constants";
import {
  explorationRouteState,
  explorationWorkspaceHref,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { ActiveTimerProvider } from "@/features/sessions/timer/components/active-timer-provider.component";
import { SessionDetailsProvider } from "@/features/sessions/details/components/session-details-provider.component";
import { TimerController } from "@/features/sessions/timer/components/timer-controller.component";
import { TimerTrigger } from "@/features/sessions/timer/components/timer-trigger.component";
import type {
  TimerSnapshot,
  DomainOption,
} from "@/features/sessions/types/session.types";
import { authClient } from "@/lib/auth/config/auth-client.config";
import { cn } from "@/lib/styles/utils/class-name.util";

export function AppShell({
  children,
  user,
  domains,
  timerSnapshot,
  engineeringProjects,
  financeOptions,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  domains: DomainOption[];
  timerSnapshot: TimerSnapshot;
  engineeringProjects: EngineeringProjectOption[];
  financeOptions: FinanceWorkOptions;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationPresence = usePresence(mobileOpen);
  const explorationRoute = explorationRouteState(pathname);

  useModalLayer({
    open: mobileOpen,
    containerRef: mobileDrawerRef,
    initialFocusRef: mobileCloseRef,
    returnFocusRef: mobileTriggerRef,
    onClose: () => setMobileOpen(false),
  });

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const renderNavigation = (indicatorName: string) => (
    <>
      <nav
        className="app-shell-primary-navigation"
        aria-label="Primary navigation"
      >
        <div className="nav-section" data-testid="nav-section-overview">
          <p className="nav-label">Overview</p>
          <Link
            className={cn("nav-link", pathname === "/" && "active")}
            href="/"
            onClick={() => setMobileOpen(false)}
          >
            {pathname === "/" && (
              <ViewTransition
                name={indicatorName}
                share="motion-guide"
                default="none"
              >
                <span className="nav-link-indicator" aria-hidden="true" />
              </ViewTransition>
            )}
            <Home /> Home
          </Link>
          <Link
            className={cn(
              "nav-link",
              pathname.startsWith("/direction") && "active",
            )}
            href="/direction"
            onClick={() => setMobileOpen(false)}
          >
            {pathname.startsWith("/direction") && (
              <ViewTransition
                name={indicatorName}
                share="motion-guide"
                default="none"
              >
                <span className="nav-link-indicator" aria-hidden="true" />
              </ViewTransition>
            )}
            <Compass /> Direction
          </Link>
          <Link
            className={cn(
              "nav-link",
              pathname.startsWith("/reviews") && "active",
            )}
            href="/reviews"
            onClick={() => setMobileOpen(false)}
          >
            {pathname.startsWith("/reviews") && (
              <ViewTransition
                name={indicatorName}
                share="motion-guide"
                default="none"
              >
                <span className="nav-link-indicator" aria-hidden="true" />
              </ViewTransition>
            )}
            <BookOpen /> Reviews
          </Link>
          <Link
            className={cn("nav-link", pathname === "/sessions" && "active")}
            href="/sessions"
            onClick={() => setMobileOpen(false)}
          >
            {pathname === "/sessions" && (
              <ViewTransition
                name={indicatorName}
                share="motion-guide"
                default="none"
              >
                <span className="nav-link-indicator" aria-hidden="true" />
              </ViewTransition>
            )}
            <Clock3 /> Sessions
          </Link>
        </div>
        <div className="nav-section" data-testid="nav-section-domains">
          <p className="nav-label">Domains</p>
          {domains.map((domain) => {
            const href = getDomainHref(domain.slug);
            const current =
              pathname === href || pathname.startsWith(`${href}/`);
            const showsExplorationWorkspaces =
              domain.slug === "entrepreneurship" && Boolean(explorationRoute);
            return (
              <Fragment key={domain.id}>
                <Link
                  className={cn(
                    "nav-link",
                    current && "active",
                    showsExplorationWorkspaces && "nav-link--workspace-parent",
                  )}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                >
                  {current && !showsExplorationWorkspaces && (
                    <ViewTransition
                      name={indicatorName}
                      share="motion-guide"
                      default="none"
                    >
                      <span className="nav-link-indicator" aria-hidden="true" />
                    </ViewTransition>
                  )}
                  <DomainIcon slug={domain.slug} /> {domain.name}
                </Link>
                {showsExplorationWorkspaces && explorationRoute && (
                  <nav
                    className="nav-domain-workspaces"
                    aria-label="Exploration workspaces"
                  >
                    {EXPLORATION_WORKSPACES.map((workspace, index) => {
                      const active =
                        explorationRoute.workspace === workspace.slug;
                      return (
                        <Link
                          key={workspace.slug}
                          className={cn(
                            "nav-sub-link",
                            active && "active",
                            index === 2 && "nav-sub-link--group-start",
                          )}
                          href={explorationWorkspaceHref(
                            explorationRoute.nicheId,
                            workspace.slug,
                          )}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                        >
                          {active && (
                            <ViewTransition
                              name={indicatorName}
                              share="motion-guide"
                              default="none"
                            >
                              <span
                                className="nav-sub-link-indicator"
                                aria-hidden="true"
                              />
                            </ViewTransition>
                          )}
                          {workspace.label}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </Fragment>
            );
          })}
        </div>
      </nav>
      <div className="app-shell-account border-border pt-xl border-t">
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
    <ActiveTimerProvider timerSnapshot={timerSnapshot}>
      <div className="bg-background text-text-primary min-h-screen">
        <aside className="sidebar hidden lg:flex">
          <div className="app-shell-brand">
            <BrandMark />
          </div>
          {renderNavigation("primary-navigation-indicator-desktop")}
          <div className="app-shell-timer mt-xl">
            <TimerTrigger />
          </div>
        </aside>

        <header className="mobile-header lg:hidden">
          <BrandMark />
          <button
            ref={mobileTriggerRef}
            className="icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {mobileNavigationPresence.isPresent && (
          <div
            className="mobile-navigation-layer fixed inset-0 z-50 bg-black/60 lg:hidden"
            data-state={mobileNavigationPresence.presenceState}
            aria-hidden={!mobileOpen}
            inert={mobileNavigationPresence.isExiting}
            onAnimationEnd={mobileNavigationPresence.onPresenceAnimationEnd}
            onMouseDown={() => setMobileOpen(false)}
          >
            <aside
              ref={mobileDrawerRef}
              className="mobile-drawer"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mobile-drawer-header flex items-center justify-between">
                <BrandMark />
                <button
                  ref={mobileCloseRef}
                  className="icon-button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              {renderNavigation("primary-navigation-indicator-mobile")}
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
            {pathname === "/" && (
              <ViewTransition
                name="quick-navigation-indicator"
                share="motion-guide"
                default="none"
              >
                <span className="mobile-bottom-nav-indicator" aria-hidden />
              </ViewTransition>
            )}
            <Home />
            <span>Home</span>
          </Link>
          <div className="mobile-timer-slot">
            <TimerTrigger compact />
          </div>
          <Link
            href="/direction"
            className={cn(pathname.startsWith("/direction") && "active")}
          >
            {pathname.startsWith("/direction") && (
              <ViewTransition
                name="quick-navigation-indicator"
                share="motion-guide"
                default="none"
              >
                <span className="mobile-bottom-nav-indicator" aria-hidden />
              </ViewTransition>
            )}
            <Compass />
            <span>Direction</span>
          </Link>
        </nav>
      </div>
    </ActiveTimerProvider>
  );
}
