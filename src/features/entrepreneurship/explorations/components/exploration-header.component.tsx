import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";

/** The route owns authorization and supplies actions and audience conclusions. */
export function ExplorationHeader({
  name,
  scope,
  direction,
  archived = false,
  actions,
}: {
  name: string;
  scope?: string | null;
  direction: string;
  archived?: boolean;
  actions?: ReactNode;
}) {
  return (
    <header className="exploration-context-bar">
      <div className="exploration-context-identity">
        <Link
          href="/entrepreneurship"
          className="exploration-context-back"
          aria-label="Back to explorations"
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div className="exploration-masthead-copy">
          <p className="exploration-masthead-status">
            <Compass className="text-primary size-4" aria-hidden="true" />
            {archived ? "Archived exploration" : humanize(direction)}
          </p>
          <h1>{name}</h1>
        </div>
      </div>
      <div className="exploration-context-tools">
        <WorkspaceDisclosure
          title="Manage exploration"
          className="business-exploration-tools"
        >
          {scope && <p className="business-prose">{scope}</p>}
          {actions && (
            <div className="business-actions exploration-masthead-actions">
              {actions}
            </div>
          )}
        </WorkspaceDisclosure>
      </div>
    </header>
  );
}
