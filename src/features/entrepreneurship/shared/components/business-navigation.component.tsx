"use client";
import { usePathname } from "next/navigation";
import {
  Compass,
  Building2,
  MessagesSquare,
  ScanSearch,
  FileText,
} from "lucide-react";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";
export function BusinessNavigation() {
  const path = usePathname();
  return (
    <WorkspaceNavigation
      label="Entrepreneurship navigation"
      items={[
        {
          href: "/entrepreneurship/history",
          label: "Overview",
          icon: <Compass />,
        },
        {
          href: "/entrepreneurship/audience",
          label: "Audience",
          icon: <Building2 />,
          active: ["/audience", "/people", "/segments", "/market"].some(
            (section) => path.startsWith(`/entrepreneurship${section}`),
          ),
        },
        {
          href: "/entrepreneurship/evidence",
          label: "Evidence",
          icon: <MessagesSquare />,
          active: ["/evidence", "/interactions", "/observations"].some(
            (section) => path.startsWith(`/entrepreneurship${section}`),
          ),
        },
        {
          href: "/entrepreneurship/problems",
          label: "Problems",
          icon: <ScanSearch />,
        },
        {
          href: "/entrepreneurship/offers",
          label: "Offers",
          icon: <FileText />,
        },
      ]}
    />
  );
}
