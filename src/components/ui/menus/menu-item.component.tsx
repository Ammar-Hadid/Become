import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export const menuItemProps = {
  className: "menu-item",
  role: "menuitem" as const,
};

type MenuItemRole = "menuitem" | "menuitemcheckbox" | "menuitemradio";
type MenuItemRenderProps = {
  className: string;
  role: MenuItemRole;
  "aria-checked"?: boolean;
  "aria-disabled"?: boolean;
};

type MenuItemTone = "default" | "danger";

type MenuItemProps = {
  checked?: boolean;
  children?: ReactNode;
  className?: string;
  href?: string;
  icon?: ReactNode;
  label?: string;
  onSelect?: MouseEventHandler<HTMLElement>;
  render?: (props: MenuItemRenderProps) => ReactNode;
  role?: MenuItemRole;
  tone?: MenuItemTone;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick" | "role"
>;

export function MenuItem({
  checked,
  children,
  className,
  href,
  icon,
  label,
  onSelect,
  render,
  role = menuItemProps.role,
  tone = "default",
  disabled,
  ...buttonProps
}: MenuItemProps) {
  const ariaDisabled =
    disabled ||
    buttonProps["aria-disabled"] === true ||
    buttonProps["aria-disabled"] === "true";
  const itemProps: MenuItemRenderProps = {
    className: cn(
      menuItemProps.className,
      tone === "danger" && "menu-item--danger",
      className,
    ),
    role,
    ...(role === "menuitem" ? {} : { "aria-checked": Boolean(checked) }),
    ...(ariaDisabled ? { "aria-disabled": true } : {}),
  };
  if (render) return render(itemProps);

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={itemProps.className}
        role={itemProps.role}
        aria-checked={itemProps["aria-checked"]}
        aria-disabled={itemProps["aria-disabled"]}
        aria-label={label}
        tabIndex={ariaDisabled ? -1 : undefined}
        onClick={(event) => {
          if (ariaDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onSelect?.(event);
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "button"}
      disabled={disabled}
      className={itemProps.className}
      role={itemProps.role}
      aria-checked={itemProps["aria-checked"]}
      aria-disabled={itemProps["aria-disabled"]}
      aria-label={label}
      onMouseDown={(event) => {
        buttonProps.onMouseDown?.(event);
        if (event.button === 0 && !event.defaultPrevented && !ariaDisabled) {
          // Safari otherwise focuses the enclosing drawer and dismisses the menu before click.
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
      onClick={(event) => {
        if (ariaDisabled) {
          event.preventDefault();
          return;
        }
        onSelect?.(event);
      }}
    >
      {content}
    </button>
  );
}
