import { requirePermission } from "@/lib/auth";
import { getSettings, type SettingKey } from "@/lib/settings";
import { ActionForm } from "@/components/ActionForm";
import { SettingsFields } from "@/components/SettingsFields";
import { saveSettingsAction } from "@/app/actions/admin";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Paramètres généraux" };

export default async function Page() {
  await requirePermission("settings.manage");
  const s = await getSettings();
  const mismatch = s["contact.whatsapp_url"].replace(/\D/g, "").slice(3) !== s["contact.phones"].map((p) => p.replace(/\D/g, "").slice(3)).find((p) => p === s["contact.whatsapp_url"].replace(/\D/g, "").slice(3));
  return (
    <div className="space-y-6">
      <AdminTitle title="Paramètres généraux" subtitle="Coordonnées, réseaux sociaux, référence officielle et informations légales." />
      {mismatch && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><b>À vérifier avant publication :</b> le numéro WhatsApp ({s["contact.whatsapp_url"]}) ne correspond à aucun des téléphones communiqués ({s["contact.phones"].join(" / ")}). Confirmez les coordonnées avec la direction.</p>}
      <Panel title="Contact & réseaux">
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer" submitClass="btn btn-primary" className="space-y-4">
          <input type="hidden" name="__group" value="contact" />
          <SettingsFields keys={["contact.phones", "contact.whatsapp_url", "contact.whatsapp_message", "contact.email", "contact.facebook", "contact.tiktok"] as SettingKey[]} s={s} />
        </ActionForm>
      </Panel>
      <Panel title="Institution">
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer" submitClass="btn btn-primary" className="space-y-4">
          <input type="hidden" name="__group" value="institution" />
          <SettingsFields keys={["institution.arrete", "institution.legal_notes"] as SettingKey[]} s={s} />
        </ActionForm>
      </Panel>
      <Panel title="Paiement">
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer" submitClass="btn btn-primary" className="space-y-4">
          <input type="hidden" name="__group" value="payments" />
          <SettingsFields keys={["payments.chariow_url"] as SettingKey[]} s={s} />
        </ActionForm>
        <p className="mt-3 text-xs text-neutral-500">Webhook à déclarer dans Chariow (Automations → Pulses) : <code>/api/webhooks/chariow</code>, secret <code>whsec_…</code> à placer dans la variable d&apos;environnement CHARIOW_WEBHOOK_SECRET.</p>
      </Panel>
    </div>
  );
}
