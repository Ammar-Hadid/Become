"use client";

import {
  Compass,
  Target,
  FlaskConical,
  Lightbulb,
  Split,
  Library,
  BookOpen,
} from "lucide-react";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";

export function DirectionNavigation() {
  return (
    <WorkspaceNavigation
      label="Direction navigation"
      items={[
        {
          href: "/direction",
          label: "This Season",
          icon: <Compass />,
          exact: true,
        },
        { href: "/direction/goals", label: "Goals", icon: <Target /> },
        {
          href: "/direction/experiments",
          label: "Experiments",
          icon: <FlaskConical />,
        },
        { href: "/direction/ideas", label: "Ideas", icon: <Lightbulb /> },
        { href: "/direction/decisions", label: "Decisions", icon: <Split /> },
        {
          href: "/direction/seasons",
          label: "Season library",
          icon: <Library />,
        },
        { href: "/reviews", label: "Reviews", icon: <BookOpen /> },
      ]}
    />
  );
}
