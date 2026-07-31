import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form field wrapper: label (+ optional required marker), the control, an
 * optional hint, and an optional error message — with the aria wiring
 * (`aria-invalid` / `aria-describedby`) that was hand-repeated (and often
 * omitted) across the forms.
 *
 * The control is passed as children so this works with `<Input>`, `<Select>`,
 * `<textarea>`, etc. Use `renderControl` when you need the generated id +
 * aria props applied to the control automatically; otherwise wire `htmlFor`
 * yourself via the `id` prop.
 *
 *   <Field label="Display name" required error={errors.name}
 *     renderControl={(p) => <Input name="name" {...p} />} />
 */
export function Field({
  id: idProp,
  label,
  required,
  hint,
  error,
  className,
  children,
  renderControl,
}: {
  /** Control id; auto-generated when omitted (needed to link label + error). */
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  /** Muted helper text shown under the control (hidden when an error shows). */
  hint?: React.ReactNode;
  /** Error message; when set, marks the control invalid and replaces the hint. */
  error?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Render-prop form: receives { id, aria-invalid, aria-describedby } to
      spread onto the control so a11y is wired without boilerplate. */
  renderControl?: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const reactId = React.useId();
  const id = idProp ?? reactId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const controlProps = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label != null && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}
      {renderControl ? renderControl(controlProps) : children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-m3-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
