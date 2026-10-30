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
      const scrollTop = menu.scrollTop;
      menu.style.translate = "";
      menu.style.maxHeight = "";
      const anchor = trigger.getBoundingClientRect();
      const initialBounds = menu.getBoundingClientRect();
      const style = getComputedStyle(menu);
      const rootFont = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const length = (name: string, fallback: number) => {
        const value = style.getPropertyValue(name).trim();
        const amount = parseFloat(value);
        return Number.isFinite(amount)
          ? amount * (value.endsWith("rem") ? rootFont : 1)
          : fallback;
      };
      const margin = length("--menu-viewport-gutter", 8);
      // Page menus stay below sticky chrome; modal layers already cover it.
      const top =
        margin +
        (menu.closest('dialog[open], [aria-modal="true"]')
          ? 0
          : length("--menu-viewport-top", 0));
      // Ignore the entrance translation when measuring the settled surface.
      const arrivalY =
        style.transform === "none"
          ? 0
          : new DOMMatrixReadOnly(style.transform).m42;
      const gap = Math.max(0, initialBounds.top - arrivalY - anchor.bottom);
      const below = Math.max(0, innerHeight - margin - anchor.bottom - gap);
      const above = Math.max(0, anchor.top - gap - top);
      const flip = initialBounds.height > below && above > below;
      const available = Math.max(
        0,
        Math.min(flip ? above : below, innerHeight - top - margin),
      );
      menu.style.maxHeight = `${Math.min(initialBounds.height, available)}px`;
      const bounds = menu.getBoundingClientRect();
      const dx =
        bounds.left < margin
          ? margin - bounds.left
          : bounds.right > innerWidth - margin
            ? innerWidth - margin - bounds.right
            : 0;
      const naturalTop = bounds.top - arrivalY;
      const preferredTop = flip ? anchor.top - gap - bounds.height : naturalTop;
      const placedTop = Math.max(
        top,
        Math.min(preferredTop, innerHeight - margin - bounds.height),
      );
      menu.style.translate = `${dx}px ${placedTop - naturalTop}px`;
      menu.scrollTop = scrollTop;
    };
    place();
    window.addEventListener("resize", place);
    const onScroll = (event: Event) => {
      // Scrolling the choices must not reset their viewport or scroll position.
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      )
        return;
      place();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, placement]);

  const menuItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          '[role^="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
        ) ?? [],
      ),
    [],
  );

  const close = useCallback(
    (restoreFocus = false) => {
      const focusWhenClosing = document.activeElement;
      setOpen(false);
      onOpenChange?.(false);
      if (restoreFocus) {
        window.requestAnimationFrame(() => {
          const active = document.activeElement;
          // Restore the closing menu's focus without stealing a deliberate
          // move to another field or a newly opened layer in this frame.
          if (
            active === focusWhenClosing ||
            active === document.body ||
            menuRef.current?.contains(active)
          )
            triggerRef.current?.focus({ preventScroll: true });
        });
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
      event.stopPropagation();
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
          inert={menuPresence.isExiting}
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
