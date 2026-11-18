import type { ReactNode } from "react";
import { Field } from "@/components/ActionForm";

export function PwdField() {
  return <Field label="Votre mot de passe (contrôle renforcé)" name="confirmPassword" type="password" autoComplete="current-password" />;
}

export function AdminTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && <h2 className="font-display mb-3 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}
