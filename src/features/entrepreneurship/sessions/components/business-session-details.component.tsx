"use client";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
export function BusinessSessionDetails({
  session,
}: {
  session: SessionDetailItem;
}) {
  return (
    <section className="border-border bg-surface-input rounded-panel p-xl border">
      <p className="eyebrow">Entrepreneurship context</p>
      <div className="border-border mt-lg gap-md pt-lg grid border-t">
        <div>
          <p className="text-body-sm text-text-muted">
            Recorded exploration & optional business
          </p>
          <p className="text-body text-text-secondary mt-xs">
            {session.businessNicheSnapshot ?? "No exploration recorded"}
            {session.businessCompanySnapshot &&
              ` · ${session.businessCompanySnapshot}`}
          </p>
        </div>
        <div>
          <p className="text-body-sm text-text-muted">Activity</p>
          <p className="text-body text-text-secondary mt-xs">
            {humanize(session.entrepreneurshipActivityKind ?? "UNKNOWN")}
          </p>
        </div>
      </div>
      <p className="text-body-sm text-text-muted border-border mt-lg pt-lg border-t">
        Session time does not itself record customer contact or a receipt.
      </p>
      {session.endedAt && (
        <Link
          className="text-link mt-lg inline-flex"
          href={`/entrepreneurship/interactions/capture?session=${encodeURIComponent(session.id)}`}
        >
          Log an interaction from this session →
        </Link>
      )}
    </section>
  );
}
