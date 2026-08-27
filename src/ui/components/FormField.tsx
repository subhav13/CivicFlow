import type {
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldShellProps {
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
}

export function FieldShell({
  children,
  description,
  error,
  htmlFor,
  label,
}: FieldShellProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="field-shell">
      <label htmlFor={htmlFor}>{label}</label>
      {description ? (
        <span className="field-description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  description?: string;
  error?: string;
  label: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export function TextField({
  description,
  error,
  id,
  label,
  onChange,
  ...props
}: TextFieldProps) {
  if (!id) throw new Error('TextField requires an id');
  return (
    <FieldShell
      description={description}
      error={error}
      htmlFor={id}
      label={label}
    >
      <input
        {...props}
        id={id}
        aria-describedby={
          [description ? `${id}-description` : '', error ? `${id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-invalid={error ? true : undefined}
        onChange={onChange}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  children: ReactNode;
  description?: string;
  error?: string;
  label: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}

export function SelectField({
  children,
  description,
  error,
  id,
  label,
  onChange,
  ...props
}: SelectFieldProps) {
  if (!id) throw new Error('SelectField requires an id');
  return (
    <FieldShell
      description={description}
      error={error}
      htmlFor={id}
      label={label}
    >
      <select
        {...props}
        id={id}
        aria-describedby={
          [description ? `${id}-description` : '', error ? `${id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-invalid={error ? true : undefined}
        onChange={onChange}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface TextareaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  description?: string;
  error?: string;
  label: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
}

export function TextareaField({
  description,
  error,
  id,
  label,
  onChange,
  ...props
}: TextareaFieldProps) {
  if (!id) throw new Error('TextareaField requires an id');
  return (
    <FieldShell
      description={description}
      error={error}
      htmlFor={id}
      label={label}
    >
      <textarea
        {...props}
        id={id}
        aria-describedby={
          [description ? `${id}-description` : '', error ? `${id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-invalid={error ? true : undefined}
        onChange={onChange}
      />
    </FieldShell>
  );
}
