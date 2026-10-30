"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  Clock3,
  Plus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/layout/header/app-header.component";
import { DesktopAreaNavigation } from "@/components/layout/navigation/desktop-area-navigation.component";
import { Badge, RemovableBadge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import {
  EmptyState,
  type EmptyStatePattern,
} from "@/components/ui/empty-states/empty-state.component";
import { FieldHelp, FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import { Select } from "@/components/ui/forms/select.component";
import {
  Checkbox,
  Radio,
  SelectionCopy,
  SelectionLabel,
  Switch,
} from "@/components/ui/forms/selection.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { AreaIcon } from "@/components/ui/icons/area-icon.component";
import {
  IconFrame,
  type IconArea,
} from "@/components/ui/icons/icon-frame.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { Tooltip } from "@/components/ui/tooltips/tooltip.component";
import { ActiveTimerContext } from "@/features/sessions/timer/components/active-timer-provider.component";
import type {
  ActiveSessionData,
  ActiveTimerState,
} from "@/features/sessions/types/session.types";
import "./design-review.css";

const areas: { area: IconArea; label: string }[] = [
  { area: "dashboard", label: "Dashboard" },
  { area: "engineering", label: "Engineering" },
  { area: "finance", label: "Finance" },
  { area: "entrepreneurship", label: "Entrepreneurship" },
  { area: "content", label: "Content" },
  { area: "direction", label: "Direction" },
];

const emptyExamples: {
  pattern: EmptyStatePattern;
  title: string;
  description: string;
  area: IconArea;
}[] = [
  {
    pattern: "project-anatomy",
    title: "Your first project starts here",
    description:
      "Create a project to connect sessions, technologies, and evidence.",
    area: "engineering",
  },
  {
    pattern: "account-gateway",
    title: "Connect an account",
    description: "Bring transactions into Finance when you are ready.",
    area: "finance",
  },
  {
    pattern: "audience-constellation",
    title: "No audience signals yet",
    description: "Add people and conversations to see the picture emerge.",
    area: "entrepreneurship",
  },
  {
    pattern: "editorial-canvas",
    title: "A blank canvas",
    description: "Start a draft and shape its first useful version.",
    area: "content",
  },
  {
    pattern: "goal-trajectory",
    title: "Set a direction",
    description: "Define one outcome to give the season a trajectory.",
    area: "direction",
  },
  {
    pattern: "first-focus",
    title: "Begin your first focus session",
    description: "A session gives your work a place in the record.",
    area: "dashboard",
  },
  {
    pattern: "ledger-replacement",
    title: "No transactions yet",
    description: "Your money flow will appear here after the first import.",
    area: "finance",
  },
  {
    pattern: "unplotted-chart",
    title: "Nothing to plot this week",
    description: "Recorded activity will shape this chart.",
    area: "dashboard",
  },
  {
    pattern: "active-filter",
    title: "No matching results",
    description: "Try a wider set of filters.",
    area: "finance",
  },
  {
    pattern: "search-echo",
    title: "No results for this search",
    description: "Check the spelling or use a broader term.",
    area: "engineering",
  },
  {
    pattern: "time-window-silence",
    title: "This window is quiet",
    description: "There is no activity in the selected period.",
    area: "dashboard",
  },
  {
    pattern: "archive-quiet",
    title: "Nothing archived",
    description: "Items you archive will collect here.",
    area: "content",
  },
  {
    pattern: "attention-resolved",
    title: "All clear",
    description: "There is nothing that needs attention right now.",
    area: "dashboard",
  },
  {
    pattern: "review-queue-clear",
    title: "Review queue clear",
    description: "You have handled every item in this queue.",
    area: "finance",
  },
  {
    pattern: "publication-pause",
    title: "No publication planned",
    description: "When you schedule a piece, it will appear here.",
    area: "content",
  },
  {
    pattern: "follow-up-complete",
    title: "Follow-ups complete",
    description: "No open conversations need your response.",
    area: "entrepreneurship",
  },
];

function Section({
  id,
  number,
  title,
  note,
  children,
}: {
  id: string;
  number: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="review-section" id={id}>
      <div className="review-section-heading">
        <span className="type-system review-section-number">
          {number} / SYSTEM
        </span>
        <div>
          <h2 className="type-section-title">{title}</h2>
          <p className="type-body-sm">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReviewCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      as="div"
      material="elevated-glass"
      className={`review-card ${className}`}
    >
      {eyebrow && <span className="type-system review-eyebrow">{eyebrow}</span>}
      <h3 className="type-widget-title">{title}</h3>
      {children}
    </Card>
  );
}

function ReviewDrawer({
  area,
  open,
  onClose,
}: {
  area: IconArea;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const presence = usePresence(open, "surface");
  if (!presence.isPresent) return null;
  const current = area;
  return (
    <Drawer
      open={open}
      presenceState={presence.presenceState}
      exiting={presence.isExiting}
      onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
      onClose={onClose}
      titleId={titleId}
      domain={current}
      header={
        <>
          <div className="review-drawer-heading">
            <span className="type-overline review-eyebrow">
              SESSION DETAILS
            </span>
            <h2 id={titleId} className="type-section-title">
              Build the next version
            </h2>
            <p className="type-body">
              {areas.find((item) => item.area === current)?.label} · Focus
              session
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close drawer"
            onClick={onClose}
          >
            <X />
          </Button>
        </>
      }
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="review-drawer-body">
        <div className="review-drawer-identity">
          <AreaIcon area={current} treatment="featured" />
          <div>
            <strong className="type-widget-title">
              {areas.find((item) => item.area === current)?.label}
            </strong>
            <span className="type-body-sm">Application UI</span>
          </div>
          <ChevronRight aria-hidden="true" />
        </div>
        <div className="review-drawer-metrics">
          <div>
            <IconFrame area={current} treatment="compact">
              <Clock3 />
            </IconFrame>
            <span className="type-caption">Focused time</span>
            <strong className="type-metric-md">55 minutes</strong>
          </div>
          <div>
            <IconFrame area={current} treatment="compact">
              <Sparkles />
            </IconFrame>
            <span className="type-caption">Break time</span>
            <strong className="type-metric-md">5 minutes</strong>
          </div>
        </div>
        <div className="review-drawer-details">
          <p className="type-label">Focus / intention</p>
          <p className="type-body">
            Define predictable keyboard behavior and restore focus after the
            shared menu closes.
          </p>
          <p className="type-label">Outcome</p>
          <p className="type-body">
            The menu now responds consistently across mouse, keyboard, and touch
            input.
          </p>
        </div>
      </div>
    </Drawer>
  );
}

const demoSession: ActiveSessionData = {
  id: "design-review-timer",
  status: "RUNNING",
  pausedAt: null,
  accumulatedActiveMilliseconds: 0,
  runningSince: new Date().toISOString(),
  totalPausedMilliseconds: 0,
  startedAt: new Date().toISOString(),
  endedAt: null,
  description: null,
  outcome: null,
  notes: null,
  durationSeconds: 0,
  domain: {
    id: "review",
    name: "Dashboard",
    slug: "dashboard",
    analyticsColor: null,
  },
  activityType: { id: "review", name: "Focus" },
  engineeringContext: null,
  engineeringProject: null,
};

export function DesignReview() {
  const [activeArea, setActiveArea] = useState<IconArea>("dashboard");
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerArea, setDrawerArea] = useState<IconArea | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuChoice, setMenuChoice] = useState("Season overview");
  const [selectValue, setSelectValue] = useState("engineering");
  const [formArea, setFormArea] = useState<IconArea>("entrepreneurship");
  const [filter, setFilter] = useState(true);
  const [progressValues, setProgressValues] = useState({
    plasma: 64,
    ticks: 72,
    halo: 31,
  });

  useEffect(() => {
    const start = () => {
      setTimerActive(true);
      setTimerPaused(false);
      setElapsedSeconds(0);
    };
    const stop = () => {
      setTimerActive(false);
      setTimerPaused(false);
    };
    window.addEventListener("become:start-timer", start);
    window.addEventListener("become:stop-timer", stop);
    return () => {
      window.removeEventListener("become:start-timer", start);
      window.removeEventListener("become:stop-timer", stop);
    };
  }, []);

  useEffect(() => {
    if (!timerActive || timerPaused) return;
    const interval = window.setInterval(
      () => setElapsedSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [timerActive, timerPaused]);

  const timerState: ActiveTimerState = {
    activeSession: timerActive
      ? { ...demoSession, status: timerPaused ? "PAUSED" : "RUNNING" }
      : null,
    elapsedSeconds,
    pendingOperation: null,
    recoveryRequired: false,
    completedSessions: {},
    startSession: async () => ({
      ok: false,
      error: "This is a local design preview.",
    }),
    completeSession: async () => ({
      ok: false,
      error: "This is a local design preview.",
    }),
    pauseSession: async () => {
      setTimerPaused(true);
      return { ok: true };
    },
    resumeSession: async () => {
      setTimerPaused(false);
      return { ok: true };
    },
    reconcileTimer: async () => true,
  };

  const sections = [
    "foundation",
    "components",
    "forms",
    "layers",
    "progress",
    "loading",
    "empty",
    "badges",
  ];

  return (
    <ActiveTimerContext.Provider value={timerState}>
      <div className="design-review" data-review-area={activeArea}>
        <AppHeader
          user={{ name: "Ammar", email: "design preview" }}
          daysLeft={10}
          previewMode
        />
        <DesktopAreaNavigation
          pathname={activeArea === "dashboard" ? "/" : `/${activeArea}`}
          onNavigate={(href) =>
            setActiveArea(
              (href === "/" ? "dashboard" : href.slice(1)) as IconArea,
            )
          }
        />
        <main className="review-main">
          <div className="review-intro">
            <span className="type-overline review-eyebrow">
              BECOME / APPROVED SYSTEM
            </span>
            <h1 className="type-page-title">One system. Every shared piece.</h1>
            <p className="type-body">
              This is the final review of the approved foundation and reusable
              components before the application screens are rebuilt. The
              examples below use the actual shared components; controls here use
              preview data only.
            </p>
            <nav className="review-jump-nav" aria-label="Review sections">
              {sections.map((section) => (
                <a key={section} href={`#${section}`} className="type-label">
                  {section}
                </a>
              ))}
            </nav>
          </div>

          <Section
            id="foundation"
            number="01"
            title="Foundation"
            note="Gold, domain accents, type, materials, and the three spacing contexts."
          >
            <div className="review-grid review-grid--foundation">
              <ReviewCard title="Color identities" eyebrow="TOKENS / COLOR">
                <div className="review-palette">
                  {areas.map(({ area, label }) => (
                    <div
                      key={area}
                      className="review-palette-row"
                      data-area={area}
                    >
                      <span className="review-palette-swatch" />
                      <span className="type-label">{label}</span>
                    </div>
                  ))}
                </div>
              </ReviewCard>
              <ReviewCard
                title="Typography"
                eyebrow="MANROPE / INTER / GEIST MONO"
              >
                <span className="type-hero-kicker review-type-kicker">
                  Talk to your C.O.T.S
                </span>
                <strong className="type-hero review-type-hero">
                  ASK ME ANYTHING
                </strong>
                <strong className="type-section-title">Transactions</strong>
                <span className="type-quote review-quote">
                  “Show up every day and get stronger than yesterday.”
                </span>
                <span className="type-system review-muted">
                  S1 / BUILD THE FOUNDATION
                </span>
              </ReviewCard>
              <ReviewCard title="Page rhythms" eyebrow="SPACING CONTEXTS">
                <div className="review-rhythm review-rhythm--overview">
                  <b className="type-label">Overview</b>
                  <span>Hero → grouped widgets</span>
                </div>
                <div className="review-rhythm review-rhythm--dense">
                  <b className="type-label">Dense</b>
                  <span>Facts → rows → filters</span>
                </div>
                <div className="review-rhythm review-rhythm--action">
                  <b className="type-label">Action</b>
                  <span>Intention → fields → action</span>
                </div>
              </ReviewCard>
            </div>
            <div className="review-material-scene">
              <div className="review-material-grid">
                {(["solid", "glass", "elevated-glass"] as const).map(
                  (material) => (
                    <div
                      key={material}
                      className={`review-material material-${material}`}
                    >
                      <span className="type-system">
                        MATERIAL / {material.toUpperCase()}
                      </span>
                      <strong className="type-widget-title">
                        Readable over depth
                      </strong>
                      <p className="type-body-sm">
                        The scenery stays behind the surface while the message
                        stays clear.
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Section>

          <Section
            id="components"
            number="02"
            title="Controls and identity"
            note="Approved buttons, fields, selections, menus, icon treatments, and short-form rhythm."
          >
            <div className="review-grid review-grid--two">
              <ReviewCard title="Buttons and actions" eyebrow="PRECISION LIGHT">
                <div className="review-row">
                  <Button>Primary action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Quiet</Button>
                  <Button variant="danger">Delete</Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Open settings"
                  >
                    <Settings2 />
                  </Button>
                </div>
                <div className="review-row">
                  <SubMenu
                    label="Example actions"
                    placement="bottom-end"
                    trigger={(props) => (
                      <Button {...props} variant="secondary">
                        {menuChoice}
                        <ChevronRight />
                      </Button>
                    )}
                  >
                    <MenuItem
                      icon={<Plus />}
                      onSelect={() => setMenuChoice("New record")}
                    >
                      New record
                    </MenuItem>
                    <MenuItem
                      icon={<SlidersHorizontal />}
                      onSelect={() => setMenuChoice("Adjust filters")}
                    >
                      Adjust filters
                    </MenuItem>
                    <MenuItem icon={<Bell />} disabled>
                      Notifications unavailable
                    </MenuItem>
                  </SubMenu>
                  <Tooltip
                    content="A short explanation, framed with the selected area accent."
                    area={activeArea}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="About this action"
                    >
                      <Sparkles />
                    </Button>
                  </Tooltip>
                </div>
              </ReviewCard>
              <ReviewCard title="Form controls" eyebrow="OPERATING MODE">
                <div className="review-field">
                  <FieldLabel htmlFor="review-title">
                    What are you working on?
                  </FieldLabel>
                  <Input
                    id="review-title"
                    placeholder="Build the menu interaction model"
                  />
                  <FieldHelp>
                    Keep the title specific enough to find later.
                  </FieldHelp>
                </div>
                <div className="review-field">
                  <FieldLabel htmlFor="review-context">Area</FieldLabel>
                  <Select
                    label="Area"
                    value={selectValue}
                    onValueChange={setSelectValue}
                    options={[
                      { value: "engineering", label: "Engineering" },
                      { value: "finance", label: "Finance" },
                      { value: "content", label: "Content" },
                    ]}
                  />
                </div>
                <div className="review-field">
                  <FieldLabel htmlFor="review-notes">Notes</FieldLabel>
                  <Textarea id="review-notes" placeholder="What changed?" />
                </div>
                <div className="review-selections">
                  <SelectionLabel data-domain="engineering">
                    <Checkbox defaultChecked />
                    <SelectionCopy help="Show completed work">
                      Include completed
                    </SelectionCopy>
                  </SelectionLabel>
                  <SelectionLabel data-domain="finance">
                    <Radio name="review-scope" defaultChecked />
                    <SelectionCopy>Current season</SelectionCopy>
                  </SelectionLabel>
                  <SelectionLabel data-domain="content">
                    <Switch defaultChecked />
                    <SelectionCopy>Live updates</SelectionCopy>
                  </SelectionLabel>
                </div>
              </ReviewCard>
            </div>
            <div className="review-grid review-grid--two">
              <ReviewCard
                title="Six area identities"
                eyebrow="SHARED ICON MAPPING"
              >
                <div className="review-icon-grid">
                  {areas.map(({ area, label }) => (
                    <div key={area} className="review-icon-item">
                      <AreaIcon area={area} treatment="compact" />
                      <span className="type-label">{label}</span>
                    </div>
                  ))}
                </div>
              </ReviewCard>
              <ReviewCard
                title="Three icon treatments"
                eyebrow="BARE / COMPACT / FEATURED"
              >
                <div className="review-icon-treatments">
                  <div>
                    <AreaIcon area={activeArea} treatment="bare" />
                    <span className="type-caption">Bare</span>
                  </div>
                  <div>
                    <AreaIcon area={activeArea} treatment="compact" />
                    <span className="type-caption">Compact</span>
                  </div>
                  <div>
                    <AreaIcon area={activeArea} treatment="featured" />
                    <span className="type-caption">Featured</span>
                  </div>
                </div>
              </ReviewCard>
            </div>
          </Section>

          <Section
            id="forms"
            number="03"
            title="Form composition"
            note="Short tasks use a focused operating form. Longer tasks move to a dedicated page. Switch domains to inspect each accent."
          >
            <div
              className="review-row review-form-picker"
              data-form-area={formArea}
              role="group"
              aria-label="Form domain"
            >
              {areas
                .filter(
                  ({ area }) => area !== "dashboard" && area !== "direction",
                )
                .map(({ area, label }) => (
                  <Button
                    key={area}
                    variant={formArea === area ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={formArea === area}
                    onClick={() => setFormArea(area)}
                  >
                    {label}
                  </Button>
                ))}
            </div>
            <div className="review-form-stage" data-form-area={formArea}>
              <div className="review-form-observation">
                <span className="type-system">OBSERVE / CONTEXT</span>
                <strong className="type-section-title">
                  From overview to action
                </strong>
                <p className="type-body">
                  The background recedes while the active task takes focus.
                </p>
              </div>
              <div className="review-grid review-grid--two">
                <div className="review-operating-panel material-elevated-glass">
                  <span className="type-overline">
                    SHORT FORM / FOCUSED TASK
                  </span>
                  <h3 className="type-section-title">Capture a signal</h3>
                  <p className="type-body-sm">
                    One decision, a few inputs, and a clear next action.
                  </p>
                  <div className="review-field">
                    <FieldLabel htmlFor="short-form-title">Title</FieldLabel>
                    <Input
                      id="short-form-title"
                      placeholder="What did you learn?"
                    />
                  </div>
                  <div className="review-field">
                    <FieldLabel htmlFor="short-form-note">Context</FieldLabel>
                    <Textarea
                      id="short-form-note"
                      placeholder="Add the useful detail"
                    />
                  </div>
                  <div className="review-row">
                    <Button type="button">Save record</Button>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="review-long-form-page material-solid">
                  <div className="review-long-form-rail">
                    <span className="type-system">
                      LONG FORM / DEDICATED PAGE
                    </span>
                    <span className="type-label review-long-form-active">
                      01 Overview
                    </span>
                    <span className="type-label">02 Evidence</span>
                    <span className="type-label">03 Review</span>
                  </div>
                  <div className="review-long-form-workspace">
                    <span className="type-overline">OPERATING WORKSPACE</span>
                    <h3 className="type-section-title">
                      Build the full record
                    </h3>
                    <p className="type-body-sm">
                      A longer workflow keeps sections, navigation, and recovery
                      visible on its own page.
                    </p>
                    <div className="review-field">
                      <FieldLabel htmlFor="long-form-name">Name</FieldLabel>
                      <Input
                        id="long-form-name"
                        placeholder="A descriptive name"
                      />
                    </div>
                    <div className="review-field">
                      <FieldLabel htmlFor="long-form-description">
                        Description
                      </FieldLabel>
                      <Textarea
                        id="long-form-description"
                        placeholder="Describe the opportunity"
                      />
                    </div>
                    <Button type="button">Save draft</Button>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="layers"
            number="04"
            title="Menus, dialog, and drawer"
            note="Open each layer. The drawer changes accent by area; the mobile header has its own full navigation."
          >
            <div className="review-grid review-grid--two">
              <ReviewCard title="Dialog" eyebrow="ELEVATED GLASS">
                <p className="type-body-sm">
                  The shared modal uses the approved glass and backdrop
                  treatment.
                </p>
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  Open dialog
                </Button>
              </ReviewCard>
              <ReviewCard title="Domain drawer" eyebrow="CONTEXTUAL ACCENT">
                <div className="review-row">
                  {areas.map(({ area, label }) => (
                    <Button
                      key={area}
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDrawerArea(area);
                        setDrawerOpen(true);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </ReviewCard>
            </div>
          </Section>

          <Section
            id="progress"
            number="05"
            title="Progress"
            note="Plasma Core, Season Ticks, and Segmented Halo. Adjust each independently to watch Living Light respond."
          >
            <div className="review-grid review-grid--three">
              {(
                [
                  {
                    key: "plasma",
                    variant: "plasma-core",
                    title: "Plasma Core",
                    area: "engineering",
                  },
                  {
                    key: "ticks",
                    variant: "season-ticks",
                    title: "Season Ticks",
                    area: "dashboard",
                  },
                  {
                    key: "halo",
                    variant: "segmented-halo",
                    title: "Segmented Halo",
                    area: "finance",
                  },
                ] as const
              ).map(({ key, variant, title, area }) => (
                <ReviewCard key={key} title={title} eyebrow="VALUE CHANGE">
                  <ProgressIndicator
                    variant={variant}
                    area={area}
                    value={progressValues[key]}
                    label={`${title} progress`}
                  />
                  <div className="review-slider-row">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressValues[key]}
                      aria-label={`Adjust ${title}`}
                      onChange={(event) =>
                        setProgressValues((values) => ({
                          ...values,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                    <span className="type-system">{progressValues[key]}%</span>
                  </div>
                </ReviewCard>
              ))}
            </div>
          </Section>

          <Section
            id="loading"
            number="06"
            title="Loading"
            note="Orbit Arc for local waits, Edge Trace for content, Eclipse for longer operations."
          >
            <div className="review-grid review-grid--three">
              {(
                [
                  {
                    variant: "orbit-arc",
                    title: "Orbit Arc",
                    area: "dashboard",
                  },
                  {
                    variant: "edge-trace",
                    title: "Edge Trace",
                    area: "engineering",
                  },
                  { variant: "eclipse", title: "Eclipse", area: "content" },
                ] as const
              ).map(({ variant, title, area }) => (
                <ReviewCard key={variant} title={title} eyebrow="INDETERMINATE">
                  <div className="review-loading-stage">
                    <LoadingIndicator
                      variant={variant}
                      area={area}
                      label={`${title} loading`}
                    />
                  </div>
                </ReviewCard>
              ))}
            </div>
          </Section>

          <Section
            id="empty"
            number="07"
            title="Empty states"
            note="All sixteen approved patterns, including the corrected connecting lines in Project Anatomy and Audience Constellation."
          >
            <div className="review-empty-grid">
              {emptyExamples.map((example, index) => (
                <div key={example.pattern} className="review-empty-item">
                  <span className="type-system">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {example.pattern.replaceAll("-", " ").toUpperCase()}
                  </span>
                  <EmptyState
                    {...example}
                    action={
                      index < 6 ? (
                        <Button variant="secondary" size="sm">
                          Get started <ChevronRight />
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="badges"
            number="08"
            title="Badges and help"
            note="Aurora Fill, Live Numeral, Specimen Strip, Removable, and the selected Corner Frame tooltip."
          >
            <div className="review-grid review-grid--two">
              <ReviewCard title="Approved badge set" eyebrow="FOUR ROLES">
                <div className="review-row">
                  <Badge variant="aurora-fill" area="engineering">
                    In progress
                  </Badge>
                  <Badge variant="live-numeral" area="finance">
                    03 ACTIVE
                  </Badge>
                  <Badge variant="specimen-strip" area="content">
                    DRAFT / 01
                  </Badge>
                  {filter ? (
                    <RemovableBadge
                      area="dashboard"
                      label="Saved filter"
                      onRemove={() => setFilter(false)}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilter(true)}
                    >
                      Restore filter
                    </Button>
                  )}
                </div>
              </ReviewCard>
              <ReviewCard
                title="Corner Frame tooltip"
                eyebrow="HOVER / FOCUS / ESCAPE"
              >
                <div className="review-row">
                  <Tooltip
                    content="This action uses the approved Corner Frame treatment."
                    area="dashboard"
                  >
                    <Button variant="secondary">Hover or focus me</Button>
                  </Tooltip>
                  <Tooltip
                    content="The corner accent follows the owning domain."
                    area="finance"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Finance help"
                    >
                      <Sparkles />
                    </Button>
                  </Tooltip>
                </div>
              </ReviewCard>
            </div>
          </Section>

          <footer className="review-footer type-system">
            BECOME / SHARED SYSTEM REVIEW · PREVIEW DATA ONLY
          </footer>
        </main>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          eyebrow="CONFIRM ACTION"
          title="Ready to continue?"
          description="This is the approved shared dialog treatment in context."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Continue</Button>
            </>
          }
        >
          <p className="type-body">
            Layering, spacing, keyboard focus, and motion are all driven by the
            shared system.
          </p>
        </Dialog>
        {drawerArea && (
          <ReviewDrawer
            area={drawerArea}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </div>
    </ActiveTimerContext.Provider>
  );
}
