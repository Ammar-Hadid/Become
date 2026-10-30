import type { ReactNode } from "react";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import "@/features/content/styles/content.css";
import "@/features/content/styles/content-workspace.css";

export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <Workspace area="content" className="content-experience">
      {children}
    </Workspace>
  );
}
