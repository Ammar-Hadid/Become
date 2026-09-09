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
    <section>
      <h3 className="eyebrow mb-sm">Entrepreneurship context</h3>
      <p className="text-body text-text-secondary">
        {session.businessCompanySnapshot ?? "No company recorded"} ·{" "}
        {session.businessNicheSnapshot ?? "No niche recorded"}
      </p>
      <p className="text-body text-text-muted mt-sm">
        {humanize(session.entrepreneurshipActivityKind ?? "UNKNOWN")} · captured
        for this session
      </p>
      <p className="text-body-sm text-text-muted mt-lg">
        Session time does not itself record customer contact or a receipt.
      </p>
      {session.endedAt && (
        <Link
          className="text-link mt-lg inline-block"
          href={`/entrepreneurship/interactions/capture?session=${encodeURIComponent(session.id)}`}
        >
          Log an interaction from this session →
        </Link>
      )}
    </section>
  );
}
