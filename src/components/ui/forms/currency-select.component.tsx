"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from "@/lib/money/constants/currency.constants";

function CurrencyOption({
  code,
  label,
  selected,
  onSelect,
}: {
  code: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  const close = useSubMenuClose();
  return (
    <MenuItem
      role="menuitemradio"
      checked={selected}
      onSelect={() => {
        onSelect(code);
        close(true);
      }}
    >
      <span className="flex-1">{label}</span>
      {selected && <Check size={16} aria-hidden="true" />}
    </MenuItem>
  );
}

export function CurrencySelect({
  label = "Currency",
  name,
  value,
  defaultValue = DEFAULT_CURRENCY,
  onValueChange,
  required = false,
  emptyLabel = "Not specified",
  disabled = false,
}: {
  label?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [selection, setSelection] = useState(defaultValue);
  const selected = value ?? selection;
  const currency = SUPPORTED_CURRENCIES.find(({ code }) => code === selected);
  const change = (code: string) => {
    setInvalid(false);
    setSelection(code);
    onValueChange?.(code);
  };
  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => {
      setSelection(defaultValue);
      setInvalid(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue]);

  return (
    <div ref={root} className="relative flex min-w-0 flex-col items-start">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={currency ? selected : ""}
        required={required}
        disabled={disabled}
        onChange={(event) => change(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          root.current?.querySelector("button")?.focus();
        }}
      >
        <option value="">{emptyLabel}</option>
        {SUPPORTED_CURRENCIES.map(({ code, name }) => (
          <option key={code} value={code}>
            {code} · {name}
          </option>
        ))}
      </select>
      <SubMenu
        label={label}
        placement="bottom-end"
        className="w-full"
        trigger={(props) => (
          <button
            {...props}
            id={id}
            aria-describedby={`${id}-value${invalid ? ` ${id}-error` : ""}`}
            disabled={disabled}
            className="text-input text-left"
          >
            <span className="gap-sm flex items-center justify-between">
              <span id={`${id}-value`}>
                {currency
                  ? `${currency.code} · ${currency.name}`
                  : selected
                    ? `Choose a supported currency (${selected} unavailable)`
                    : required
                      ? "Choose a currency"
                      : emptyLabel}
              </span>
              <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
            </span>
          </button>
        )}
      >
        {!required && (
          <CurrencyOption
            code=""
            label={emptyLabel}
            selected={!selected}
            onSelect={change}
          />
        )}
        {SUPPORTED_CURRENCIES.map(({ code, name }) => (
          <CurrencyOption
            key={code}
            code={code}
            label={`${code} · ${name}`}
            selected={selected === code}
            onSelect={change}
          />
        ))}
      </SubMenu>
      {invalid && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-body text-text-secondary"
        >
          Choose a supported currency.
        </p>
      )}
    </div>
  );
}
