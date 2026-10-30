import type { DashboardAttentionItem } from "@/features/dashboard/attention/types/dashboard-attention.types";

export type DashboardLens = "dashboard" | "engineering" | "finance" | "entrepreneurship" | "content";

export type DashboardLensData = {
  area: Exclude<DashboardLens, "dashboard">;
  financeBalance?: { currency: string; value: string | null }[];
  metrics: { label: string; value: string; detail: string; href: string }[];
  highlights: { label: string; detail: string; href: string }[];
  attention: DashboardAttentionItem[];
  attentionConfigured: boolean;
};
