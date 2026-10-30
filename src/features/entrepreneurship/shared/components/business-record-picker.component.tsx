"use client";

import { Input } from "@/components/ui/forms/input.component";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import { searchBusinessRecordsForPicker } from "@/features/entrepreneurship/shared/adapters/business-record-search-client.adapter";
import type {
  BusinessRecordOption,
  BusinessRecordSearch,
} from "@/features/entrepreneurship/shared/schemas/business-record-search.schema";

function optionValue(option: BusinessRecordOption, includeRevision: boolean) {
  return includeRevision && option.revisionId
    ? `${option.id}:${option.revisionId}`
    : option.id;
}

function recordId(value: string, includeRevision: boolean) {
  return includeRevision ? (value.split(":")[0] ?? "") : value;
}

function PickerMenuItem({
  closeAfterSelect = false,
  onSelect,
  ...props
}: Omit<ComponentProps<typeof MenuItem>, "onSelect"> & {
  closeAfterSelect?: boolean;
  onSelect?: () => void;
}) {
  const close = useSubMenuClose();
  return (
    <MenuItem
      {...props}
      onSelect={() => {
        onSelect?.();
        if (closeAfterSelect) close(true);
      }}
    />
  );
}

export function BusinessRecordPicker({
  kind,
  label,
  name,
  nicheId,
  options: initialOptions = [],
  placeholder = "Choose a record",
  required = false,
  value: initialValue = "",
  values: initialValues = [],
  includeRevision = false,
  multiple = false,
  queryName,
  customValue = "",
  allowCustom = false,
  entityName = "record",
  disabled = false,
  interactionKinds,
  onValueChange,
  onSelectionChange,
}: {
  kind: BusinessRecordSearch["kind"];
  label: string;
  name: string;
  nicheId?: string;
  options?: BusinessRecordOption[];
  placeholder?: string;
  required?: boolean;
  value?: string;
  values?: string[];
  includeRevision?: boolean;
  multiple?: boolean;
  queryName?: string;
  customValue?: string;
  allowCustom?: boolean;
  entityName?: string;
  disabled?: boolean;
  interactionKinds?: BusinessRecordSearch["interactionKinds"];
  onValueChange?: (value: string) => void;
  onSelectionChange?: (options: BusinessRecordOption[]) => void;
}) {
  const [values, setValues] = useState(() =>
    multiple ? initialValues : initialValue ? [initialValue] : [],
  );
  const [options, setOptions] = useState(initialOptions);
  const [query, setQuery] = useState("");
  const [customText, setCustomText] = useState(customValue);
  const [next, setNext] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const valueId = useId();
  const selectedIds = useMemo(
    () => values.map((value) => recordId(value, includeRevision)),
    [includeRevision, values],
  );
  const selectedOptions = values.flatMap((selectedValue) => {
    const id = recordId(selectedValue, includeRevision);
    const option =
      options.find(
        (candidate) =>
          optionValue(candidate, includeRevision) === selectedValue,
      ) ?? options.find((candidate) => candidate.id === id);
    return option ? [option] : [];
  });

  const commitValues = useCallback(
    (nextValues: string[], nextOptions = options) => {
      setValues(nextValues);
      const nextSelectedOptions = nextValues.flatMap((selectedValue) => {
        const id = recordId(selectedValue, includeRevision);
        const option =
          nextOptions.find(
            (candidate) =>
              optionValue(candidate, includeRevision) === selectedValue,
          ) ?? nextOptions.find((candidate) => candidate.id === id);
        return option ? [option] : [];
      });
      onValueChange?.(nextValues[0] ?? "");
      onSelectionChange?.(nextSelectedOptions);
    },
    [includeRevision, onSelectionChange, onValueChange, options],
  );

  const load = useCallback(
    async (cursor?: string) => {
      const request = ++requestRef.current;
      setPending(true);
      setError(null);
      const result = await searchBusinessRecordsForPicker({
        kind,
        ...(nicheId ? { nicheId } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(cursor ? { cursor } : {}),
        ...(interactionKinds?.length ? { interactionKinds } : {}),
        selectedIds,
      });
      if (request !== requestRef.current) return;
      setPending(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNext(result.next);
      setOptions((current) => {
        const retained = cursor
          ? current
          : current.filter((option) => selectedIds.includes(option.id));
        const records = new Map(
          retained.map(
            (option) => [optionValue(option, includeRevision), option] as const,
          ),
        );
        for (const option of result.items)
          records.set(optionValue(option, includeRevision), option);
        return [...records.values()];
      });
    },
    [includeRevision, interactionKinds, kind, nicheId, query, selectedIds],
  );

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() =>
      searchRef.current?.focus(),
    );
    const timer = window.setTimeout(() => void load(), 220);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [load, open, query]);

  return (
    <div className="business-record-picker-field">
      <span id={labelId}>{label}</span>
      {multiple ? (
        values.map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))
      ) : (
        <input type="hidden" name={name} value={values[0] ?? ""} />
      )}
      {queryName && <input type="hidden" name={queryName} value={customText} />}
      <SubMenu
        label={label}
        placement="bottom-end"
        className="business-record-picker"
        menuClassName="business-record-picker-menu"
        closeOnSelect={false}
        onOpenChange={setOpen}
        trigger={(props) => (
          <button
            {...props}
            disabled={disabled}
            className="business-record-picker-trigger"
            aria-labelledby={`${labelId} ${valueId}`}
            data-required={required || undefined}
          >
            <span
              id={valueId}
              data-placeholder={
                (values.length === 0 && !customText) || undefined
              }
            >
              {multiple && values.length > 1
                ? `${values.length} records selected`
                : (selectedOptions[0]?.name ??
                  (allowCustom && customText ? customText : undefined) ??
                  (values.length > 0
                    ? "Loading selected record…"
                    : placeholder))}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        )}
      >
        <div className="business-record-picker-search" role="none">
          <Search aria-hidden="true" />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search records"
            aria-label={`Search ${label.toLowerCase()}`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        {!required && !multiple && (
          <PickerMenuItem
            closeAfterSelect
            onSelect={() => {
              commitValues([]);
              setCustomText("");
              setQuery("");
            }}
          >
            <span className="business-record-picker-option">
              <strong>{placeholder}</strong>
            </span>
          </PickerMenuItem>
        )}
        {allowCustom && query.trim() && (
          <PickerMenuItem
            closeAfterSelect
            onSelect={() => {
              commitValues([]);
              setCustomText(query.trim());
              setQuery("");
            }}
          >
            <span className="business-record-picker-option">
              <strong>Use “{query.trim()}”</strong>
              <small>Create a new {entityName} when this form is saved</small>
            </span>
          </PickerMenuItem>
        )}
        {options.map((option) => {
          const renderedValue = optionValue(option, includeRevision);
          const optionSelected = values.includes(renderedValue);
          return (
            <PickerMenuItem
              key={`${option.id}:${option.revisionId ?? "current"}`}
              role={multiple ? "menuitemcheckbox" : "menuitemradio"}
              checked={optionSelected}
              closeAfterSelect={!multiple}
              onSelect={() => {
                const nextValue = renderedValue;
                const nextValues = multiple
                  ? optionSelected
                    ? values.filter(
                        (currentValue) =>
                          recordId(currentValue, includeRevision) !== option.id,
                      )
                    : [...values, nextValue]
                  : [nextValue];
                commitValues(nextValues);
                if (!multiple) {
                  setCustomText(option.name);
                  setQuery("");
                }
              }}
            >
              <span className="business-record-picker-option">
                <strong>{option.name}</strong>
                {(option.description || option.marketType) && (
                  <small>{option.description ?? option.marketType}</small>
                )}
                {optionSelected && <Check aria-hidden="true" />}
              </span>
            </PickerMenuItem>
          );
        })}
        {pending && (
          <div className="business-record-picker-status" role="status">
            <LoaderCircle aria-hidden="true" /> Loading records…
          </div>
        )}
        {!pending && !error && options.length === 0 && (
          <div className="business-record-picker-status" role="status">
            No matching records
          </div>
        )}
        {error && (
          <div className="business-record-picker-status" role="alert">
            {error}
            <button
              type="button"
              onMouseDown={(event) => {
                if (event.button === 0) {
                  // Keep Safari focus inside the menu until Retry receives its click.
                  event.preventDefault();
                  event.currentTarget.focus({ preventScroll: true });
                }
              }}
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        )}
        {!pending && next && (
          <MenuItem onSelect={() => void load(next)}>Load more</MenuItem>
        )}
      </SubMenu>
    </div>
  );
}
