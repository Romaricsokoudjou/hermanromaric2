import { Field } from "@/components/ActionForm";
import { SETTING_DEFAULTS, type Settings, type SettingKey } from "@/lib/settings";

const LABELS: Partial<Record<SettingKey, [string, string?]>> = {
  "rewards.enabled": ["Programme HERMAN REWARDS actif"],
  "rewards.signup_bonus": ["Bonus d'inscription (FCFA)"],
  "rewards.training_bonus": ["Bonus de formation (FCFA)"],
  "rewards.training_trigger": ["Déclencheur du bonus de formation", "first_installment = première tranche validée · full_payment = paiement intégral"],
  "rewards.training_once_per_referee": ["Bonus de formation une seule fois par filleul (recommandé)"],
  "rewards.clawback_policy": ["Politique de reprise en cas de remboursement", "reclaim_available = reprise sur le solde disponible uniquement · manual_review = alerte pour procédure documentée"],
  "rewards.max_signups_per_ip_per_day": ["Max. d'inscriptions parrainées / IP / 24 h avant mise en attente"],
  "withdrawal.min": ["Seuil minimum de retrait (FCFA)"],
  "withdrawal.fee": ["Frais de retrait (FCFA)", "0 = aucun frais"],
  "withdrawal.max_per_request": ["Plafond par demande (FCFA)", "0 = illimité"],
  "withdrawal.max_per_month": ["Plafond mensuel par utilisateur (FCFA)", "0 = illimité"],
  "withdrawal.operators": ["Moyens de retrait (un par ligne)"],
  "contact.phones": ["Téléphones (un par ligne)"],
  "contact.whatsapp_url": ["Lien WhatsApp"],
  "contact.whatsapp_message": ["Message WhatsApp prérempli"],
  "contact.email": ["E-mail de contact"],
  "contact.facebook": ["Lien Facebook"],
  "contact.tiktok": ["Lien TikTok"],
  "institution.arrete": ["Référence de l'arrêté / ordre"],
  "institution.legal_notes": ["Informations légales complémentaires (RCCM, NIU, hébergeur…)", "Ne renseigner que des informations officielles"],
  "payments.chariow_url": ["Lien produit Chariow"],
  "ai.enabled": ["HERMAN AI activé"],
  "ai.handoff_text": ["Texte d'orientation vers un conseiller humain"],
};

export function SettingsFields({ keys, s }: { keys: SettingKey[]; s: Settings }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {keys.map((k) => {
        const def = SETTING_DEFAULTS[k] as unknown;
        const [label, hint] = LABELS[k] ?? [k];
        const v = s[k] as unknown;
        const name = `f:${k}`;
        if (typeof def === "boolean") return <label key={k} className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={name} defaultChecked={!!v} /> {label}</label>;
        if (Array.isArray(def)) return <Field key={k} label={label} name={name} as="textarea" rows={3} defaultValue={(v as string[]).join("\n")} required={false} hint={hint} />;
        if (k === "rewards.training_trigger")
          return <Field key={k} label={label} name={name} as="select" defaultValue={v as string} hint={hint}><option value="first_installment">Première tranche validée</option><option value="full_payment">Paiement intégral</option></Field>;
        if (k === "rewards.clawback_policy")
          return <Field key={k} label={label} name={name} as="select" defaultValue={v as string} hint={hint}><option value="reclaim_available">Reprise sur solde disponible</option><option value="manual_review">Revue manuelle</option></Field>;
        if (typeof def === "number") return <Field key={k} label={label} name={name} type="number" defaultValue={v as number} hint={hint} />;
        return <Field key={k} label={label} name={name} defaultValue={v as string} required={false} hint={hint} />;
      })}
    </div>
  );
}
