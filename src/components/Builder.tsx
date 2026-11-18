"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { saveApplicationAction } from "@/app/actions/account";
import { computeTotal } from "@/lib/pricing";
import { fcfa } from "@/lib/format";

type Dur = { id: string; label: string; diploma: string; tuitionFee: number; enrollmentFee: number; installments: number[] };
type Prog = { id: string; slug: string; title: string; imageUrl: string | null; shortDescription: string; durations: Dur[] };
type Center = { id: string; name: string; address: string };

export function Builder({ programs, centers, rule, applicationId, initialCenter, initialItems, preselect }: { programs: Prog[]; centers: Center[]; rule: string; applicationId?: string; initialCenter?: string; initialItems: Record<string, string>; preselect?: string }) {
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const s = { ...initialItems };
    const p = programs.find((x) => x.slug === preselect);
    if (p && !s[p.id] && p.durations[0]) s[p.id] = p.durations[0].id;
    return s;
  });
  const [centerId, setCenterId] = useState(initialCenter ?? centers[0]?.id ?? "");

  const lines = useMemo(
    () =>
      Object.entries(sel)
        .map(([pid, did]) => {
          const p = programs.find((x) => x.id === pid);
          const d = p?.durations.find((x) => x.id === did);
          return p && d ? { p, d } : null;
        })
        .filter((x): x is { p: Prog; d: Dur } => !!x),
    [sel, programs],
  );
  const effectiveRule = lines.length > 1 ? rule : "sum_all";
  const total = computeTotal(lines.map((l) => l.d), effectiveRule);
  const needsReview = lines.length > 1 && rule === "undefined";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {programs.map((p) => {
          const chosen = sel[p.id];
          return (
            <div key={p.id} className={`card overflow-hidden transition ${chosen ? "ring-2 ring-brand" : ""}`}>
              <div className="flex gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl ?? ""} alt="" className="hidden h-24 w-32 rounded-xl object-cover sm:block" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{p.title}</h3>
                    {chosen ? (
                      <button type="button" onClick={() => setSel((s) => { const n = { ...s }; delete n[p.id]; return n; })} className="btn btn-outline btn-sm text-red-600">Retirer</button>
                    ) : (
                      <button type="button" disabled={!p.durations.length} onClick={() => setSel((s) => ({ ...s, [p.id]: p.durations[0].id }))} className="btn btn-primary btn-sm">Ajouter</button>
                    )}
                  </div>
                  {!p.durations.length && <p className="mt-1 text-xs text-neutral-500">Aucune durée disponible pour le moment.</p>}
                  {chosen && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {p.durations.map((d) => (
                        <label key={d.id} className={`cursor-pointer rounded-xl border p-3 text-sm ${chosen === d.id ? "border-brand bg-brand/5" : "border-neutral-200"}`}>
                          <input type="radio" className="sr-only" name={`d-${p.id}`} checked={chosen === d.id} onChange={() => setSel((s) => ({ ...s, [p.id]: d.id }))} />
                          <b>{d.label}</b> <span className="text-xs text-neutral-500">{d.diploma}</span>
                          <span className="block font-display text-base font-bold">{fcfa(d.tuitionFee)}</span>
                          <span className="block text-[11px] text-neutral-500">+ {fcfa(d.enrollmentFee)} inscription/polo</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold">Récapitulatif</h2>
          <div className="mt-4">
            <label className="label" htmlFor="center">Centre de formation</label>
            <select id="center" className="input" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
              {centers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">{centers.find((c) => c.id === centerId)?.address}</p>
          </div>
          <ul className="mt-4 divide-y text-sm">
            {lines.map(({ p, d }) => (
              <li key={p.id} className="py-2">
                <div className="flex justify-between"><span className="font-semibold">{p.title}</span><span>{fcfa(d.tuitionFee)}</span></div>
                <div className="flex justify-between text-xs text-neutral-500"><span>{d.label} · {d.diploma} · inscription/polo</span><span>{fcfa(d.enrollmentFee)}</span></div>
              </li>
            ))}
            {!lines.length && <li className="py-3 text-neutral-500">Aucune formation sélectionnée.</li>}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t pt-4">
            <span className="font-semibold">{needsReview ? "Total indicatif" : "Total à payer"}</span>
            <span className="font-display text-2xl font-black text-brand-dark">{fcfa(total)}</span>
          </div>
          {needsReview && <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs text-orange-800">Plusieurs formations : les règles de cumul des tarifs ne sont pas encore définies. Votre candidature sera soumise à une <b>validation administrative</b> avant paiement.</p>}
          {lines.length > 1 && !needsReview && <p className="mt-3 text-xs text-neutral-500">Total calculé selon la règle de cumul de l&apos;administration.</p>}
          <ActionForm action={saveApplicationAction} submitLabel={needsReview ? "Soumettre pour validation" : "Valider et continuer"} className="mt-5 space-y-3">
            <input type="hidden" name="applicationId" value={applicationId ?? ""} />
            <input type="hidden" name="centerId" value={centerId} />
            <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ programId: l.p.id, durationId: l.d.id })))} />
          </ActionForm>
          <p className="mt-3 text-xs text-neutral-500">Vous pourrez modifier votre sélection tant que le paiement n&apos;a pas été effectué.</p>
        </div>
      </aside>
    </div>
  );
}
