"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import type { DashboardGoal } from "@/features/dashboard/goals/types/dashboard-goal.types";
import type { DashboardLens } from "@/features/dashboard/lenses/types/dashboard-lens.types";

const areaNames: Record<DashboardLens, string> = {
  dashboard: "this Season",
  engineering: "Engineering",
  finance: "Finance",
  entrepreneurship: "Entrepreneurship",
  content: "Content",
};

export function DashboardGoalWidget({
  area,
  goals,
}: {
  area: DashboardLens;
  goals: DashboardGoal[];
}) {
  const { play } = useInterfaceSound();
  const [index, setIndex] = useState(0);
  const currentGoal = goals.length ? goals[index % goals.length] : null;

  function showGoal(next: number) {
    play("controlConfirmed");
    setIndex(next);
  }

  return (
    <section className="dashboard-v2-card material-glass dashboard-v2-goal" aria-labelledby={`dashboard-goal-${area}-title`}>
      <div className="dashboard-v2-card-heading">
        <div className="dashboard-v2-title-group"><IconFrame treatment="compact" area={area}><Target /></IconFrame><h2 className="type-widget-title" id={`dashboard-goal-${area}-title`}>Goal</h2></div>
        {goals.length > 1 && <div className="dashboard-v2-card-arrows"><Button variant="ghost" size="icon" type="button" aria-label={`Previous ${area} goal`} onClick={() => showGoal((index + goals.length - 1) % goals.length)}><ChevronLeft /></Button><Button variant="ghost" size="icon" type="button" aria-label={`Next ${area} goal`} onClick={() => showGoal((index + 1) % goals.length)}><ChevronRight /></Button></div>}
      </div>
      {currentGoal ? (
        <>
          <Link className="dashboard-v2-goal-name type-body" href={`/direction/goals/${currentGoal.id}`}>{currentGoal.title}<ArrowRight aria-hidden="true" /></Link>
          <p className="dashboard-v2-goal-count"><strong className="type-metric-lg">{currentGoal.reached}</strong><span className="type-metric-md"> / {currentGoal.total}</span></p>
          <ProgressIndicator variant="plasma-core" value={currentGoal.reached} max={currentGoal.total || 1} label={`${currentGoal.reached} of ${currentGoal.total} goal criteria reached`} area={area} />
          <p className="type-caption dashboard-v2-card-footnote">Small steps. Big future.</p>
        </>
      ) : (
        <EmptyState
          className="dashboard-v2-goal-empty"
          pattern="goal-trajectory"
          area={area}
          size="compact"
          title={area === "dashboard" ? "No Season goal yet" : "No goal linked"}
          description={area === "dashboard" ? "Add a goal to give this Season a clear direction." : `Link a goal to ${areaNames[area]} in Direction to see its progress here.`}
        />
      )}
    </section>
  );
}
