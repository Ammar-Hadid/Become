"use client";

import { Plus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
import { normalizeReusableEntityName } from "@/lib/validation/utils/canonical-name.util";
import { useRecordFormNestedPending } from "@/components/ui/forms/record-form.component";

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
  deferCreation = false,
  searchAction,
  selectedOptions,
  onSelectionChange,
  onQueryChange,
  queryValue,
  optional = true,
  required = false,
}: {
  selectedOptions?: ReusableEntityOption[];
  onSelectionChange?: (options: ReusableEntityOption[]) => void;
  onQueryChange?: (query: string) => void;
  queryValue?: string;
  optional?: boolean;
  required?: boolean;
  label: string;
  entityName: string;
  idFieldName: string;
  queryFieldName: string;
  options: ReusableEntityOption[];
  initialId?: string | null;
  initialName?: string | null;
  deferCreation?: boolean;
  searchAction?: (query: string) => Promise<ReusableEntityOption[]>;
  createAction?: (data: FormData) => Promise<RecordFormState>;
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
  const [localQuery, setLocalQuery] = useState(
    initialName ??
      initialMatch?.name ??
      initialOptions.find((o) => o.id === initialId)?.name ??
      "",
  );
  const query = queryValue ?? localQuery;
  function setQuery(value: string) {
    setLocalQuery(value);
    onQueryChange?.(value);
  }
  const [selectedId, setSelectedId] = useState(
    initialId ?? initialMatch?.id ?? "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const setFormNestedPending = useRecordFormNestedPending();
  useEffect(() => {
    if (!searchAction || !open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchAction(query)
        .then((results) => {
          if (!cancelled) {
            setOptions(results);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Search could not be loaded. Try again.");
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchAction, open]);
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
        const leftPrefix = normalizeReusableEntityName(left.name).startsWith(
          normalizedQuery,
        )
          ? 1
          : 0;
        const rightPrefix = normalizeReusableEntityName(right.name).startsWith(
          normalizedQuery,
        )
          ? 1
          : 0;
        return (
          rightExact - leftExact ||
          rightPrefix - leftPrefix ||
          left.name.localeCompare(right.name)
        );
      })
      .slice(0, 12);
  }, [options, normalizedQuery]);
  const exactMatch = options.some(
    (option) => normalizeReusableEntityName(option.name) === normalizedQuery,
  );
  const canCreate =
    Boolean(createAction || deferCreation) &&
    Boolean(normalizedQuery) &&
    !exactMatch;
  const optionCount = matches.length + (canCreate ? 1 : 0);

  function selectOption(option: ReusableEntityOption) {
    if (selectedOptions) {
      onSelectionChange?.([
        ...selectedOptions.filter((o) => o.id !== option.id),
        option,
      ]);
      setLocalQuery("");
      setSelectedId("");
      setOpen(false);
      return;
    }
    setQuery(option.name);
    setSelectedId(option.id);
    setError(null);
    setOpen(false);
    setActiveIndex(0);
  }

  function createOption() {
    const name = query.trim().slice(0, 120);
    if (!name || pending) return;
    if (deferCreation) {
      setSelectedId("");
      setOpen(false);
      setError(null);
      return;
    }
    if (!createAction) return;
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
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
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
        {label}{" "}
        {optional && (
          <span className="text-text-muted normal-case">— optional</span>
        )}
      </label>
      {selectedOptions && (
        <div className="gap-sm my-sm flex flex-wrap">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className={`gap-sm rounded-control px-md py-sm text-body inline-flex items-center ${["bg-primary/10 text-primary", "bg-success/10 text-success", "bg-warning/10 text-warning"][[...option.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 3]}`}
            >
              <span>{option.name}</span>
              <button
                type="button"
                className="p-sm"
                aria-label={`Remove ${option.name}`}
                onClick={() =>
                  onSelectionChange?.(
                    selectedOptions.filter((o) => o.id !== option.id),
                  )
                }
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              <input type="hidden" name={idFieldName} value={option.id} />
            </span>
          ))}
        </div>
      )}
      {!selectedOptions && (
        <input type="hidden" name={idFieldName} value={selectedId} />
      )}
      <input
        id={inputId}
        className="text-input"
        name={queryFieldName}
        value={query}
        required={required}
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
              {pending
                ? `Creating ${entityName}…`
                : `${deferCreation ? "Add" : "Create"} “${query.trim()}”${deferCreation ? " with this record" : ""}`}
            </button>
          )}
          {!optionCount && (
            <span className="text-text-muted px-md py-sm text-body block">
              No matches.
              {createAction || deferCreation
                ? " Type a name to create an entry."
                : " Try another search."}
            </span>
          )}
        </div>
      )}
      {deferCreation && query.trim() && !selectedId && !open && (
        <p className="mt-sm text-meta text-text-secondary">
          This company will be matched or added when you save.
        </p>
      )}
      {error && (
        <p className="form-error mt-sm" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
