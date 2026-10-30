"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkspaceHeader } from "@/components/ui/workspace/workspace.component";
import { BusinessNavigation } from "@/features/entrepreneurship/shared/components/business-navigation.component";
export function BusinessHeader() {
  const path = usePathname();
  if (path.startsWith("/entrepreneurship/explorations/")) return null;
  const home = path === "/entrepreneurship";
  return (
    <>
      {!home && (
        <Link href="/entrepreneurship" className="business-back">
          <ArrowLeft aria-hidden="true" /> Explorations
        </Link>
      )}
      <WorkspaceHeader
        eyebrow={home ? "Entrepreneurship" : "Your complete record"}
        title={
          home ? "Find your next opportunity." : "Across your explorations"
        }
        description={
          home
            ? "Start with a question. Learn from real people. Decide what to pursue."
            : "Find the people, evidence and offers you have kept."
        }
      />
      {!home && <BusinessNavigation />}
    </>
  );
}
