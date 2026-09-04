"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { EngineeringTechnologyIcon } from "@/features/engineering/technologies/components/engineering-technology-icon.component";
import { TECHNOLOGY_CATEGORY_LABELS } from "@/features/engineering/technologies/constants/engineering-technology.constants";
import { toTechnologySlug } from "@/features/engineering/technologies/utils/engineering-technology.util";
import type { EngineeringTechnologyOption } from "@/features/engineering/types/engineering.types";

type SelectedTechnology = EngineeringTechnologyOption & {
  isNewCustom?: boolean;
};

export function EngineeringTechStackField({
  catalog,
  initialTechnologies = [],
}: {
  catalog: EngineeringTechnologyOption[];
  initialTechnologies?: EngineeringTechnologyOption[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] =
    useState<SelectedTechnology[]>(initialTechnologies);
  const normalizedQuery = toTechnologySlug(query);
  const selectedIds = useMemo(
    () => new Set(selected.map((technology) => technology.id)),
    [selected],
  );
  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return catalog
      .filter((technology) => !selectedIds.has(technology.id))
      .filter(
        (technology) =>
          !search ||
          technology.name.toLowerCase().includes(search) ||
          technology.slug.includes(normalizedQuery),
      )
      .sort((left, right) => {
        const leftExact = left.slug === normalizedQuery ? 1 : 0;
        const rightExact = right.slug === normalizedQuery ? 1 : 0;
        if (leftExact !== rightExact) return rightExact - leftExact;
        if (left.isBuiltIn !== right.isBuiltIn) return left.isBuiltIn ? -1 : 1;
        return left.name.localeCompare(right.name);
      })
      .slice(0, 12);
  }, [catalog, normalizedQuery, query, selectedIds]);
  const catalogHasQuery = catalog.some(
    (technology) => technology.slug === normalizedQuery,
  );
  const selectedHasQuery = selected.some(
    (technology) => technology.slug === normalizedQuery,
  );
  const canAddCustom =
    Boolean(query.trim()) &&
    Boolean(normalizedQuery) &&
    !catalogHasQuery &&
    !selectedHasQuery;
  const optionCount = matches.length + (canAddCustom ? 1 : 0);

  function selectTechnology(technology: EngineeringTechnologyOption) {
    setSelected((current) => [...current, technology]);
    setQuery("");
    setActiveIndex(0);
  }

  function addCustomTechnology() {
    const name = query.trim().slice(0, 80);
    const slug = toTechnologySlug(name);
    if (!name || !slug || catalogHasQuery || selectedHasQuery) return;
    setSelected((current) => [
      ...current,
      {
        id: `new:${slug}`,
        name,
        slug,
        category: "OTHER",
        iconKey: null,
        isBuiltIn: false,
        isNewCustom: true,
      },
    ]);
    setQuery("");
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        optionCount ? Math.min(current + 1, optionCount - 1) : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const match = matches[activeIndex];
      if (match) selectTechnology(match);
      else if (canAddCustom) addCustomTechnology();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="engineering-form-wide engineering-tech-field"
      ref={containerRef}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget))
          setOpen(false);
      }}
    >
      <span className="field-label">
        Tech stack{" "}
        <span className="text-text-muted normal-case">— optional</span>
      </span>
      {selected.length > 0 && (
        <div
          className="engineering-selected-technologies"
          aria-label="Selected technologies"
        >
          {selected.map((technology) => (
            <span key={technology.id} data-testid="selected-technology">
              <EngineeringTechnologyIcon iconKey={technology.iconKey} />
              {technology.name}
              <button
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((item) => item.id !== technology.id),
                  )
                }
                aria-label={`Remove ${technology.name}`}
              >
                <X />
              </button>
              <input
                type="hidden"
                name={
                  technology.isNewCustom
                    ? "customTechnologyNames"
                    : "technologyIds"
                }
                value={technology.isNewCustom ? technology.name : technology.id}
              />
            </span>
          ))}
        </div>
      )}
      <div className="engineering-tech-combobox">
        <Search aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search React, PostgreSQL, Docker…"
          role="combobox"
          aria-expanded={open}
          aria-controls="engineering-technology-options"
          aria-autocomplete="list"
          aria-activedescendant={
            open && optionCount
              ? `engineering-technology-option-${activeIndex}`
              : undefined
          }
          data-testid="engineering-technology-search"
        />
      </div>
      {open && (
        <div
          className="engineering-tech-options"
          id="engineering-technology-options"
          role="listbox"
          aria-label="Technology options"
        >
          {matches.map((technology, index) => (
            <button
              key={technology.id}
              id={`engineering-technology-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectTechnology(technology)}
              data-testid={`engineering-technology-option-${technology.slug}`}
            >
              <EngineeringTechnologyIcon iconKey={technology.iconKey} />
              <span>
                <strong>{technology.name}</strong>
                <small>
                  {TECHNOLOGY_CATEGORY_LABELS[technology.category]}
                  {technology.isBuiltIn ? " · Built in" : " · Custom"}
                </small>
              </span>
            </button>
          ))}
          {canAddCustom && (
            <button
              id={`engineering-technology-option-${matches.length}`}
              type="button"
              role="option"
              aria-selected={activeIndex === matches.length}
              className={activeIndex === matches.length ? "active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCustomTechnology}
              data-testid="add-custom-technology"
            >
              <Plus />
              <span>
                <strong>Add “{query.trim()}”</strong>
                <small>Custom technology · only visible to you</small>
              </span>
            </button>
          )}
          {!matches.length && !canAddCustom && (
            <p>No other matching technologies.</p>
          )}
        </div>
      )}
      <p className="engineering-field-help">
        Technologies describe the project. They are not attributed to individual
        sessions.
      </p>
    </div>
  );
}
