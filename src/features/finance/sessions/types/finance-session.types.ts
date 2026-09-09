import type { FinanceCompensationType } from "@/generated/prisma/enums";
export type FinanceWorkOptions = {
  workSources: {
    id: string;
    name: string;
    defaultCompensationType: FinanceCompensationType;
  }[];
  opportunities: {
    id: string;
    title: string;
    resultingWorkSourceId: string | null;
  }[];
};
export type FinanceSessionInput = {
  workSourceId: string;
  incomeOpportunityId: string;
  financeCompensationType: FinanceCompensationType;
};
