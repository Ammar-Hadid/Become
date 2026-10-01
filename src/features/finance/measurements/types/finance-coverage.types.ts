export type FinanceCoverage = {
  sourceCounts: {
    source: "MANUAL" | "LIVE_SYNC" | "STATEMENT_IMPORT";
    count: number;
  }[];
  pendingCount: number;
  unresolvedEvidenceCount: number;
  unreviewedCount: number;
  accounts: {
    id: string;
    name: string;
    currency: string;
    source: string;
    detail: string;
    lastSuccessAt: string | null;
    coverageThroughOn: string | null;
    complete: boolean;
  }[];
  omittedAccounts: number;
  complete: boolean;
  detail: string;
};
