"use client";

import { Search } from "lucide-react";
import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const statuses = [
  { value: "", label: "All states" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "CONCLUDED", label: "Concluded" },
] as const;

export function DirectionListFilters({
  action,
  entity,
  search,
  status,
  archived,
}: {
  action: "/direction/goals" | "/direction/experiments";
  entity: "goals" | "experiments";
  search: string;
  status: string;
  archived: boolean;
}) {
  const router = useRouter();

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const query = String(data.get("search") ?? "").trim();
    const nextStatus = String(data.get("status") ?? "");
    if (query) params.set("search", query);
    if (nextStatus) params.set("status", nextStatus);
    if (data.get("archived") === "true") params.set("archived", "true");
    router.push(`${action}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <form
      key={`${search}-${status}-${archived}`}
      className="direction-search direction-search--filters"
      action={action}
      onSubmit={apply}
    >
      <div className="direction-search-input">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor={`direction-${entity}-search`}>
          Search {entity}
        </label>
        <input
          id={`direction-${entity}-search`}
          name="search"
          defaultValue={search}
          placeholder={`Search your ${entity}…`}
        />
      </div>
      <label>
        <span className="sr-only">State</span>
        <span className="select-wrap">
          <select name="status" defaultValue={status}>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className="direction-archive-toggle">
        <input
          type="checkbox"
          name="archived"
          value="true"
          defaultChecked={archived}
        />
        <span>Archived</span>
      </label>
      <button type="submit">Apply</button>
      {(search || status || archived) && (
        <Link href={action} scroll={false}>
          Clear
        </Link>
      )}
    </form>
  );
}
