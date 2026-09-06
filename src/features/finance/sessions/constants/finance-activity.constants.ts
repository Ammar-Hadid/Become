import type { FinanceActivityKind } from "@/generated/prisma/enums";
export const DEFAULT_FINANCE_ACTIVITIES: Record<string, FinanceActivityKind> = {
  "Paid work": "PAID_WORK",
  "Opportunity search": "OPPORTUNITY_SEARCH",
  Application: "APPLICATION",
  Assessment: "ASSESSMENT",
  "Finance admin": "FINANCE_ADMIN",
};
