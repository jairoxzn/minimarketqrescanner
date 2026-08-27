import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

export interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function FieldChrome({
  label,
  error,
  hint,
  required,
  children,
}: FieldWrapperProps & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const baseFieldClasses =
  "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-muted";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = "", ...props }, ref) => (
    <FieldChrome label={label} error={error} hint={hint} required={required}>
      <input ref={ref} className={`${baseFieldClasses} ${className}`} {...props} />
    </FieldChrome>
  )
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = "", ...props }, ref) => (
    <FieldChrome label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        className={`min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${className}`}
        {...props}
      />
    </FieldChrome>
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldWrapperProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className = "", children, ...props }, ref) => (
    <FieldChrome label={label} error={error} hint={hint} required={required}>
      <select ref={ref} className={`${baseFieldClasses} ${className}`} {...props}>
        {children}
      </select>
    </FieldChrome>
  )
);
Select.displayName = "Select";
