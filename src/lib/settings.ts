import { db } from "@/db";
import { adminAuditLogs, systemSettings, systemSettingsHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SETTING_DEFAULTS = {
  "rewards.enabled": true,
  "rewards.signup_bonus": 500,
  "rewards.training_bonus": 5000,
  "rewards.training_trigger": "first_installment", // first_installment | full_payment
  "rewards.training_once_per_referee": true,
  "rewards.clawback_policy": "reclaim_available", // reclaim_available | manual_review
  "rewards.max_signups_per_ip_per_day": 3,
  "withdrawal.min": 5000,
  "withdrawal.fee": 0,
  "withdrawal.max_per_request": 0,
  "withdrawal.max_per_month": 0,
  "withdrawal.operators": ["MTN Mobile Money", "Orange Money"],
  "pricing.multi_rule": "undefined", // undefined | sum_all | enrollment_once
  "contact.phones": ["+237 674 497 946", "+237 695 227 101"],
  "contact.whatsapp_url": "https://wa.me/237674407046",
  "contact.whatsapp_message":
    "Bonjour Herman FASHION, je souhaite obtenir des renseignements sur vos formations et les modalités d'inscription.",
  "contact.email": "",
  "contact.facebook": "https://www.facebook.com/share/1EGFz2juN3/?mibextid=wwXIfr",
  "contact.tiktok": "https://www.tiktok.com/@herman.fashion97?_r=1&_t=ZS-9BPLcS63WFh",
  "institution.arrete": "ARRÊTÉ/ORDRE N°000651/MINEFOP/SG/DFOP/SDGSF/CSACD/CBAC",
  "institution.legal_notes": "",
  "payments.chariow_url": "https://dycwotra.mychariow.shop/prd_2iywa1pa",
  "ai.enabled": true,
  "ai.handoff_text": "Pour un échange avec un conseiller humain, contactez-nous par téléphone ou WhatsApp.",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = { [K in SettingKey]: (typeof SETTING_DEFAULTS)[K] extends boolean ? boolean : (typeof SETTING_DEFAULTS)[K] extends number ? number : (typeof SETTING_DEFAULTS)[K] extends string ? string : (typeof SETTING_DEFAULTS)[K] extends readonly unknown[] ? string[] : never };

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(systemSettings);
  const out: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in SETTING_DEFAULTS) out[r.key] = r.value;
  return out as unknown as Settings;
}

export async function setSetting(key: SettingKey, value: unknown, actorId: string | null) {
  const [old] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
  const oldValue = old?.value ?? SETTING_DEFAULTS[key];
  if (JSON.stringify(oldValue) === JSON.stringify(value)) return;
  await db
    .insert(systemSettings)
    .values({ key, value, updatedBy: actorId })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
  await db.insert(systemSettingsHistory).values({ key, oldValue, newValue: value, actorId });
  await db.insert(adminAuditLogs).values({ actorId, action: "setting.update", entity: "system_settings", entityId: key, before: { value: oldValue }, after: { value } });
}
