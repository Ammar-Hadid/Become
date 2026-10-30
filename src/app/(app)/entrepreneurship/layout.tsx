import { Workspace } from "@/components/ui/workspace/workspace.component";
import { BusinessHeader } from "@/features/entrepreneurship/shared/components/business-header.component";
import "@/features/entrepreneurship/styles/entrepreneurship.css";
export default function EntrepreneurshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Workspace area="entrepreneurship" className="page-shell business-shell">
      <BusinessHeader />
      {children}
    </Workspace>
  );
}
