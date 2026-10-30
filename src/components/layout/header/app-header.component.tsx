"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Clock3,
  LogOut,
  Menu,
  Pause,
  Play,
  Settings2,
  Square,
  X,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { AREA_NAVIGATION } from "@/components/layout/navigation/constants/area-navigation.config";
import { Button } from "@/components/ui/buttons/button.component";
import { AreaIcon } from "@/components/ui/icons/area-icon.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import { formatDuration } from "@/lib/dates/utils/period.util";

const sampleNotifications = [
  {
    id: "focus",
    title: "Focus summary",
    detail: "A completed session will appear here.",
  },
  {
    id: "season",
    title: "Season update",
    detail: "Progress and milestones will appear here.",
  },
  {
    id: "review",
    title: "Review reminder",
    detail: "Items needing a decision will appear here.",
  },
] as const;

function Notifications({ mobile = false }: { mobile?: boolean }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  return (
    <SubMenu
      label="Notifications"
      placement={mobile ? "top-stretch" : "bottom-end"}
      className={
        mobile ? "app-mobile-nav-notifications" : "app-header-notifications"
      }
      menuClassName="app-header-notification-menu"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          className={
            mobile
              ? "app-header-action app-mobile-nav-bell"
              : "app-header-action"
          }
          title="Notifications"
        >
          <IconFrame>
            <Bell />
          </IconFrame>
        </button>
      )}
    >
      <div className="app-header-notification-heading">
        <span className="type-label">Notifications</span>
        <span className="type-system">SAMPLE / PREVIEW</span>
      </div>
      {sampleNotifications.map((item) => (
        <MenuItem
          key={item.id}
          className="app-header-notification-item"
          onSelect={() =>
            setReadIds((current) =>
              current.includes(item.id) ? current : [...current, item.id],
            )
          }
        >
          <span
            className="app-header-notification-indicator"
            data-read={readIds.includes(item.id)}
            aria-hidden="true"
          />
          <span className="app-header-notification-copy">
            <span className="type-label">{item.title}</span>
            <span className="type-caption">{item.detail}</span>
          </span>
        </MenuItem>
      ))}
      <p className="type-caption app-header-notification-footnote">
        Example content until notifications are connected.
      </p>
    </SubMenu>
  );
}

function FocusControls() {
  const {
    activeSession,
    elapsedSeconds,
    pauseSession,
    resumeSession,
    pendingOperation,
    recoveryRequired,
    reconcileTimer,
  } = useActiveTimer();
  const [error, setError] = useState<string | null>(null);
  const paused = activeSession?.status === "PAUSED";
  const busy = Boolean(pendingOperation);

  async function changeRunningState() {
    if (!activeSession) return;
    setError(null);
    const result = await (paused
      ? resumeSession(activeSession.id)
      : pauseSession(activeSession.id));
    if (!result.ok)
      setError(result.error ?? "Could not change the timer state.");
  }

  return (
    <div
      className="app-header-focus"
      data-timer-state={!activeSession ? "idle" : paused ? "paused" : "running"}
      aria-label="Focus timer controls"
    >
      {!activeSession ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="app-header-focus-start"
          disabled={busy}
          onClick={(event) => {
            // Safari does not focus a pointer-clicked button automatically.
            // Give the modal layer its actual return target before opening.
            event.currentTarget.focus({ preventScroll: true });
            if (recoveryRequired) void reconcileTimer();
            else window.dispatchEvent(new Event("become:start-timer"));
          }}
          data-testid="start-timer-trigger"
        >
          <Play aria-hidden="true" />
          {recoveryRequired ? "Check timer status" : "Start focus"}
        </Button>
      ) : (
        <>
          <span className="app-header-focus-readout">
            <span className="app-header-focus-dot" aria-hidden="true" />
            <span
              className="type-quote app-header-focus-time"
              data-elapsed-seconds={elapsedSeconds}
            >
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="type-caption app-header-focus-state">
              {paused ? "Paused" : "Focusing"}
            </span>
          </span>
          <span className="app-header-focus-actions">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="app-header-focus-action"
              aria-label={
                paused ? "Resume focus session" : "Pause focus session"
              }
              title={paused ? "Resume focus session" : "Pause focus session"}
              disabled={busy || recoveryRequired}
              onClick={() => void changeRunningState()}
              data-testid={paused ? "resume-session" : "pause-session"}
            >
              <IconFrame>{paused ? <Play /> : <Pause />}</IconFrame>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="app-header-focus-action app-header-focus-end"
              aria-label="End focus session"
              title="End focus session"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                window.dispatchEvent(new Event("become:stop-timer"));
              }}
            >
              <IconFrame>
                <Square />
              </IconFrame>
            </Button>
          </span>
        </>
      )}
      {error && (
        <span className="app-header-focus-error type-caption" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function AppHeader({
  user,
  daysLeft,
  previewMode = false,
}: {
  user: { name: string; email: string };
  daysLeft: number;
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { play } = useInterfaceSound();
  const [mobileOpen, setMobileOpen] = useState(false);
  const presence = usePresence(mobileOpen, "content");
  const menuId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useModalLayer({
    open: mobileOpen,
    containerRef: layerRef,
    initialFocusRef: triggerRef,
    returnFocusRef: triggerRef,
    onClose: () => {
      setMobileOpen(false);
      play("returned");
    },
  });

  async function signOut() {
    const { authClient } = await import("@/lib/auth/config/auth-client.config");
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const account = (mobile: boolean) => (
    <SubMenu
      label="Account"
      placement={mobile ? "top-stretch" : "bottom-end"}
      className={
        mobile ? "app-mobile-nav-account-menu" : "app-header-account-menu"
      }
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          className={mobile ? "app-mobile-nav-profile" : "app-header-account"}
        >
          <span
            className={
              mobile
                ? "app-mobile-nav-avatar type-label"
                : "app-header-avatar type-label"
            }
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span
            className={
              mobile ? "app-mobile-nav-account-copy" : "app-header-account-copy"
            }
          >
            <span className="type-label app-header-account-name">
              <span>{user.name}</span>
              <ChevronDown aria-hidden="true" />
            </span>
            <span className="type-caption app-header-email">{user.email}</span>
          </span>
        </button>
      )}
    >
      <MenuItem
        href="/sessions"
        icon={<Clock3 />}
        onSelect={() => setMobileOpen(false)}
      >
        Session history
      </MenuItem>
      <MenuItem
        href="/settings"
        icon={<Settings2 />}
        onSelect={() => setMobileOpen(false)}
      >
        Settings
      </MenuItem>
      <MenuItem
        tone="danger"
        icon={<LogOut />}
        disabled={previewMode}
        onSelect={() => void signOut()}
      >
        Sign out
      </MenuItem>
    </SubMenu>
  );

  return (
    <div className="app-header-layer" ref={layerRef}>
      <header className="app-header">
        <div className="app-header-leading">
          <Link
            href="/"
            aria-label="Become dashboard"
            className="app-header-brand-link"
          >
            <BrandMark />
          </Link>
          <span
            className="app-header-separator app-header-tagline-separator"
            aria-hidden="true"
          />
          <p className="type-system app-header-tagline">
            A HIGHER
            <br />
            VERSION OF YOU
          </p>
          <span
            className="app-header-separator app-header-timer-separator"
            aria-hidden="true"
          />
          <div className="app-header-season-time">
            <IconFrame>
              <Clock3 />
            </IconFrame>
            <span className="type-label">
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </span>
          </div>
        </div>
        <FocusControls />
        <div className="app-header-trailing">
          {account(false)}
          <span
            className="app-header-separator app-header-actions-separator"
            aria-hidden="true"
          />
          <div className="app-header-actions">
            <Notifications />
          </div>
          <button
            ref={triggerRef}
            className="app-header-action app-header-menu-trigger"
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-controls={menuId}
            aria-expanded={mobileOpen}
            onClick={() => {
              const next = !mobileOpen;
              setMobileOpen(next);
              play(next ? "layerOpened" : "returned");
            }}
          >
            <IconFrame>{mobileOpen ? <X /> : <Menu />}</IconFrame>
          </button>
        </div>
      </header>
      {presence.isPresent && (
        <div
          className="app-mobile-nav-layer"
          id={menuId}
          data-state={presence.presenceState}
          aria-hidden={presence.isExiting}
          inert={presence.isExiting}
        >
          <div
            className="app-mobile-nav-panel"
            onAnimationEnd={presence.onPresenceAnimationEnd}
          >
            <div className="app-mobile-nav-heading">
              <span className="type-overline">EXPLORE BECOME</span>
              <span className="type-system app-mobile-nav-count">
                06 / AREAS
              </span>
            </div>
            <nav
              className="app-mobile-nav-list"
              aria-label="Primary navigation"
            >
              {AREA_NAVIGATION.map(({ area, label, href }) => {
                const active =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={area}
                    href={href}
                    className="app-mobile-nav-item"
                    data-area={area}
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <AreaIcon area={area} treatment="compact" />
                    <span className="type-label app-mobile-nav-item-label">
                      {label}
                    </span>
                    <IconFrame className="app-mobile-nav-chevron">
                      <ChevronRight />
                    </IconFrame>
                  </Link>
                );
              })}
            </nav>
            <div className="app-mobile-nav-account">
              {account(true)}
              <span
                className="app-mobile-nav-account-divider"
                aria-hidden="true"
              />
              <Notifications mobile />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
