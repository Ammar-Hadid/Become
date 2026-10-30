"use client";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";
import { EXPLORATION_WORKSPACES } from "@/features/entrepreneurship/explorations/constants/exploration-workspace.constants";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
export function ExplorationNavigation({ nicheId }: { nicheId: string }) {
  return (
    <WorkspaceNavigation
      label="Exploration workspaces"
      items={EXPLORATION_WORKSPACES.map((item) => ({
        href: explorationWorkspaceHref(nicheId, item.slug),
        label: item.label,
      }))}
    />
  );
}
