"use client";
import { Input } from "@/components/ui/forms/input.component";
import { useEffect, useRef, useState } from "react";
import { useMarketFilterChange } from "@/features/entrepreneurship/market/components/market-filters.component";

export function CompanySearch({ search }: { search: string }) {
  const changeFilters = useMarketFilterChange();
  const [query, setQuery] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const pop = () => {
      if (timer.current) clearTimeout(timer.current);
      setQuery(new URLSearchParams(location.search).get("q") ?? "");
    };
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <div className="business-search">
      <label className="field-label" htmlFor="company-search">
        Search companies
      </label>
      <Input
        id="company-search"
        type="search"

        autoComplete="off"
        maxLength={120}
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(
            () => changeFilters({ q: value.trim() || null }, true),
            180,
          );
        }}
        placeholder="Search company names…"
      />
    </div>
  );
}
