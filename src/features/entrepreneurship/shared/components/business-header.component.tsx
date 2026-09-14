"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BusinessNavigation } from "@/features/entrepreneurship/shared/components/business-navigation.component";
export function BusinessHeader() {
  const path = usePathname();
  if (path.startsWith("/entrepreneurship/explorations/")) return null;
  const home = path === "/entrepreneurship";
  return (
    <>
      {!home && (
        <Link href="/entrepreneurship" className="business-back">
          ← Explorations
        </Link>
      )}
      <header className="business-masthead">
        <div>
          <p className="eyebrow">
            {home ? "Follow your curiosity" : "Across every exploration"}
          </p>
          <h1>{home ? "Entrepreneurship" : "Global history"}</h1>
        </div>
        <p>
          {home
            ? "Explore. Listen. Decide what’s worth pursuing."
            : "The audiences, evidence and offers you’ve kept."}
        </p>
      </header>
      {!home && <BusinessNavigation />}
    </>
  );
}
