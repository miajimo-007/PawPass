import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './input';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: htmlFor,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {child}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[12.5px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      {title && <legend className="eyebrow mb-1">{title}</legend>}
      {children}
    </fieldset>
  );
}
