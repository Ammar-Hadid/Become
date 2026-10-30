import type { ReactNode } from "react";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";
import "@/features/engineering/styles/engineering-workspace.css";

export default function EngineeringLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Workspace area="engineering" className="engineering-workspace">
      <div className="engineering-workspace-navigation">
        <WorkspaceNavigation
          label="Engineering"
          items={[
            { href: "/engineering", label: "Overview", exact: true },
            { href: "/engineering/projects", label: "Projects" },
            { href: "/engineering/evidence", label: "Evidence" },
          ]}
        />
      </div>
      {children}
    </Workspace>
  );
}
