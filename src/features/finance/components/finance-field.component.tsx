import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/styles/utils/class-name.util";

export function FinanceField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col items-start">
      <span className="field-label">{label}</span>
      <input
        className="text-input tabular-nums"
        step={props.type === "datetime-local" ? "any" : undefined}
        {...props}
      />
    </label>
  );
}

export function FinanceSelect({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col items-start">
      <span className="field-label">{label}</span>
      <select className="text-input" aria-label={label} {...props}>
        {children}
      </select>
    </label>
  );
}
export function FinanceSection({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("finance-section", className)}>
      <div className="finance-section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className="finance-section-content">{children}</div>
    </section>
  );
}

export function FinancePageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="finance-page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className="finance-page-actions">{actions}</div>}
    </header>
  );
}

export function FinanceEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="finance-empty-state">
      {icon && <div className="finance-empty-icon">{icon}</div>}
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
