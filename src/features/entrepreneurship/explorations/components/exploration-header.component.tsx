import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Compass } from "lucide-react";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";

/** The route owns authorization and supplies actions and audience conclusions. */
export function ExplorationHeader({
  name,
  scope,
  direction,
  archived = false,
  actions,
  audienceSummary,
}: {
  name: string;
  scope?: string | null;
  direction: string;
  archived?: boolean;
  actions?: ReactNode;
  audienceSummary?: ReactNode;
}) {
  return (
    <header className="exploration-masthead">
      <div className="exploration-masthead-utility">
        <Link href="/entrepreneurship" className="business-text-link">
          <ArrowLeft className="size-4" aria-hidden="true" /> Explorations
        </Link>
        <Link href="/entrepreneurship/history" className="business-text-link">
          Global history <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="exploration-masthead-main">
        <div className="exploration-masthead-copy">
          <p className="exploration-masthead-status">
            <Compass className="text-primary size-4" aria-hidden="true" />
            {archived ? "Archived exploration" : humanize(direction)}
          </p>
          <h1>{name}</h1>
        </div>
        {actions && (
          <div className="business-actions exploration-masthead-actions">
            {actions}
          </div>
        )}
      </div>
      <div className="exploration-masthead-context">
        {scope && (
          <details>
            <summary>The question you’re exploring</summary>
            <p>{scope}</p>
          </details>
        )}
        <div className="exploration-masthead-audience">{audienceSummary}</div>
      </div>
      {!archived && ["PAUSED", "STOPPED"].includes(direction) && (
        <p className="exploration-masthead-pause-note">
          This exploration is {direction.toLowerCase()}. Everything you’ve kept
          remains available whenever you want to return.
        </p>
      )}
    </header>
  );
}
