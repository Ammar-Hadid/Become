"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createRequestDeadline } from "@/lib/http/utils/request-deadline.util";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { EmptyState, type EmptyStatePattern } from "@/components/ui/empty-states/empty-state.component";
import { AreaIcon } from "@/components/ui/icons/area-icon.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { prefersReducedMotion, resolveMotionFallbackMs } from "@/components/ui/motion/utils/motion-time.util";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { CotsDailyMessage } from "@/features/dashboard/components/cots-daily-message.component";
import { DashboardAttentionWidget } from "@/features/dashboard/attention/components/dashboard-attention-widget.component";
import { DashboardGoalWidget } from "@/features/dashboard/goals/components/dashboard-goal-widget.component";
import type { DashboardGoal } from "@/features/dashboard/goals/types/dashboard-goal.types";
import { cotsDailyPreviewMessages } from "@/features/dashboard/lenses/constants/cots-daily-preview.constants";
import { FinanceBalanceWidget } from "@/features/dashboard/lenses/components/finance-balance-widget.component";
import type { DashboardLens, DashboardLensData } from "@/features/dashboard/lenses/types/dashboard-lens.types";

const lenses: { area: DashboardLens; label: string }[] = [
  { area: "dashboard", label: "Dashboard" },
  { area: "engineering", label: "Engineering" },
  { area: "finance", label: "Finance" },
  { area: "entrepreneurship", label: "Entrepreneurship" },
  { area: "content", label: "Content" },
];

type LensTransition = { from: DashboardLens; to: DashboardLens; direction: "forward" | "backward" };

const emptyPatterns: Record<DashboardLensData["area"], EmptyStatePattern> = {
  engineering: "project-anatomy",
  finance: "account-gateway",
  entrepreneurship: "audience-constellation",
  content: "editorial-canvas",
};

function MetricCard({ metric }: { metric: DashboardLensData["metrics"][number] }) {
  return (
    <Link href={metric.href} className="dashboard-v2-card material-glass dashboard-lens-metric">
      <span className="type-label">{metric.label}</span>
      <span className="type-metric-lg dashboard-lens-metric-value">{metric.value}</span>
      <span className="type-caption dashboard-lens-metric-detail">{metric.detail}</span>
      <ArrowUpRight aria-hidden="true" className="dashboard-lens-metric-arrow" />
    </Link>
  );
}

function DomainWidgets({
  data,
  firstName,
  goals,
  domains,
}: {
  data: DashboardLensData;
  firstName: string;
  goals: DashboardGoal[];
  domains: { id: string; slug: string }[];
}) {
  const domainId = domains.find((domain) => domain.slug === data.area)?.id;
  const domainGoals = domainId ? goals.filter((goal) => goal.domainIds.includes(domainId)) : [];
  const hasBalance = data.area === "finance";
  const leadingMetrics = data.metrics.slice(0, hasBalance ? 1 : 2);
  const remainingMetrics = data.metrics.slice(hasBalance ? 1 : 2);
  return (
    <div className="dashboard-lens-domain" data-lens={data.area}>
      <div className="dashboard-v2-grid dashboard-v2-grid-top dashboard-lens-top">
        {hasBalance && <FinanceBalanceWidget balances={data.financeBalance ?? []} />}
        {leadingMetrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        <CotsDailyMessage area={data.area} message={cotsDailyPreviewMessages[data.area].replace("{name}", firstName)} />
      </div>
      <div className="dashboard-lens-metrics" data-count={remainingMetrics.length}>
        {remainingMetrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </div>
      <div className="dashboard-lens-support">
        <section className="dashboard-v2-card material-glass dashboard-lens-highlights" aria-labelledby="dashboard-lens-highlights-title">
          <div className="dashboard-v2-card-heading">
            <div className="dashboard-v2-title-group"><AreaIcon area={data.area} treatment="compact" /><h2 className="type-widget-title" id="dashboard-lens-highlights-title">{data.area === "finance" ? "Account positions" : data.area === "entrepreneurship" ? "Next follow-ups" : data.area === "content" ? "Recent results" : "Open projects"}</h2></div>
            <span className="type-caption dashboard-v2-muted">{data.highlights.length} shown</span>
          </div>
          {data.highlights.length ? (
            <div className="dashboard-lens-highlight-list">
              {data.highlights.map((item, index) => (
                <Link className="dashboard-lens-highlight" href={item.href} key={`${item.href}-${index}`}>
                  <span><strong className="type-body">{item.label}</strong><small className="type-caption">{item.detail}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              pattern={emptyPatterns[data.area]}
              area={data.area}
              size="compact"
              title={data.area === "engineering" ? "No open projects yet" : data.area === "finance" ? "No accounts yet" : data.area === "entrepreneurship" ? "No follow-ups due" : "No measured releases yet"}
              description={data.area === "engineering" ? "Start a project to see its progress here." : data.area === "finance" ? "Add an account to see its position here." : data.area === "entrepreneurship" ? "Your next market follow-ups will appear here." : "Recorded publication results will appear here."}
              className="dashboard-lens-empty"
            />
          )}
        </section>
        <DashboardGoalWidget area={data.area} goals={domainGoals} />
        <DashboardAttentionWidget area={data.area} items={data.attention} configured={data.attentionConfigured} />
      </div>
    </div>
  );
}

export function DashboardLenses({
  children,
  firstName,
  goals,
  domains,
}: {
  children: ReactNode;
  firstName: string;
  goals: DashboardGoal[];
  domains: { id: string; slug: string }[];
}) {
  const { play } = useInterfaceSound();
  const [selected, setSelected] = useState<DashboardLens>("dashboard");
  const [visible, setVisible] = useState<DashboardLens>("dashboard");
  const [transition, setTransition] = useState<LensTransition | null>(null);
  const [cache, setCache] = useState<Partial<Record<DashboardLens, DashboardLensData>>>({});
  const [error, setError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected === "dashboard" || cache[selected]) return;
    const controller = new AbortController();
    const deadline = createRequestDeadline(15_000, controller.signal);
    fetch(`/api/dashboard/lenses?area=${selected}`, {
      signal: deadline.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this lens");
        return response.json() as Promise<DashboardLensData>;
      })
      .then((data) => { setCache((current) => ({ ...current, [data.area]: data })); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(deadline.dispose);
    return () => { controller.abort(); deadline.dispose(); };
  }, [selected, cache]);

  useEffect(() => {
    if (transition || selected === visible || (selected !== "dashboard" && !cache[selected])) return;
    const frame = window.requestAnimationFrame(() => {
      const content = contentRef.current;
      if (content) content.style.minHeight = `${Math.ceil(content.getBoundingClientRect().height)}px`;
      if (prefersReducedMotion()) {
        setVisible(selected);
        return;
      }
      setTransition({
        from: visible,
        to: selected,
        direction: lenses.findIndex((lens) => lens.area === selected) > lenses.findIndex((lens) => lens.area === visible) ? "forward" : "backward",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cache, selected, transition, visible]);

  useEffect(() => {
    if (!transition) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => { setVisible(transition.to); setTransition(null); };
    const finishForReducedMotion = () => { if (reducedMotion.matches) finish(); };
    const fallback = window.setTimeout(finish, resolveMotionFallbackMs("surface"));
    reducedMotion.addEventListener("change", finishForReducedMotion);
    return () => {
      window.clearTimeout(fallback);
      reducedMotion.removeEventListener("change", finishForReducedMotion);
    };
  }, [transition]);

  useLayoutEffect(() => {
    if (transition) return;
    const content = contentRef.current;
    const panel = content?.querySelector<HTMLElement>(".dashboard-lens-panel");
    if (!content || !panel || !content.style.minHeight) return;
    const releaseHeightWhenSafe = () => {
      const excessHeight = Math.max(0, content.getBoundingClientRect().height - panel.getBoundingClientRect().height);
      const naturalPageHeight = document.documentElement.scrollHeight - excessHeight;
      if (window.scrollY === 0 || window.scrollY + window.innerHeight <= naturalPageHeight) content.style.minHeight = "";
    };
    releaseHeightWhenSafe();
    if (!content.style.minHeight) return;
    const observer = new ResizeObserver(releaseHeightWhenSafe);
    observer.observe(panel);
    window.addEventListener("scroll", releaseHeightWhenSafe, { passive: true });
    window.addEventListener("resize", releaseHeightWhenSafe);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", releaseHeightWhenSafe);
      window.removeEventListener("resize", releaseHeightWhenSafe);
    };
  }, [transition, visible]);

  function chooseLens(area: DashboardLens) {
    if (area === selected) return;
    play("controlConfirmed");
    setError(false);
    setSelected(area);
  }

  const loading = selected !== visible && selected !== "dashboard" && !cache[selected] && !error;
  const active = transition?.to ?? visible;
  const renderLens = (area: DashboardLens) => {
    if (area === "dashboard") return children;
    const data = cache[area];
    return data ? <DomainWidgets data={data} firstName={firstName} goals={goals} domains={domains} /> : null;
  };
  return (
    <section className="dashboard-lenses" aria-label="Dashboard lenses" data-lens={active}>
      <div className="dashboard-lens-toolbar">
        <div className="dashboard-lens-buttons" role="group" aria-label="Choose dashboard lens">
          {lenses.map((lens) => (
            <Button
              key={lens.area}
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-lens-button"
              data-lens={lens.area}
              aria-pressed={active === lens.area}
              aria-busy={loading && selected === lens.area}
              aria-controls="dashboard-lens-widgets"
              onClick={() => chooseLens(lens.area)}
            >
              {loading && selected === lens.area ? <LoadingIndicator area={lens.area} label={`Loading ${lens.label} lens`} className="dashboard-lens-button-loader" /> : <AreaIcon area={lens.area} treatment="bare" />}
              <span>{lens.label}</span>
            </Button>
          ))}
        </div>
      </div>
      {error && <div className="dashboard-lens-status dashboard-v2-card material-glass" role="alert"><p className="type-body">This lens could not load.</p><Button type="button" variant="secondary" onClick={() => { setError(false); setCache((current) => ({ ...current })); }}>Try again</Button></div>}
      <div id="dashboard-lens-widgets" ref={contentRef} className="dashboard-lens-content" data-direction={transition?.direction} aria-live="polite">
        {transition ? (
          <>
            <div className="dashboard-lens-panel" data-phase="outgoing" aria-hidden="true" inert>{renderLens(transition.from)}</div>
            <div className="dashboard-lens-panel" data-phase="incoming" onAnimationEnd={(event) => { if (event.target === event.currentTarget) { setVisible(transition.to); setTransition(null); } }}>{renderLens(transition.to)}</div>
          </>
        ) : <div className="dashboard-lens-panel">{renderLens(visible)}</div>}
      </div>
    </section>
  );
}
