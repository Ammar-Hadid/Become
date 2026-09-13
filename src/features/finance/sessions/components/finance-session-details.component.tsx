"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import type { SessionDetailItem } from "@/features/sessions/types/session.types";

const activityCopy = {
  PAID_WORK: "Paid work",
  OPPORTUNITY_SEARCH: "Opportunity search",
  APPLICATION: "Application",
  ASSESSMENT: "Assessment",
  FINANCE_ADMIN: "Finance admin",
} as const;

export function FinanceSessionDetails({
  session,
}: {
  session: SessionDetailItem;
}) {
  const activity = session.financeActivityKind
    ? activityCopy[session.financeActivityKind]
    : "Unclassified Finance activity";

  return (
    <Link
      href={`/finance/work/${session.id}`}
      className="finance-session-summary"
      aria-label={`Review work and payments for ${activity}`}
    >
      <span className="finance-session-summary-icon">
        <BriefcaseBusiness aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">Finance context</p>
        <h3>{activity}</h3>
        {session.financeActivityKind === "PAID_WORK" && (
          <span>
            {session.paymentAttributionCompleteAt && (
              <CheckCircle2 aria-hidden="true" />
            )}
            {session.paymentAttributionCompleteAt
              ? "Payment fully accounted for"
              : "Payment review needed"}
          </span>
        )}
      </div>
      <span className="finance-session-summary-action" aria-hidden="true">
        <ArrowRight />
      </span>
    </Link>
  );
}
