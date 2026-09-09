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
};

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
  ...buttonProps
}: MenuItemProps) {
  const itemProps: MenuItemRenderProps = {
    className: cn(menuItemProps.className, className),
    role,
    ...(role === "menuitem" ? {} : { "aria-checked": Boolean(checked) }),
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
        aria-label={label}
        onClick={onSelect as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "button"}
      className={itemProps.className}
      role={itemProps.role}
      aria-checked={itemProps["aria-checked"]}
      aria-label={label}
      onClick={onSelect as MouseEventHandler<HTMLButtonElement>}
    >
      {content}
    </button>
  );
}
