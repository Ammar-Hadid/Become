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
    <header className="mb-2xl border-border pb-2xl border-b">
      <div className="mb-2xl gap-lg flex items-center justify-between">
        <Link
          href="/entrepreneurship"
          className="business-text-link gap-sm inline-flex items-center"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Explorations
        </Link>
        <Link
          href="/entrepreneurship/history"
          className="business-text-link gap-sm inline-flex items-center"
        >
          Global history <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="eyebrow gap-sm flex items-center">
        <Compass className="text-primary size-4" aria-hidden="true" />
        {archived ? "Archived exploration" : humanize(direction)}
      </p>
      <h1 className="mt-md text-h1 font-semibold tracking-tight wrap-anywhere">
        {name}
      </h1>
      {scope && (
        <details className="mt-lg text-body text-text-secondary">
          <summary className="rounded-control py-sm pr-sm hover:text-text-primary focus-visible:outline-primary w-fit cursor-pointer focus-visible:outline-2">
            The question you’re exploring
          </summary>
          <p className="mt-sm max-w-copy whitespace-pre-wrap">{scope}</p>
        </details>
      )}
      <div className="mt-xl gap-lg flex flex-wrap items-center justify-between">
        <div className="text-body text-text-secondary">{audienceSummary}</div>
        {actions && <div className="business-actions">{actions}</div>}
      </div>
      {!archived && ["PAUSED", "STOPPED"].includes(direction) && (
        <p className="mt-lg text-body-sm text-text-secondary">
          This exploration is {direction.toLowerCase()}. Everything you’ve kept
          remains available whenever you want to return.
        </p>
      )}
    </header>
  );
}
