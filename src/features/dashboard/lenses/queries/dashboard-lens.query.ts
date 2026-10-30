import { DateTime } from "luxon";
import { getEngineeringAnalyticsData } from "@/features/engineering/analytics/queries/engineering-analytics.query";
import { getEngineeringProjects } from "@/features/engineering/queries/engineering.query";
import { getFinancialPosition, sumPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { getCashFlow } from "@/features/finance/analytics/queries/cash-flow.query";
import { getFinanceAttention } from "@/features/finance/analytics/queries/finance-attention.query";
import { getBusinessOverview } from "@/features/entrepreneurship/analytics/queries/business-overview.query";
import { getContentAnalytics } from "@/features/content/analytics/queries/content-analytics.query";
import { getDomainActiveDays } from "@/features/sessions/timing/queries/domain-active-days.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatDuration, getPeriod } from "@/lib/dates/utils/period.util";
import { formatMoney } from "@/lib/money/utils/money.util";
import type { DashboardLensData } from "@/features/dashboard/lenses/types/dashboard-lens.types";

export async function getDashboardLensData(
  userId: string,
  area: DashboardLensData["area"],
): Promise<DashboardLensData> {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  if (!now.isValid) throw new Error(`Invalid application timezone: ${APP_TIMEZONE}`);

  if (area === "engineering") {
    const [analytics, projects] = await Promise.all([
      getEngineeringAnalyticsData(userId, "week", now),
      getEngineeringProjects(userId, "open"),
    ]);
    const evidenceCount = analytics.evidence.reduce((total, item) => total + item.count, 0);
    return {
      area,
      metrics: [
        { label: "Focused time", value: formatDuration(analytics.totalSeconds, true), detail: "This week · pauses excluded", href: "/engineering" },
        { label: "Active days", value: `${analytics.activeDays}`, detail: "Days with Engineering work", href: "/engineering" },
        { label: "Open projects", value: `${projects.length}`, detail: "Projects still in progress", href: "/engineering/projects" },
        { label: "Evidence recorded", value: `${evidenceCount}`, detail: "This week", href: "/engineering/evidence" },
      ],
      highlights: projects.slice(0, 3).map((project) => ({ label: project.name, detail: "Open project", href: `/engineering/projects/${project.id}` })),
      attention: [],
      attentionConfigured: false,
    };
  }

  if (area === "finance") {
    const [accounts, flow, attention] = await Promise.all([
      getFinancialPosition(userId, now.toJSDate()),
      getCashFlow(userId, getPeriod(now, "month")),
      getFinanceAttention(userId),
    ]);
    const balances = [...sumPosition(accounts).entries()];
    const currencies = [...flow.totals.entries()];
    const primaryFlow = currencies[0];
    return {
      area,
      financeBalance: balances.map(([currency, amount]) => ({
        currency,
        value: amount === null ? null : formatMoney(amount, currency),
      })),
      metrics: [
        { label: "Accounts", value: `${accounts.length}`, detail: "In your current position", href: "/finance/accounts" },
        { label: "Money in", value: currencies.length > 1 ? `${currencies.length} currencies` : primaryFlow ? formatMoney(primaryFlow[1].income, primaryFlow[0]) : "No entries", detail: currencies.length > 1 ? "See each currency in Finance" : "This month", href: "/finance/transactions" },
        { label: "Money out", value: currencies.length > 1 ? `${currencies.length} currencies` : primaryFlow ? formatMoney(primaryFlow[1].expense, primaryFlow[0]) : "No entries", detail: currencies.length > 1 ? "See each currency in Finance" : "This month", href: "/finance/transactions" },
        { label: "Needs review", value: `${attention.length}`, detail: "Finance items requiring action", href: "/finance" },
      ],
      highlights: accounts.slice(0, 3).map((account) => ({
        label: account.name,
        detail: account.balanceMinor === null ? `${account.currency} · Reconciliation needed` : formatMoney(account.balanceMinor, account.currency),
        href: `/finance/accounts/${account.id}`,
      })),
      attention: attention.map((item) => ({ id: item.id, text: item.text, href: item.href, area: "finance" })),
      attentionConfigured: true,
    };
  }

  if (area === "entrepreneurship") {
    const [data, activeDays] = await Promise.all([
      getBusinessOverview(userId, "week", now),
      getDomainActiveDays(userId, "entrepreneurship", getPeriod(now, "week"), now),
    ]);
    const interactions = data.facts.interactions.reduce((total, item) => total + item.count, 0);
    const focusedSeconds = data.facts.time.reduce((total, item) => total + item.seconds, 0);
    return {
      area,
      metrics: [
        { label: "Interactions", value: `${interactions}`, detail: "Recorded this week", href: "/entrepreneurship/interactions" },
        { label: "New companies", value: `${data.facts.companiesAdded}`, detail: "Added this week", href: "/entrepreneurship/market/companies" },
        { label: "Offers proposed", value: `${data.facts.offersProposed}`, detail: "Distinct offers this week", href: "/entrepreneurship/offers" },
        { label: "Focused work", value: formatDuration(focusedSeconds, true), detail: "This week · pauses excluded", href: "/entrepreneurship" },
        { label: "Active days", value: `${activeDays}`, detail: "Days with focused work this week", href: "/entrepreneurship" },
      ],
      highlights: data.nextActions.slice(0, 3).map((action) => ({ label: action.title, detail: action.dueOn ? `Follow-up · ${action.dueOn.toISOString().slice(0, 10)}` : "Next follow-up", href: action.companyId ? `/entrepreneurship/market/companies/${action.companyId}` : action.interactionId ? `/entrepreneurship/interactions/${action.interactionId}` : `/entrepreneurship/offers/${action.offerId}` })),
      attention: data.attention.map((item) => ({ id: item.id, text: item.text, href: item.href, area: "entrepreneurship" })),
      attentionConfigured: true,
    };
  }

  const [data, activeDays] = await Promise.all([
    getContentAnalytics(userId, "season"),
    getDomainActiveDays(userId, "content", getPeriod(now, "season"), now),
  ]);
  return {
    area,
    metrics: [
      { label: "Content created", value: `${data.contentCreated}`, detail: "This Season", href: "/content" },
      { label: "Variants made", value: `${data.variantsCreated}`, detail: "This Season", href: "/content" },
      { label: "Publications", value: `${data.publicationsMade}`, detail: "This Season", href: "/content" },
      { label: "Focused work", value: formatDuration(data.recordedSeconds, true), detail: "This Season · pauses excluded", href: "/content" },
      { label: "Active days", value: `${activeDays}`, detail: "Days with focused work this Season", href: "/content" },
    ],
    highlights: data.recentResults.slice(0, 3).map((item) => ({ label: item.contentTitle, detail: `${item.channelName} · ${item.format}`, href: item.href })),
    attention: [],
    attentionConfigured: false,
  };
}
