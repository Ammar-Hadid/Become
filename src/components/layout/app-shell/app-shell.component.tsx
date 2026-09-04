"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock3, Home, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
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
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  domains: DomainOption[];
  activeSession: ActiveSessionData | null;
  engineeringProjects: EngineeringProjectOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function closeProfileMenu(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("mousedown", closeProfileMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  async function signOut() {
    setProfileMenuOpen(false);
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
                    (domain.slug === "engineering" &&
                      pathname.startsWith("/engineering/"))) &&
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
        <div className="profile-row" ref={profileMenuRef}>
          <button
            type="button"
            className="profile-trigger"
            data-testid="user-identity"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
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
          {profileMenuOpen && (
            <div className="profile-menu" role="menu" aria-label="Account">
              <button
                type="button"
                className="profile-menu-action"
                onClick={signOut}
                role="menuitem"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
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
