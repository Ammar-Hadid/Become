import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export const menuItemProps = {
  className: "menu-item",
  role: "menuitem" as const,
};

type MenuItemProps = {
  children?: ReactNode;
  className?: string;
  href?: string;
  icon?: ReactNode;
  label?: string;
  onSelect?: MouseEventHandler<HTMLElement>;
  render?: (props: typeof menuItemProps) => ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick">;

export function MenuItem({
  children,
  className,
  href,
  icon,
  label,
  onSelect,
  render,
  ...buttonProps
}: MenuItemProps) {
  const itemProps = {
    ...menuItemProps,
    className: cn(menuItemProps.className, className),
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
        role={menuItemProps.role}
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
      role={menuItemProps.role}
      aria-label={label}
      onClick={onSelect as MouseEventHandler<HTMLButtonElement>}
    >
      {content}
    </button>
  );
}
