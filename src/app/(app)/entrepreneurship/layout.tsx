import { BusinessHeader } from "@/features/entrepreneurship/shared/components/business-header.component";
import "@/features/entrepreneurship/styles/entrepreneurship.css";
export default function EntrepreneurshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell business-shell">
      <BusinessHeader />
      {children}
    </div>
  );
}
