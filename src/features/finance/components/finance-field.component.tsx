import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Input } from "@/components/ui/forms/input.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";

export function FinanceField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <Input
      label={label}
      step={props.type === "datetime-local" ? "any" : undefined}
      {...props}
    />
  );
}

export function FinanceSelect({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="finance-field">
      <span className="field-label">{label}</span>
      <NativeSelect aria-label={label} {...props}>
        {children}
      </NativeSelect>
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
  children: ReactNode;
}) {
  return (
    <WorkspacePanel
      title={title}
      description={description}
      actions={action}
      className={className}
      spacing="dense"
    >
      {children}
    </WorkspacePanel>
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
    <WorkspaceHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    />
  );
}

export function FinanceEmptyState({
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
    <EmptyState
      pattern="ledger-replacement"
      context={false}
      size="compact"
      area="finance"
      title={title}
      description={description}
      action={action}
    />
  );
}
