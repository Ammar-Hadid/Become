import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/cards/card.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./workspace.css";

export type WorkspaceArea =
  | "finance"
  | "engineering"
  | "entrepreneurship"
  | "content"
  | "direction"
  | "settings";

/** Opt-in composition: it never changes the dashboard or Season opening. */
export function Workspace({
  children,
  area = "direction",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { area?: WorkspaceArea }) {
  return (
    <div
      {...props}
      className={cn("workspace", className)}
      data-workspace-area={area}
    >
      {children}
    </div>
  );
}

export function WorkspaceHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("workspace-header", className)}>
      <div className="workspace-header-copy">
        {eyebrow && <p className="workspace-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <div className="workspace-description">{description}</div>
        )}
        {children}
      </div>
      {actions && <div className="workspace-actions">{actions}</div>}
    </header>
  );
}

export function WorkspacePanel({
  title,
  description,
  actions,
  children,
  className,
  material = "glass",
  spacing = "overview",
  ...props
}: Omit<ComponentProps<typeof Card>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card
      {...props}
      material={material}
      spacing={spacing}
      className={cn("workspace-panel", className)}
    >
      {(title || description || actions) && (
        <header className="workspace-panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="workspace-panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Card>
  );
}

export function WorkspaceMetric({
  label,
  value,
  detail,
  icon,
  tone = "default",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "positive" | "negative";
  className?: string;
}) {
  return (
    <Card
      as="article"
      spacing="dense"
      className={cn("workspace-metric", className)}
      data-tone={tone}
    >
      <div className="workspace-metric-label">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="workspace-metric-value">{value}</div>
      {detail && <div className="workspace-metric-detail">{detail}</div>}
    </Card>
  );
}

/** Links retain native navigation; their treatment comes from the same button system. */
export function WorkspaceLink({
  children,
  className,
  variant = "secondary",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link
      {...props}
      className={cn(
        "become-button",
        `become-button--${variant}`,
        "become-button--md",
        "workspace-link",
        className,
      )}
    >
      {children}
    </Link>
  );
}
