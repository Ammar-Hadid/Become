import { useId, type ReactNode } from "react";
export function BusinessField({
  label,
  name,
  value,
  required,
  multiline,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  const id = useId();
  const props = {
    id,
    name,
    defaultValue: value ?? "",
    required,
    className: "text-input",
    "aria-describedby": hint ? `${id}-hint` : undefined,
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {!required && (
          <span className="text-text-muted normal-case"> · optional</span>
        )}
      </label>
      {multiline ? (
        <textarea {...props} rows={4} maxLength={6000} />
      ) : (
        <input
          {...props}
          type={type}
          maxLength={type === "text" ? 120 : undefined}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="business-hint">
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
}: {
  label: string;
  name: string;
  value?: string;
  children: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        required={required}
        className="text-input"
      >
        {children}
      </select>
    </div>
  );
}
