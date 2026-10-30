"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import type { DashboardAttentionItem } from "@/features/dashboard/attention/types/dashboard-attention.types";
import type { DashboardLens } from "@/features/dashboard/lenses/types/dashboard-lens.types";

const areaNames: Record<DashboardLens, string> = {
  dashboard: "Dashboard",
  engineering: "Engineering",
  finance: "Finance",
  entrepreneurship: "Entrepreneurship",
  content: "Content",
};

export function DashboardAttentionWidget({
  area,
  items,
  configured = true,
}: {
  area: DashboardLens;
  items: DashboardAttentionItem[];
  configured?: boolean;
}) {
  const { play } = useInterfaceSound();
  const [index, setIndex] = useState(0);
  const current = items.length ? items[index % items.length] : null;

  function showItem(next: number) {
    play("controlConfirmed");
    setIndex(next);
  }

  return (
    <section className="dashboard-v2-card material-glass dashboard-v2-attention" aria-labelledby={`dashboard-attention-${area}-title`}>
      <div className="dashboard-v2-card-heading">
        <div className="dashboard-v2-title-group"><IconFrame treatment="compact" area={area}><CircleAlert /></IconFrame><h2 className="type-widget-title" id={`dashboard-attention-${area}-title`}>Needs Attention</h2></div>
        {items.length > 1 && <div className="dashboard-v2-card-arrows"><Button variant="ghost" size="icon" type="button" aria-label={`Previous ${area} attention item`} onClick={() => showItem((index + items.length - 1) % items.length)}><ChevronLeft /></Button><Button variant="ghost" size="icon" type="button" aria-label={`Next ${area} attention item`} onClick={() => showItem((index + 1) % items.length)}><ChevronRight /></Button></div>}
      </div>
      {!configured ? (
        <div className="dashboard-v2-attention-unconfigured">
          <p className="type-body">{areaNames[area]} attention checks are not configured yet.</p>
          <p className="type-caption">Action items will appear here when those checks are added.</p>
        </div>
      ) : current ? (
        <Link className="dashboard-v2-attention-link" href={current.href}>
          {current.area === "season" ? <BookOpen aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <span className="dashboard-v2-attention-copy"><span className="type-body">{current.text}</span>{current.detail && <span className="type-caption dashboard-v2-attention-detail">{current.detail}</span>}</span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <EmptyState className="dashboard-v2-attention-empty" pattern="attention-resolved" area={area} size="compact" title={area === "dashboard" ? "All clear" : "No flagged actions"} description={area === "dashboard" ? "There is nothing that needs attention right now." : `Nothing currently needs action in ${areaNames[area]}.`} />
      )}
      {configured && items.length > 0 && <p className="type-caption dashboard-v2-card-footnote">{items.length} item{items.length === 1 ? "" : "s"} needing attention</p>}
    </section>
  );
}
