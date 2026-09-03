"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock3, Home, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/layout/brand-mark.component";
import { DomainIcon } from "@/features/domains/components/domain-icon.component";
import { ActiveTimerProvider } from "@/features/sessions/components/active-timer-provider.component";
import {
  TimerController,
  TimerTrigger,
} from "@/features/sessions/components/timer-controller.component";
import type {
  ActiveSessionData,
  DomainOption,
} from "@/features/sessions/session.types";
import { authClient } from "@/lib/auth/auth-client.config";
import { cn } from "@/lib/class-name.util";

export function AppShell({
  children,
  user,
  domains,
  activeSession,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  domains: DomainOption[];
  activeSession: ActiveSessionData | null;
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
      <nav className="mt-10 flex-1" aria-label="Primary navigation">
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
          {domains.map((domain) => (
            <Link
              key={domain.id}
              className={cn(
                "nav-link",
                pathname === `/domains/${domain.slug}` && "active",
              )}
              href={`/domains/${domain.slug}`}
              onClick={() => setMobileOpen(false)}
            >
              <DomainIcon slug={domain.slug} /> {domain.name}
            </Link>
          ))}
        </div>
      </nav>
      <div className="border-t border-[var(--border)] pt-5">
        <div className="profile-row">
          <div className="profile-identity" data-testid="user-identity">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                {user.name}
              </span>
              <span className="profile-email block truncate text-[var(--text-muted)]">
                {user.email}
              </span>
            </span>
          </div>
          <button
            className="profile-sign-out"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <ActiveTimerProvider activeSession={activeSession}>
      <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <aside className="sidebar hidden lg:flex">
          <BrandMark />
          {navigation}
          <div className="mt-5">
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

        <main className="min-h-screen pb-24 lg:ml-[248px] lg:pb-0">
          {children}
        </main>

        <TimerController domains={domains} />

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
