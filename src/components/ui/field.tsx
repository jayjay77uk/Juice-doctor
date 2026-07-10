import * as React from 'react';
import { cn } from '@/lib/cn';

const controlBase = [
  'w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground',
  'placeholder:text-muted-foreground/70',
  'transition-colors duration-200',
  'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]',
  'aria-[invalid=true]:border-danger',
];

export interface FieldProps {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

/** Label + control + error message wrapper, wired for accessibility. */
export function Field({ label, name, error, hint, required, children }: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 5, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(controlBase, 'resize-y', className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlBase, 'appearance-none pr-10', className)} {...props}>
      {children}
    </select>
  );
});
