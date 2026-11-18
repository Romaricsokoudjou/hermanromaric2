import { requirePermission } from "@/lib/auth";
import { getCatalog } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { ActionForm, Field } from "@/components/ActionForm";
import { addDurationAction, savePriceAction, setPricingRuleAction } from "@/app/actions/admin";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Tarifs" };

export default async function Page() {
  await requirePermission("pricing.manage");
  const [programs, s] = await Promise.all([getCatalog({ all: true }), getSettings()]);
  return (
    <div>
      <AdminTitle title="Tarifs" subtitle="Chaque durée de chaque formation est administrable individuellement. Une durée inactive n'est pas proposée aux candidats." />
      <Panel title="Règle de cumul (inscription à plusieurs formations)">
        <ActionForm action={setPricingRuleAction} submitLabel="Enregistrer la règle" submitClass="btn btn-dark btn-sm" className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="Règle appliquée" name="rule" as="select" defaultValue={s["pricing.multi_rule"]}>
            <option value="undefined">Non définie → validation administrative obligatoire</option>
            <option value="sum_all">Somme de tous les tarifs (formation + inscription/polo de chaque formation)</option>
            <option value="enrollment_once">Formations additionnées, inscription et polo comptés une seule fois</option>
          </Field>
        </ActionForm>
      </Panel>
      <div className="mt-6 space-y-6">
        {programs.map((p) => (
          <Panel key={p.id} title={p.title}>
            <div className="space-y-4">
              {p.durations.map((d) => (
                <ActionForm key={d.id} action={savePriceAction} submitLabel="Enregistrer" submitClass="btn btn-primary btn-sm" className="grid items-end gap-3 rounded-xl border border-neutral-200 p-3 sm:grid-cols-6">
                  <input type="hidden" name="durationId" value={d.id} />
                  <div className="text-sm font-bold">{d.label}<span className="block text-xs font-normal text-neutral-500">{d.diploma}</span></div>
                  <Field label="Formation (FCFA)" name="tuitionFee" type="number" defaultValue={d.tuitionFee} />
                  <Field label="Inscription + polo" name="enrollmentFee" type="number" defaultValue={d.enrollmentFee} />
                  <Field label="Tranches (virgules)" name="installments" defaultValue={d.installments.join(", ")} required={false} />
                  <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={d.isActive} /> Proposée</label>
                </ActionForm>
              ))}
              {(["3m", "6m", "1y"] as const).filter((k) => !p.durations.some((d) => d.key === k)).length > 0 && (
                <ActionForm action={addDurationAction} submitLabel="Ajouter la durée" submitClass="btn btn-outline btn-sm" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="programId" value={p.id} />
                  <Field label="Durée à ajouter" name="key" as="select">
                    {(["3m", "6m", "1y"] as const).filter((k) => !p.durations.some((d) => d.key === k)).map((k) => (<option key={k} value={k}>{k === "3m" ? "3 mois" : k === "6m" ? "6 mois" : "1 an"}</option>))}
                  </Field>
                </ActionForm>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
