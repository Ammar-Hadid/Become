import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { useId, type ChangeEventHandler, type ReactNode } from "react";

export function BusinessFormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="business-form-section">
      <header className="business-form-section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="business-form-section-body">{children}</div>
    </section>
  );
}

export function BusinessField({
  label,
  name,
  value,
  required,
  multiline,
  type = "text",
  hint,
  min,
  step,
  featured = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  hint?: string;
  min?: number;
  step?: number;
  featured?: boolean;
}) {
  const id = useId();
  const props = {
    id,
    name,
    defaultValue: value ?? "",
    required,
    variant: featured ? ("featured" as const) : ("body" as const),

    "aria-describedby": hint ? `${id}-hint` : undefined,
  };
  return (
    <div className="business-form-field gap-sm grid">
      <label htmlFor={id} className="field-label">
        {label}
        {!required && !label.toLowerCase().includes("optional") && (
          <span className="text-text-muted normal-case"> · optional</span>
        )}
      </label>
      {multiline ? (
        <Textarea {...props} rows={4} maxLength={6000} />
      ) : (
        <Input
          {...props}
          type={type}
          min={min}
          step={step}
          maxLength={type === "text" ? 120 : undefined}
        />
      )}
      {hint && (
        <p
          id={`${id}-hint`}
          className="business-hint text-body-sm text-text-muted"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
export function BusinessSelect({
  label,
  name,
  value,
  children,
  required = false,
  onChange,
  disabled = false,
}: {
  label: string;
  name: string;
  value?: string;
  children: ReactNode;
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="business-form-field gap-sm grid">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <NativeSelect
        id={id}
        name={name}
        defaultValue={onChange ? undefined : value}
        value={onChange ? value : undefined}
        onChange={onChange}
        required={required}
        disabled={disabled}
      >
        {children}
      </NativeSelect>
    </div>
  );
}
