"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { Menu, type MenuPlacement } from "@/components/ui/menus/menu.component";
import { cn } from "@/lib/styles/utils/class-name.util";

type SubMenuContextValue = {
  close: (restoreFocus?: boolean) => void;
};

const SubMenuContext = createContext<SubMenuContextValue | null>(null);

export function useSubMenuClose() {
  const context = useContext(SubMenuContext);
  if (!context)
    throw new Error("useSubMenuClose must be used inside a SubMenu.");
  return context.close;
}

type SubMenuTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref: RefObject<HTMLButtonElement | null>;
};

export function SubMenu({
  label,
  placement,
  trigger,
  children,
  className,
  menuClassName,
  closeOnSelect = true,
  onOpenChange,
}: {
  label: string;
  placement: MenuPlacement;
  trigger: (props: SubMenuTriggerProps) => ReactNode;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  closeOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const menuItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
        ) ?? [],
      ),
    [],
  );

  const close = useCallback(
    (restoreFocus = false) => {
      setOpen(false);
      onOpenChange?.(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onOpenChange],
  );

  const openMenu = useCallback(
    (focusLast = false) => {
      setOpen(true);
      onOpenChange?.(true);
      requestAnimationFrame(() => {
        const items = menuItems();
        (focusLast ? items.at(-1) : items[0])?.focus();
      });
    },
    [menuItems, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        rootRef.current?.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      close(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, open]);

  return (
    <div
      ref={rootRef}
      className={cn("submenu", className)}
      onBlur={(event) => {
        if (
          open &&
          !rootRef.current?.contains(event.relatedTarget as Node | null)
        )
          close();
      }}
    >
      {trigger({
        ref: triggerRef,
        type: "button",
        "aria-label": label,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        onClick: () => (open ? close() : openMenu()),
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp");
          }
        },
      })}
      <Menu
        ref={menuRef}
        id={menuId}
        label={label}
        open={open}
        placement={placement}
        className={menuClassName}
        onClickCapture={(event) => {
          if (
            closeOnSelect &&
            (event.target as Element).closest('[role="menuitem"]')
          )
            close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") return;
          const items = menuItems();
          const current = items.indexOf(document.activeElement as HTMLElement);
          let next = current;
          if (event.key === "ArrowDown") next = (current + 1) % items.length;
          else if (event.key === "ArrowUp")
            next = (current - 1 + items.length) % items.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = items.length - 1;
          else return;
          event.preventDefault();
          items[next]?.focus();
        }}
      >
        <SubMenuContext.Provider value={{ close }}>
          {children}
        </SubMenuContext.Provider>
      </Menu>
    </div>
  );
}
