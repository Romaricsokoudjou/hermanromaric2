"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  contactMessages,
  fraudAlerts,
  notifications,
  orders,
  payments,
  referralAttributions,
  referralCampaigns,
  referralCodes,
  sessions,
  trainingDurations,
  trainingPrices,
  trainingPrograms,
  userProfiles,
  users,
} from "@/db/schema";
import { audit, confirmActorPassword, hashPassword, requirePermission } from "@/lib/auth";
import { safe, bool, num, str } from "@/lib/action";
import { ENTITIES } from "@/lib/entities";
import { slugify, normalizePhone, isValidPhone } from "@/lib/format";
import { notify } from "@/lib/notify";
import { recordPayment, refundPayment, verifyPendingPayment } from "@/lib/payments";
import { adminAdjust, cancelHold, releaseHold, transitionWithdrawal } from "@/lib/rewards";
import { SETTING_DEFAULTS, setSetting, type SettingKey } from "@/lib/settings";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/permissions";
import { DURATIONS } from "@/lib/seed-data";
import type { FormState } from "@/components/ActionForm";

const done = (path: string) => revalidatePath(path, "layout");

/* ───────────── Utilisateurs ───────────── */
export async function setUserStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("users.manage");
    const id = str(fd, "userId");
    const status = str(fd, "status");
    if (!["active", "suspended", "blocked"].includes(status)) throw new Error("Statut invalide.");
    if (id === me.id) throw new Error("Vous ne pouvez pas modifier votre propre statut.");
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) throw new Error("Utilisateur introuvable.");
    if (target.role === "super_admin" && me.role !== "super_admin") throw new Error("Action réservée au super administrateur.");
    await db.update(users).set({ status }).where(eq(users.id, id));
    if (status !== "active") await db.delete(sessions).where(eq(sessions.userId, id));
    await audit(me.id, "user.status", "users", id, { status: target.status }, { status, reason: str(fd, "reason") });
    done("/admin");
    return "Statut mis à jour.";
  });
}

/* ───────────── Inscriptions ───────────── */
export async function approveApplicationAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("applications.manage");
    const id = str(fd, "applicationId");
    const total = num(fd, "approvedTotal");
    if (total <= 0) throw new Error("Montant final invalide.");
    const [a] = await db.select().from(applications).where(eq(applications.id, id));
    if (!a || a.status !== "needs_review") throw new Error("Cette candidature n'est pas en attente de validation.");
    await db.update(applications).set({ status: "pending_payment", approvedTotal: total, updatedAt: new Date() }).where(eq(applications.id, id));
    await audit(me.id, "application.approve", "applications", id, { indicative: a.indicativeTotal }, { approvedTotal: total, note: str(fd, "note") });
    await notify({ userId: a.userId, type: "application_approved", title: "Votre inscription est validée", body: `Le montant final de votre inscription est arrêté. Vous pouvez procéder au paiement.`, dedupeKey: `app_approved:${id}` });
    done("/admin");
    return "Candidature validée.";
  });
}

export async function cancelApplicationAdminAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("applications.manage");
    const id = str(fd, "applicationId");
    const [a] = await db.select().from(applications).where(eq(applications.id, id));
    if (!a) throw new Error("Introuvable.");
    const [o] = await db.select().from(orders).where(eq(orders.applicationId, id));
    if (o && o.paidAmount > 0) throw new Error("Des paiements confirmés existent : utilisez la procédure de remboursement.");
    await db.update(applications).set({ status: "cancelled", updatedAt: new Date() }).where(eq(applications.id, id));
    await audit(me.id, "application.cancel", "applications", id, { status: a.status }, { status: "cancelled" });
    done("/admin");
    return "Candidature annulée.";
  });
}

/* ───────────── Formations & tarifs ───────────── */
const lines = (fd: FormData, k: string) => String(fd.get(k) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

export async function saveProgramAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("catalog.manage");
    const id = str(fd, "id");
    const title = str(fd, "title");
    if (!title) throw new Error("Titre requis.");
    const values = {
      title,
      slug: slugify(str(fd, "slug") || title),
      shortDescription: str(fd, "shortDescription"),
      description: str(fd, "description"),
      objectives: lines(fd, "objectives"),
      skills: lines(fd, "skills"),
      programs: lines(fd, "programs"),
      careers: lines(fd, "careers"),
      imageUrl: str(fd, "imageUrl") || null,
      isActive: bool(fd, "isActive"),
      sortOrder: num(fd, "sortOrder"),
    };
    if (id) {
      await db.update(trainingPrograms).set(values).where(eq(trainingPrograms.id, id));
      await audit(me.id, "program.update", "training_programs", id, null, values);
    } else {
      const [p] = await db.insert(trainingPrograms).values(values).returning();
      await audit(me.id, "program.create", "training_programs", p.id, null, values);
    }
    done("/");
    return "Formation enregistrée.";
  });
}

export async function savePriceAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("pricing.manage");
    const durationId = str(fd, "durationId");
    const installments = str(fd, "installments").split(/[,+;\s]+/).filter(Boolean).map(Number);
    if (installments.some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Tranches invalides (ex. 100000, 30000, 20000).");
    const tuitionFee = num(fd, "tuitionFee");
    const enrollmentFee = num(fd, "enrollmentFee");
    if (tuitionFee < 0 || enrollmentFee < 0) throw new Error("Montants invalides.");
    const [old] = await db.select().from(trainingPrices).where(eq(trainingPrices.durationId, durationId));
    await db
      .insert(trainingPrices)
      .values({ durationId, tuitionFee, enrollmentFee, installments })
      .onConflictDoUpdate({ target: trainingPrices.durationId, set: { tuitionFee, enrollmentFee, installments, updatedAt: new Date() } });
    await db.update(trainingDurations).set({ isActive: bool(fd, "isActive") }).where(eq(trainingDurations.id, durationId));
    await audit(me.id, "price.update", "training_prices", durationId, old ?? null, { tuitionFee, enrollmentFee, installments, isActive: bool(fd, "isActive") });
    done("/");
    return "Tarif enregistré (les candidatures existantes conservent leurs montants).";
  });
}

export async function addDurationAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("pricing.manage");
    const programId = str(fd, "programId");
    const d = DURATIONS.find((x) => x.key === str(fd, "key"));
    if (!d) throw new Error("Durée invalide.");
    const [exists] = await db.select().from(trainingDurations).where(and(eq(trainingDurations.programId, programId), eq(trainingDurations.key, d.key)));
    if (exists) throw new Error("Cette durée existe déjà pour cette formation.");
    const [dur] = await db.insert(trainingDurations).values({ programId, key: d.key, label: d.label, months: d.months, diploma: d.diploma, isActive: false }).returning();
    await db.insert(trainingPrices).values({ durationId: dur.id, tuitionFee: d.tuition, enrollmentFee: d.enrollment, installments: d.installments });
    await audit(me.id, "duration.add", "training_durations", dur.id);
    done("/");
    return "Durée ajoutée (inactive : activez-la après vérification du tarif).";
  });
}

export async function setPricingRuleAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("pricing.manage");
    const v = str(fd, "rule");
    if (!["undefined", "sum_all", "enrollment_once"].includes(v)) throw new Error("Règle invalide.");
    await setSetting("pricing.multi_rule", v, me.id);
    done("/");
    return "Règle de cumul enregistrée.";
  });
}

/* ───────────── Contenus génériques ───────────── */
export async function saveEntityAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const type = str(fd, "__type");
    const cfg = ENTITIES[type];
    if (!cfg) throw new Error("Type inconnu.");
    const me = await requirePermission(cfg.perm);
    const values: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      if (f.kind === "bool") values[f.name] = bool(fd, f.name);
      else if (f.kind === "number") values[f.name] = num(fd, f.name);
      else {
        const v = str(fd, f.name);
        if (!v && f.required) throw new Error(`« ${f.label} » est obligatoire.`);
        values[f.name] = v || (f.required ? "" : null);
      }
    }
    const id = str(fd, "__id");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = cfg.table as any;
    if (type === "actualites") values.slug = id ? undefined : `${slugify(String(values.title))}-${Date.now().toString(36)}`;
    if (type === "centres" && !id) values.slug = `${slugify(String(values.name))}-${Date.now().toString(36)}`;
    if (type === "base-connaissances" || type === "textes") values.updatedAt = new Date();
    if (type === "actualites" && values.isPublished && !id) values.publishedAt = new Date();
    if (cfg.idField === "key") {
      const key = id || str(fd, "key");
      if (!/^[a-z0-9._-]{2,80}$/.test(key)) throw new Error("Clé invalide (minuscules, chiffres, . _ -).");
      await db.insert(table).values({ key, ...values }).onConflictDoUpdate({ target: table.key, set: values });
      await audit(me.id, `${type}.save`, cfg.label, key);
    } else if (id) {
      await db.update(table).set(values).where(eq(table.id, id));
      await audit(me.id, `${type}.update`, cfg.label, id);
    } else {
      const res = (await db.insert(table).values(values).returning()) as { id?: string }[];
      await audit(me.id, `${type}.create`, cfg.label, res[0]?.id);
    }
    done("/");
    return "Enregistré.";
  });
}

export async function deleteEntityAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const type = str(fd, "__type");
    const cfg = ENTITIES[type];
    if (!cfg || cfg.noDelete) throw new Error("Suppression impossible.");
    const me = await requirePermission(cfg.perm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = cfg.table as any;
    if (type === "centres") {
      const used = await db.select({ id: applications.id }).from(applications).where(eq(applications.centerId, str(fd, "__id"))).limit(1);
      if (used.length) throw new Error("Ce centre est utilisé par des inscriptions : désactivez-le plutôt.");
    }
    await db.delete(table).where(eq(table.id, str(fd, "__id")));
    await audit(me.id, `${type}.delete`, cfg.label, str(fd, "__id"));
    done("/");
    return "Supprimé.";
  });
}

/* ───────────── Paiements ───────────── */
export async function manualPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("payments.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const ref = str(fd, "reference").toUpperCase();
    const txId = str(fd, "transactionId");
    const amount = num(fd, "amount");
    if (txId.length < 4) throw new Error("L'identifiant de transaction du prestataire est obligatoire (preuve).");
    if (amount <= 0) throw new Error("Montant invalide.");
    const [o] = await db.select().from(orders).where(eq(orders.reference, ref));
    if (!o) throw new Error("Commande introuvable.");
    const r = await recordPayment({ orderId: o.id, provider: str(fd, "provider") || "chariow", providerTransactionId: txId, amount, status: "confirmed", source: "manual", verifiedBy: me.id, note: str(fd, "note") });
    await audit(me.id, "payment.manual", "payments", o.id, null, { txId, amount });
    if (r === "duplicate") throw new Error("Cette transaction est déjà enregistrée (doublon évité).");
    done("/admin");
    return "Paiement enregistré, reçu généré.";
  });
}

export async function verifyPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("payments.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    await verifyPendingPayment(str(fd, "paymentId"), num(fd, "amount"), me.id);
    await audit(me.id, "payment.verify", "payments", str(fd, "paymentId"), null, { amount: num(fd, "amount") });
    done("/admin");
    return "Paiement confirmé.";
  });
}

export async function refundPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("payments.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    await refundPayment(str(fd, "paymentId"), me.id);
    await audit(me.id, "payment.refund", "payments", str(fd, "paymentId"), null, { note: str(fd, "note") });
    done("/admin");
    return "Paiement marqué comme remboursé (politique de reprise appliquée).";
  });
}

/* ───────────── Portefeuilles & parrainage ───────────── */
export async function adjustWalletAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("wallets.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const bucket = str(fd, "bucket") === "pending" ? "pending" : "available";
    await adminAdjust({ userId: str(fd, "userId"), bucket, amount: num(fd, "amount"), note: str(fd, "note"), actorId: me.id });
    await audit(me.id, "wallet.adjust", "reward_wallets", str(fd, "userId"), null, { bucket, amount: num(fd, "amount"), note: str(fd, "note") });
    done("/admin");
    return "Ajustement enregistré dans le journal financier.";
  });
}

const BOOL_KEYS = ["rewards.enabled", "rewards.training_once_per_referee", "ai.enabled"];

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const group = str(fd, "__group");
    const keys = (Object.keys(SETTING_DEFAULTS) as SettingKey[]).filter((k) => k.startsWith(group + "."));
    if (!keys.length) throw new Error("Groupe inconnu.");
    const me = await requirePermission(group === "rewards" || group === "withdrawal" ? "rewards.manage" : group === "ai" ? "ai.manage" : "settings.manage");
    if (group === "rewards" || group === "withdrawal") await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    for (const k of keys) {
      if (!fd.has(`f:${k}`) && !BOOL_KEYS.includes(k)) continue;
      const def = SETTING_DEFAULTS[k] as unknown;
      let v: unknown;
      if (typeof def === "boolean") v = fd.get(`f:${k}`) === "on";
      else if (typeof def === "number") {
        v = num(fd, `f:${k}`);
        if ((v as number) < 0) throw new Error("Les montants ne peuvent pas être négatifs.");
      } else if (Array.isArray(def)) v = str(fd, `f:${k}`).split("\n").map((l) => l.trim()).filter(Boolean);
      else v = str(fd, `f:${k}`);
      if (k === "rewards.training_trigger" && !["first_installment", "full_payment"].includes(v as string)) throw new Error("Déclencheur invalide.");
      if (k === "rewards.clawback_policy" && !["reclaim_available", "manual_review"].includes(v as string)) throw new Error("Politique invalide.");
      await setSetting(k, v, me.id);
    }
    done("/");
    return "Paramètres enregistrés et historisés (aucun effet rétroactif sur les récompenses déjà acquises).";
  });
}

export async function saveCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("rewards.manage");
    const id = str(fd, "id");
    const v = {
      name: str(fd, "name") || "Campagne",
      budget: num(fd, "budget"),
      perReferrerCap: num(fd, "perReferrerCap"),
      startsAt: str(fd, "startsAt") ? new Date(str(fd, "startsAt")) : null,
      endsAt: str(fd, "endsAt") ? new Date(str(fd, "endsAt")) : null,
      isActive: bool(fd, "isActive"),
    };
    if (id) await db.update(referralCampaigns).set(v).where(eq(referralCampaigns.id, id));
    else await db.insert(referralCampaigns).values(v);
    await audit(me.id, "campaign.save", "referral_campaigns", id || undefined, null, v);
    done("/admin");
    return "Campagne enregistrée.";
  });
}

export async function holdDecisionAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("rewards.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const decision = str(fd, "decision");
    if (decision === "release") await releaseHold(str(fd, "holdId"), me.id, str(fd, "note") || "Vérification administrative");
    else await cancelHold(str(fd, "holdId"), me.id, str(fd, "note") || "Rejetée après vérification");
    await audit(me.id, `hold.${decision}`, "reward_holds", str(fd, "holdId"));
    done("/admin");
    return decision === "release" ? "Récompense libérée." : "Récompense annulée.";
  });
}

export async function fraudDecisionAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("rewards.manage");
    const id = str(fd, "alertId");
    const decision = str(fd, "decision") === "confirm" ? "confirmed" : "dismissed";
    const [a] = await db.select().from(fraudAlerts).where(eq(fraudAlerts.id, id));
    if (!a) throw new Error("Alerte introuvable.");
    await db.update(fraudAlerts).set({ status: decision, resolvedBy: me.id }).where(eq(fraudAlerts.id, id));
    if (decision === "confirmed" && bool(fd, "suspend")) {
      const target = a.relatedUserId ?? a.userId;
      if (target) {
        const [t] = await db.select().from(users).where(eq(users.id, target));
        if (t && !["super_admin", "admin"].includes(t.role)) {
          await db.update(users).set({ status: "suspended" }).where(eq(users.id, target));
          await db.delete(sessions).where(eq(sessions.userId, target));
          await db.update(referralAttributions).set({ status: "rejected" }).where(eq(referralAttributions.referredUserId, target));
        }
      }
    }
    await audit(me.id, `fraud.${decision}`, "fraud_alerts", id, { status: a.status }, { status: decision });
    done("/admin");
    return decision === "confirmed" ? "Fraude confirmée." : "Alerte classée.";
  });
}

export async function correctAttributionAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("rewards.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const note = str(fd, "note");
    if (note.length < 15) throw new Error("Justification documentée requise (15 caractères minimum).");
    const [referred] = await db.select().from(users).where(or(eq(users.email, str(fd, "referred").toLowerCase()), eq(users.phone, normalizePhone(str(fd, "referred")))));
    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.code, str(fd, "code").toUpperCase()));
    if (!referred || !code) throw new Error("Filleul ou code introuvable.");
    if (code.userId === referred.id) throw new Error("Auto-parrainage interdit.");
    const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, referred.id));
    if (!att) throw new Error("Ce filleul n'a pas d'attribution : aucune création manuelle.");
    await db.update(referralAttributions).set({ referrerId: code.userId, code: code.code, lockedAt: new Date() }).where(eq(referralAttributions.id, att.id));
    await audit(me.id, "attribution.correct", "referral_attributions", att.id, { referrerId: att.referrerId, code: att.code }, { referrerId: code.userId, code: code.code, note });
    done("/admin");
    return "Attribution corrigée et tracée (les récompenses déjà créditées ne sont pas déplacées automatiquement).";
  });
}

export async function withdrawalAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("withdrawals.manage");
    const to = str(fd, "to");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    await transitionWithdrawal(str(fd, "id"), me.id, to, { proof: str(fd, "proof"), reason: str(fd, "reason") });
    await audit(me.id, `withdrawal.${to}`, "withdrawal_requests", str(fd, "id"), null, { proof: str(fd, "proof"), reason: str(fd, "reason") });
    done("/admin");
    return "Statut du retrait mis à jour.";
  });
}

/* ───────────── Notifications ───────────── */
export async function markContactHandledAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    await requirePermission("notifications.manage");
    await db.update(contactMessages).set({ handled: true }).where(eq(contactMessages.id, str(fd, "id")));
    done("/admin");
  });
}

export async function broadcastAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("notifications.manage");
    const title = str(fd, "title");
    const body = str(fd, "body");
    if (title.length < 3 || body.length < 5) throw new Error("Titre et message requis.");
    const target = str(fd, "target").toLowerCase();
    let ids: string[];
    if (target) {
      const r = await db.select({ id: users.id }).from(users).where(or(eq(users.email, target), eq(users.phone, normalizePhone(target))));
      if (!r.length) throw new Error("Utilisateur introuvable.");
      ids = r.map((x) => x.id);
    } else {
      ids = (await db.select({ id: users.id }).from(users).where(and(eq(users.role, "learner"), eq(users.status, "active")))).map((x) => x.id);
    }
    const stamp = Date.now();
    for (let i = 0; i < ids.length; i += 200)
      await db.insert(notifications).values(ids.slice(i, i + 200).map((userId) => ({ userId, type: "announcement", title, body, dedupeKey: `broadcast:${stamp}:${userId}` }))).onConflictDoNothing();
    await audit(me.id, "notification.broadcast", "notifications", undefined, null, { title, recipients: ids.length });
    return `Notification envoyée à ${ids.length} utilisateur(s).`;
  });
}

/* ───────────── Administrateurs ───────────── */
export async function createStaffAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("admins.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const role = str(fd, "role");
    if (!(STAFF_ROLES as readonly string[]).includes(role)) throw new Error("Rôle invalide.");
    const email = str(fd, "email").toLowerCase();
    const phone = normalizePhone(str(fd, "phone"));
    const pw = String(fd.get("password") ?? "");
    if (!isValidPhone(phone) || !email.includes("@")) throw new Error("E-mail ou téléphone invalide.");
    if (pw.length < 10) throw new Error("Mot de passe temporaire de 10 caractères minimum.");
    const dup = await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), eq(users.phone, phone)));
    if (dup.length) throw new Error("E-mail ou téléphone déjà utilisé.");
    const [u] = await db.insert(users).values({ email, phone, passwordHash: await hashPassword(pw), role, emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() }).returning();
    await db.insert(userProfiles).values({ userId: u.id, firstName: str(fd, "firstName") || "Équipe", lastName: str(fd, "lastName") || "Herman", country: "Cameroun", city: "Douala" });
    await audit(me.id, "staff.create", "users", u.id, null, { role, email });
    done("/admin");
    return `Compte « ${ROLE_LABELS[role]} » créé.`;
  });
}

export async function setRoleAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const me = await requirePermission("admins.manage");
    await confirmActorPassword(me.id, str(fd, "confirmPassword"));
    const role = str(fd, "role");
    const id = str(fd, "userId");
    if (![...STAFF_ROLES, "learner"].includes(role as never)) throw new Error("Rôle invalide.");
    if (id === me.id) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    const [t] = await db.select().from(users).where(eq(users.id, id));
    if (!t) throw new Error("Utilisateur introuvable.");
    if (t.role === "super_admin") {
      const [c] = await db.select({ n: sql<number>`count(*)` }).from(users).where(eq(users.role, "super_admin"));
      if (Number(c.n) <= 1) throw new Error("Impossible de retirer le dernier super administrateur.");
    }
    await db.update(users).set({ role }).where(eq(users.id, id));
    await db.delete(sessions).where(and(eq(sessions.userId, id), inArray(sessions.userId, [id])));
    await audit(me.id, "role.change", "users", id, { role: t.role }, { role });
    done("/admin");
    return "Rôle modifié (l'utilisateur doit se reconnecter).";
  });
}

