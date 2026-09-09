"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useTransition,
  type ReactNode,
} from "react";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
const Context = createContext<
  ((changes: Record<string, string | null>, replace?: boolean) => void) | null
>(null);
export function MarketFilters({
  initial,
  children,
}: {
  initial: string;
  children: ReactNode;
}) {
  const latest = useRef(initial);
  const router = useRouter();
  const [, start] = useTransition();
  useEffect(() => {
    const pop = () => {
      latest.current = location.search;
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  return (
    <Context.Provider
      value={(changes, replace = false) => {
        const params = new URLSearchParams(latest.current);
        params.delete("companies");
        if (Object.keys(changes).some((key) => ["q", "archived"].includes(key)))
          params.delete("cursor");
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) params.delete(key);
          else params.set(key, value);
        }
        latest.current = params.toString();
        start(() =>
          router[replace ? "replace" : "push"](
            `/entrepreneurship/market?${params}`,
            { scroll: false },
          ),
        );
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMarketFilterChange() {
  const context = useContext(Context);
  if (!context)
    throw new Error("Market filters require their section context.");
  return context;
}
export function MarketArchiveLink({
  href,
  field,
  value,
  children,
}: {
  href: string;
  field: string;
  value: string;
  children: ReactNode;
}) {
  const change = useMarketFilterChange();
  return (
    <Link
      className="business-text-link"
      scroll={false}
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        change({ [field]: value });
      }}
    >
      {children}
    </Link>
  );
}
