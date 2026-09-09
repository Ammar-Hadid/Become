import type { LoadedEvidence } from "@/features/entrepreneurship/problems/queries/problem.query";
import { formatMoney } from "@/lib/money/utils/money.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
export function evidenceWords(evidence: LoadedEvidence) {
  if (evidence.observationRevision)
    return evidence.observationRevision.statement;
  const snapshot = evidence.receiptSnapshot;
  if (
    snapshot &&
    !Array.isArray(snapshot) &&
    typeof snapshot === "object" &&
    typeof snapshot.amountMinor === "string" &&
    typeof snapshot.currency === "string" &&
    typeof snapshot.occurredAt === "string"
  )
    return `${formatMoney(snapshot.amountMinor, snapshot.currency)} attributed to ${String(snapshot.companyName)} from income received ${businessDate(snapshot.occurredAt)}. Source as recorded for this interpretation.`;
  return "Receipt source unavailable.";
}
