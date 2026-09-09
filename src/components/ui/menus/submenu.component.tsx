"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { Menu, type MenuPlacement } from "@/components/ui/menus/menu.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
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
  const menuPresence = usePresence(open);

  useLayoutEffect(() => {
    if (!open || placement !== "bottom-end") return;
    const place = () => {
      const menu = menuRef.current;
      const trigger = triggerRef.current;
      if (!menu || !trigger) return;
      menu.style.translate = "";
      const bounds = menu.getBoundingClientRect();
      const anchor = trigger.getBoundingClientRect();
      const margin = 8;
      const dx =
        bounds.left < margin
          ? margin - bounds.left
          : bounds.right > innerWidth - margin
            ? innerWidth - margin - bounds.right
            : 0;
      const dy =
        bounds.bottom > innerHeight - margin &&
        anchor.top >= bounds.height + margin
          ? anchor.top - bounds.bottom - margin
          : 0;
      menu.style.translate = `${dx}px ${dy}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, placement]);

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
      if (restoreFocus) {
        window.requestAnimationFrame(() =>
          triggerRef.current?.focus({ preventScroll: true }),
        );
      }
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
          event.relatedTarget &&
          !rootRef.current?.querySelector("dialog[open]") &&
          !rootRef.current?.contains(event.relatedTarget)
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
      {menuPresence.isPresent && (
        <Menu
          ref={menuRef}
          id={menuId}
          label={label}
          open={open}
          placement={placement}
          className={menuClassName}
          data-state={menuPresence.presenceState}
          onAnimationEnd={menuPresence.onPresenceAnimationEnd}
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
            const current = items.indexOf(
              document.activeElement as HTMLElement,
            );
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
      )}
    </div>
  );
}
