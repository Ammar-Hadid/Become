"use client";

import { Input } from "@/components/ui/forms/input.component";
import { Card } from "@/components/ui/cards/card.component";
import Link from "next/link";
import { Archive, ArrowUpRight, Check, ListFilter, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { cn } from "@/lib/styles/utils/class-name.util";

type PastExploration = {
  id: string;
  href: string;
  name: string;
  scope: string;
  evidenceEntries: number;
  conversations: number;
  direction: string;
  statusDate: string;
  statusDateIso: string;
  archived: boolean;
};

export function PastExplorations({
  explorations,
}: {
  explorations: PastExploration[];
}) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const searchId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const archivedCount = explorations.filter(
    (exploration) => exploration.archived,
  ).length;
  const visibleExplorations = useMemo(
    () =>
      explorations.filter((exploration) => {
        if (exploration.archived && !showArchived) return false;
        if (!normalizedQuery) return true;

        return [
          exploration.name,
          exploration.scope,
          exploration.direction,
        ].some((value) =>
          value.toLocaleLowerCase("en").includes(normalizedQuery),
        );
      }),
    [explorations, normalizedQuery, showArchived],
  );

  const emptyMessage = normalizedQuery
    ? "No visible explorations match that search."
    : explorations.length === 0
      ? "When you pause or stop an exploration, you can return to it here."
      : !showArchived && archivedCount === explorations.length
        ? "Your archived explorations are tucked away. Use the filter to bring them back."
        : "There are no past explorations in this view.";

  return (
    <Card
      className="exploration-history exploration-past"
      aria-labelledby="past-explorations-title"
    >
      <header className="exploration-section-heading exploration-past-heading">
        <div>
          <h2 id="past-explorations-title">
            Past explorations{" "}
            <span className="business-count">{visibleExplorations.length}</span>
          </h2>
          <p>
            Paused and stopped work stays here. Use filters to include archives.
          </p>
        </div>
        <div className="exploration-past-tools">
          <label className="exploration-search" htmlFor={searchId}>
            <Search aria-hidden="true" />
            <span className="sr-only">Search past explorations</span>
            <Input
              id={searchId}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search past explorations…"
            />
          </label>
          <SubMenu
            label={
              showArchived
                ? "Filter past explorations, archived shown"
                : "Filter past explorations"
            }
            placement="bottom-end"
            closeOnSelect={false}
            menuClassName="exploration-filter-menu"
            trigger={(props) => (
              <button
                {...props}
                className="exploration-filter-button"
                data-active={showArchived || undefined}
              >
                <ListFilter aria-hidden="true" />
                {showArchived && (
                  <span
                    className="exploration-filter-indicator"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
          >
            <MenuItem
              icon={<Archive aria-hidden="true" />}
              role="menuitemcheckbox"
              checked={showArchived}
              onSelect={() => setShowArchived((visible) => !visible)}
            >
              <span>Show archived</span>
              <span className="exploration-filter-check" aria-hidden="true">
                {showArchived && <Check />}
              </span>
            </MenuItem>
          </SubMenu>
        </div>
      </header>

      <p className="exploration-results-summary" aria-live="polite">
        {normalizedQuery
          ? `${visibleExplorations.length} ${
              visibleExplorations.length === 1 ? "result" : "results"
            } for “${query.trim()}”`
          : showArchived
            ? `Showing all ${visibleExplorations.length} past explorations`
            : archivedCount
              ? `${archivedCount} archived ${
                  archivedCount === 1 ? "exploration is" : "explorations are"
                } hidden`
              : "Archived explorations are hidden by default"}
      </p>

      {visibleExplorations.length ? (
        <div className="exploration-history-list">
          {visibleExplorations.map((exploration) => (
            <Link
              key={exploration.id}
              href={exploration.href}
              className={cn(
                "exploration-history-row",
                exploration.archived && "exploration-history-row--archived",
              )}
            >
              <div className="exploration-history-copy">
                <h3>{exploration.name}</h3>
                <p>{exploration.scope || "No scope was recorded."}</p>
              </div>
              <dl className="exploration-history-facts">
                <div>
                  <dd>{exploration.evidenceEntries}</dd>
                  <dt>
                    {exploration.evidenceEntries === 1
                      ? "evidence entry"
                      : "evidence entries"}
                  </dt>
                </div>
                <div>
                  <dd>{exploration.conversations}</dd>
                  <dt>
                    {exploration.conversations === 1
                      ? "conversation"
                      : "conversations"}
                  </dt>
                </div>
              </dl>
              <div className="exploration-history-state">
                <span
                  className={
                    exploration.archived
                      ? "exploration-archive-badge"
                      : "exploration-direction-badge"
                  }
                >
                  {exploration.archived ? "Archived" : exploration.direction}
                </span>
                <time dateTime={exploration.statusDateIso}>
                  {exploration.statusDate}
                </time>
              </div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="exploration-history-empty">
          <Archive aria-hidden="true" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </Card>
  );
}
