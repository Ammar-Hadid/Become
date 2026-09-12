"use client";

import { Check, ChevronDown } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import { cn } from "@/lib/styles/utils/class-name.util";

export type SelectOption<Value extends string = string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

function SelectChoice<Value extends string>({
  option,
  selected,
  onSelect,
}: {
  option: SelectOption<Value>;
  selected: boolean;
  onSelect: (value: Value) => void;
}) {
  const close = useSubMenuClose();
  return (
    <MenuItem
      role="menuitemradio"
      checked={selected}
      disabled={option.disabled}
      onSelect={() => {
        onSelect(option.value);
        close(true);
      }}
    >
      <span>{option.label}</span>
      {selected && <Check aria-hidden="true" />}
    </MenuItem>
  );
}

export function Select<Value extends string>({
  label,
  name,
  value,
  options,
  onValueChange,
  disabled = false,
  className,
}: {
  label: string;
  name?: string;
  value: Value;
  options: SelectOption<Value>[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <div className={cn("select-control", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <SubMenu
        label={label}
        placement="bottom-end"
        closeOnSelect={false}
        trigger={(props) => (
          <button {...props} disabled={disabled} className="select-trigger">
            <span>{selected?.label ?? "Choose"}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        )}
      >
        {options.map((option) => (
          <SelectChoice
            key={option.value}
            option={option}
            selected={option.value === value}
            onSelect={onValueChange}
          />
        ))}
      </SubMenu>
    </div>
  );
}
