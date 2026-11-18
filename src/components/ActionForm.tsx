"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type FormState = { error?: string; ok?: string; info?: string } | null;
export type FormAction = (prev: FormState, fd: FormData) => Promise<FormState>;

export function SubmitButton({ children, className = "btn btn-primary", confirmText }: { children: ReactNode; className?: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "Patientez…" : children}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-4",
  submitClass = "btn btn-primary w-full",
  confirmText,
  hideSubmit,
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  submitClass?: string;
  confirmText?: string;
  hideSubmit?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {state.ok}
        </p>
      )}
      {state?.info && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {state.info}
        </p>
      )}
      {!hideSubmit && <SubmitButton className={submitClass} confirmText={confirmText}>{submitLabel ?? "Valider"}</SubmitButton>}
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  placeholder,
  autoComplete,
  hint,
  as,
  children,
  rows = 3,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  as?: "textarea" | "select";
  children?: ReactNode;
  rows?: number;
}) {
  const common = { id: name, name, required, className: "input", defaultValue: defaultValue ?? undefined };
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </label>
      {as === "textarea" ? (
        <textarea {...common} rows={rows} placeholder={placeholder} />
      ) : as === "select" ? (
        <select {...common}>{children}</select>
      ) : (
        <input {...common} type={type} placeholder={placeholder} autoComplete={autoComplete} />
      )}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
