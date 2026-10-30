export type DashboardAttentionItem = {
  id: string;
  text: string;
  href: string;
  area: "season" | "engineering" | "finance" | "entrepreneurship" | "content";
  detail?: string;
};
