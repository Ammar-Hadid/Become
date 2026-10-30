import { Workspace } from "@/components/ui/workspace/workspace.component";
import { DirectionNavigation } from "@/features/direction/navigation/components/direction-navigation.component";
import "@/features/direction/styles/direction.css";
import "@/features/direction/thinking/styles/thinking.css";
import "@/features/direction/styles/direction-workspace.css";

export default function DirectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Workspace area="direction" className="page-shell direction-shell">
      <DirectionNavigation />
      {children}
    </Workspace>
  );
}
