import type { ReactNode } from "react";
import {
  Archive,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  Clock3,
  FileText,
  Filter,
  Folder,
  Search,
  ShieldCheck,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";
import { IconFrame, type IconArea } from "../icons/icon-frame.component";

export type EmptyStatePattern =
  | "project-anatomy"
  | "account-gateway"
  | "audience-constellation"
  | "editorial-canvas"
  | "goal-trajectory"
  | "first-focus"
  | "ledger-replacement"
  | "unplotted-chart"
  | "active-filter"
  | "search-echo"
  | "time-window-silence"
  | "archive-quiet"
  | "attention-resolved"
  | "review-queue-clear"
  | "publication-pause"
  | "follow-up-complete";

type EmptyStateProps = {
  pattern: EmptyStatePattern;
  area?: IconArea;
  size?: "default" | "compact";
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  /** Scope, active filters, or query shown alongside a narrowed result. */
  context?: ReactNode;
  className?: string;
};

const compactIcons = {
  "project-anatomy": Folder,
  "account-gateway": Wallet,
  "audience-constellation": UserRound,
  "editorial-canvas": FileText,
  "goal-trajectory": Target,
  "first-focus": Clock3,
  "ledger-replacement": FileText,
  "unplotted-chart": ChartNoAxesColumn,
  "active-filter": Filter,
  "search-echo": Search,
  "time-window-silence": Clock3,
  "archive-quiet": Archive,
  "attention-resolved": Check,
  "review-queue-clear": ShieldCheck,
  "publication-pause": CalendarDays,
  "follow-up-complete": Check,
} satisfies Record<EmptyStatePattern, typeof Target>;

const illustratedPatterns = new Set<EmptyStatePattern>([
  "project-anatomy",
  "account-gateway",
  "audience-constellation",
  "editorial-canvas",
  "goal-trajectory",
  "first-focus",
]);

const defaultContext: Partial<Record<EmptyStatePattern, string>> = {
  "ledger-replacement": "TRANSACTIONS / ALL TIME",
  "unplotted-chart": "THIS WEEK / TIME INVESTED",
  "active-filter": "FILTERS ACTIVE",
  "time-window-silence": "MON · TUE · WED · THU · FRI · SAT · SUN",
  "review-queue-clear": "REVIEW QUEUE / CLEAR",
};

function ProjectAnatomy() {
  return (
    <span className="become-empty__anatomy" aria-hidden="true">
      <span className="become-empty__anatomy-kicker type-system">
        PROJECT / STRUCTURE
      </span>
      <svg
        className="become-empty__wires"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M41 46 L77 18 M41 46 L77 76 M41 46 L22 80" />
      </svg>
      <span className="become-empty__anatomy-core type-system">
        <Folder />
        <b>PROJECT</b>
      </span>
      <span className="become-empty__anatomy-node become-empty__anatomy-node--a type-system">
        01 <b>Sessions</b>
      </span>
      <span className="become-empty__anatomy-node become-empty__anatomy-node--b type-system">
        02 <b>Technologies</b>
      </span>
      <span className="become-empty__anatomy-node become-empty__anatomy-node--c type-system">
        03 <b>Evidence</b>
      </span>
    </span>
  );
}

function AudienceConstellation() {
  return (
    <span className="become-empty__audience" aria-hidden="true">
      <svg
        className="become-empty__wires"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M50 48 L17 20 M50 48 L83 20 M50 48 L24 82" />
      </svg>
      {[1, 2, 3, 4].map((index) => (
        <span
          className={`become-empty__person become-empty__person--${index}`}
          key={index}
        >
          <UserRound />
        </span>
      ))}
    </span>
  );
}

function EmptyArtwork({
  pattern,
  area,
}: {
  pattern: EmptyStatePattern;
  area: IconArea;
}) {
  switch (pattern) {
    case "project-anatomy":
      return <ProjectAnatomy />;
    case "account-gateway":
      return (
        <span className="become-empty__gateway" aria-hidden="true">
          <i />
          <span>
            <Wallet />
          </span>
          <small className="type-system">ACCOUNT → TRANSACTIONS</small>
        </span>
      );
    case "audience-constellation":
      return <AudienceConstellation />;
    case "editorial-canvas":
      return (
        <span className="become-empty__editorial" aria-hidden="true">
          <i />
          <span>
            <small className="type-system">01 / DRAFT</small>
            <b />
            <b />
            <b />
          </span>
        </span>
      );
    case "goal-trajectory":
      return (
        <span className="become-empty__trajectory" aria-hidden="true">
          <i />
          <i />
          <b />
          <span>
            <Target />
          </span>
          <small className="type-system">START → INTENTION</small>
        </span>
      );
    case "first-focus":
      return (
        <span className="become-empty__focus" aria-hidden="true">
          <Clock3 />
          <small className="type-system">--:--:--</small>
        </span>
      );
    case "ledger-replacement":
      return (
        <IconFrame treatment="bare" area={area}>
          <FileText />
        </IconFrame>
      );
    case "unplotted-chart":
      return (
        <IconFrame treatment="bare" area={area}>
          <ChartNoAxesColumn />
        </IconFrame>
      );
    case "active-filter":
      return (
        <IconFrame treatment="bare" area={area}>
          <Filter />
        </IconFrame>
      );
    case "search-echo":
      return (
        <IconFrame treatment="bare" area={area}>
          <Search />
        </IconFrame>
      );
    case "time-window-silence":
      return (
        <IconFrame treatment="bare" area={area}>
          <Clock3 />
        </IconFrame>
      );
    case "archive-quiet":
      return (
        <IconFrame treatment="featured" area={area}>
          <Archive />
        </IconFrame>
      );
    case "attention-resolved":
      return (
        <span className="become-empty__resolved" aria-hidden="true">
          <Check />
        </span>
      );
    case "review-queue-clear":
      return (
        <IconFrame treatment="bare" area={area}>
          <ShieldCheck />
        </IconFrame>
      );
    case "publication-pause":
      return (
        <IconFrame treatment="bare" area={area}>
          <CalendarDays />
        </IconFrame>
      );
    case "follow-up-complete":
      return (
        <IconFrame treatment="compact" area={area}>
          <Check />
        </IconFrame>
      );
  }
}

/**
 * A visual language for genuine absence. The owning feature supplies factual copy
 * and real actions; the shared component owns only the approved presentation.
 */
export function EmptyState({
  pattern,
  area = "dashboard",
  size = "default",
  eyebrow,
  title,
  description,
  action,
  context,
  className,
}: EmptyStateProps) {
  const CompactIcon = compactIcons[pattern];
  return (
    <section
      className={cn("become-empty", className)}
      data-empty-pattern={pattern}
      data-empty-area={area}
      data-empty-size={size}
      data-empty-illustrated={illustratedPatterns.has(pattern)}
      aria-label={title}
    >
      {(context ?? defaultContext[pattern]) && (
        <div className="become-empty__context type-system">
          {context ?? defaultContext[pattern]}
        </div>
      )}
      <div className="become-empty__content">
        {size === "compact" ? (
          pattern === "goal-trajectory" ? (
            <span className="become-empty__compact-trajectory" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <ellipse cx="24" cy="24" rx="20" ry="10" transform="rotate(-28 24 24)" />
                <circle cx="31" cy="17" r="5" />
                <circle cx="8" cy="32" r="2" fill="currentColor" stroke="none" />
              </svg>
            </span>
          ) : (
            <IconFrame treatment="compact" area={area}>
              <CompactIcon />
            </IconFrame>
          )
        ) : <EmptyArtwork pattern={pattern} area={area} />}
        <div className="become-empty__copy">
          {eyebrow && (
            <span className="become-empty__eyebrow type-system">{eyebrow}</span>
          )}
          <h3 className="type-widget-title">{title}</h3>
          <p className={size === "compact" ? "type-body" : "type-body-sm"}>{description}</p>
          {action && <div className="become-empty__action">{action}</div>}
        </div>
      </div>
    </section>
  );
}
