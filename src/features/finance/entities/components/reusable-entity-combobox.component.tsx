"use client";

import { Plus } from "lucide-react";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import type { FinanceFormState } from "@/features/finance/types/finance.types";
import { normalizeReusableEntityName } from "@/features/finance/entities/utils/reusable-entity.util";
import { useFinanceFormNestedPending } from "@/features/finance/components/finance-form.component";

export type ReusableEntityOption = { id: string; name: string };

export function ReusableEntityCombobox({
  label,
  entityName,
  idFieldName,
  queryFieldName,
  options: initialOptions,
  initialId,
  initialName,
  createAction,
  placeholder,
}: {
  label: string;
  entityName: string;
  idFieldName: string;
  queryFieldName: string;
  options: ReusableEntityOption[];
  initialId?: string | null;
  initialName?: string | null;
  createAction: (data: FormData) => Promise<FinanceFormState>;
  placeholder: string;
}) {
  const inputId = useId();
  const listboxId = useId();
  const errorId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialMatch = initialOptions.find(
    (option) =>
      initialName &&
      normalizeReusableEntityName(option.name) ===
        normalizeReusableEntityName(initialName),
  );
  const [options, setOptions] = useState(initialOptions);
  const [query, setQuery] = useState(initialName ?? initialMatch?.name ?? "");
  const [selectedId, setSelectedId] = useState(
    initialId ?? initialMatch?.id ?? "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const setFormNestedPending = useFinanceFormNestedPending();
  const normalizedQuery = normalizeReusableEntityName(query);
  const matches = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 12);
    return options
      .filter((option) =>
        normalizeReusableEntityName(option.name).includes(normalizedQuery),
      )
      .sort((left, right) => {
        const leftExact =
          normalizeReusableEntityName(left.name) === normalizedQuery ? 1 : 0;
        const rightExact =
          normalizeReusableEntityName(right.name) === normalizedQuery ? 1 : 0;
        return rightExact - leftExact || left.name.localeCompare(right.name);
      })
      .slice(0, 12);
  }, [options, normalizedQuery]);
  const exactMatch = options.some(
    (option) => normalizeReusableEntityName(option.name) === normalizedQuery,
  );
  const canCreate = Boolean(normalizedQuery) && !exactMatch;
  const optionCount = matches.length + (canCreate ? 1 : 0);

  function selectOption(option: ReusableEntityOption) {
    setQuery(option.name);
    setSelectedId(option.id);
    setError(null);
    setOpen(false);
    setActiveIndex(0);
  }

  function createOption() {
    const name = query.trim().slice(0, 120);
    if (!name || pending) return;
    const data = new FormData();
    data.set("name", name);
    setFormNestedPending?.(true);
    startTransition(async () => {
      try {
        const result = await createAction(data);
        if (result.error || !result.id) {
          setError(result.error ?? `Could not create ${entityName}.`);
          return;
        }
        const option = { id: result.id, name };
        setOptions((current) => [
          ...current.filter((item) => item.id !== option.id),
          option,
        ]);
        selectOption(option);
      } catch {
        setError(`Could not create ${entityName}. Please try again.`);
      } finally {
        setFormNestedPending?.(false);
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((current) =>
          optionCount ? Math.min(current + 1, optionCount - 1) : 0,
        );
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open && optionCount) {
      event.preventDefault();
      const match = matches[activeIndex];
      if (match) selectOption(match);
      else if (canCreate) createOption();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div
      className="relative block min-w-0"
      ref={containerRef}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget))
          setOpen(false);
      }}
    >
      <label className="field-label" htmlFor={inputId}>
        {label} <span className="text-text-muted normal-case">— optional</span>
      </label>
      <input type="hidden" name={idFieldName} value={selectedId} />
      <input
        id={inputId}
        className="text-input"
        name={queryFieldName}
        value={query}
        maxLength={120}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-busy={pending}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        aria-activedescendant={
          open && optionCount ? `${listboxId}-option-${activeIndex}` : undefined
        }
        disabled={pending}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId("");
          setError(null);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div
          className="border-border bg-surface-elevated mt-xs rounded-control p-xs absolute right-0 left-0 z-20 max-h-72 overflow-auto border shadow-2xl"
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
        >
          {matches.map((option, index) => (
            <button
              className={`rounded-control px-md py-sm text-body flex w-full text-left hover:bg-white/5 ${
                index === activeIndex ? "bg-white/5" : ""
              }`}
              id={`${listboxId}-option-${index}`}
              key={option.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.name}
            </button>
          ))}
          {canCreate && (
            <button
              className={`text-primary gap-sm rounded-control px-md py-sm text-body flex w-full items-center text-left hover:bg-white/5 ${
                activeIndex === matches.length ? "bg-white/5" : ""
              }`}
              id={`${listboxId}-option-${matches.length}`}
              type="button"
              role="option"
              aria-selected={activeIndex === matches.length}
              disabled={pending}
              onMouseDown={(event) => event.preventDefault()}
              onClick={createOption}
            >
              <Plus aria-hidden="true" className="size-4" />
              {pending ? `Creating ${entityName}…` : `Create “${query.trim()}”`}
            </button>
          )}
          {!optionCount && (
            <span className="text-text-muted px-md py-sm text-body block">
              No matches. Type a name to create{" "}
              {entityName === "category" ? "one" : `a ${entityName}`}.
            </span>
          )}
        </div>
      )}
      {error && (
        <p className="form-error mt-sm" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
